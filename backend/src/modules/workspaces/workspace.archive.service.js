import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Channel } from '../chat/Channel.js'
import { Message } from '../chat/Message.js'
import { Document } from '../documents/Document.js'
import { Evaluation } from '../evaluations/Evaluation.js'
import { Notification } from '../notifications/Notification.js'
import { Poll } from '../polls/Poll.js'
import { Task } from '../tasks/Task.js'
import { Workspace } from './Workspace.js'
import { WorkspaceInvitation } from './WorkspaceInvitation.js'
import { WorkspaceMember } from './WorkspaceMember.js'

const uploadsDirectory = fileURLToPath(new URL('../../../uploads/', import.meta.url))

function unavailable(message = 'Deleted Space data is no longer available') {
  const error = new Error(message)
  error.statusCode = 410
  return error
}

function notFound() {
  const error = new Error('Deleted Space not found')
  error.statusCode = 404
  return error
}

function archivedDocumentMetadata(document) {
  return {
    _id: document._id,
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    isLink: document.isLink,
    downloadAvailable: !document.isLink,
    expiresAt: document.expiresAt,
    createdAt: document.createdAt,
    uploadedBy: document.uploadedBy,
  }
}

async function getAuthorizedDeletedWorkspace(workspaceId, userId, now = new Date()) {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    status: 'DELETED',
    deletedAt: { $ne: null },
    purgeAt: { $gt: now },
    deletedMemberIds: userId,
  }).select('name description type deletedAt purgeAt')
  if (workspace) return workspace

  const existing = await Workspace.findOne({ _id: workspaceId, deletedAt: { $ne: null } }).select('purgeAt')
  if (existing && existing.purgeAt && existing.purgeAt <= now) throw unavailable()
  throw notFound()
}

export async function listDeletedWorkspaces(userId, now = new Date()) {
  return Workspace.find({
    status: 'DELETED',
    deletedAt: { $ne: null },
    purgeAt: { $gt: now },
    deletedMemberIds: userId,
  })
    .select('name description type deletedAt purgeAt')
    .sort({ deletedAt: -1 })
    .lean()
}

export async function listDeletedWorkspaceDocuments(workspaceId, userId, now = new Date()) {
  const workspace = await getAuthorizedDeletedWorkspace(workspaceId, userId, now)
  const documents = await Document.find({
    workspaceId,
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  })
    .populate('uploadedBy', 'name email avatar')
    .sort({ createdAt: -1 })
    .lean()

  return {
    workspace: {
      _id: workspace._id,
      name: workspace.name,
      description: workspace.description,
      type: workspace.type,
      deletedAt: workspace.deletedAt,
      purgeAt: workspace.purgeAt,
    },
    documents: documents.map(archivedDocumentMetadata),
  }
}

export async function getDeletedWorkspaceDocument(workspaceId, documentId, userId, now = new Date()) {
  await getAuthorizedDeletedWorkspace(workspaceId, userId, now)
  const document = await Document.findOne({
    _id: documentId,
    workspaceId,
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  })
  if (!document) throw notFound()
  if (document.isLink) {
    const error = new Error('External links cannot be downloaded from the deleted Space archive')
    error.statusCode = 400
    throw error
  }
  return document
}

export async function notifyDeletedWorkspaceMembers(workspace, now = new Date()) {
  const purgeAt = workspace.purgeAt || new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  const reminderKey = `workspace-deleted:${workspace._id}`
  const message = `Space ${workspace.name} was deleted by its owner. You can access the Deleted Spaces area to view and download permitted documents until ${purgeAt.toISOString()}. Data will be permanently deleted after that time.`

  for (const userId of workspace.deletedMemberIds || []) {
    try {
      await Notification.findOneAndUpdate(
        { userId, taskId: null, reminderKey },
        {
          $setOnInsert: {
            workspaceId: workspace._id,
            taskId: null,
            type: 'WORKSPACE_DELETED',
            reminderKey,
            title: `Space ${workspace.name} was deleted`,
            message,
          },
        },
        { upsert: true, new: true },
      )
    } catch (error) {
      if (error.code === 11000) continue
      throw error
    }
  }
  await Workspace.updateOne(
    { _id: workspace._id, status: 'DELETED', deletionNoticesSentAt: null },
    { $set: { deletionNoticesSentAt: now } },
  )
}

async function backfillLegacyDeletedWorkspaces(now) {
  const legacySpaces = await Workspace.find({
    deletedAt: { $ne: null },
    status: { $in: ['ACTIVE', null] },
    purgeAt: null,
  }).select('_id deletedAt')

  for (const workspace of legacySpaces) {
    const memberships = await WorkspaceMember.find({ workspaceId: workspace._id }).select('userId')
    const deletedMemberIds = [...new Map(memberships.map(({ userId }) => [String(userId), userId])).values()]
    const purgeAt = new Date(new Date(workspace.deletedAt).getTime() + 5 * 24 * 60 * 60 * 1000)
    await Workspace.updateOne(
      {
        _id: workspace._id,
        deletedAt: workspace.deletedAt,
        status: { $in: ['ACTIVE', null] },
        purgeAt: null,
      },
      {
        $set: {
          status: 'DELETED',
          purgeAt,
          deletedMemberIds,
          ...(purgeAt <= now ? { deletionNoticesSentAt: now } : {}),
        },
      },
    )
  }
}

function storedUploadPath(fileUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) return null
  const filePath = path.resolve(uploadsDirectory, path.basename(fileUrl))
  return filePath.startsWith(`${path.resolve(uploadsDirectory)}${path.sep}`) ? filePath : null
}

async function fileIsUsedOutsideWorkspace(fileUrl, workspaceId) {
  const names = [...new Set([fileUrl, path.basename(fileUrl)])]
  const [document, task, message] = await Promise.all([
    Document.exists({ workspaceId: { $ne: workspaceId }, fileUrl }),
    Task.exists({ workspaceId: { $ne: workspaceId }, attachments: { $in: names } }),
    Message.exists({ workspaceId: { $ne: workspaceId }, attachments: { $in: names } }),
  ])
  return Boolean(document || task || message)
}

async function purgeWorkspaceData(workspaceId) {
  const documents = await Document.find({ workspaceId }).select('fileUrl isLink').lean()

  await Message.deleteMany({ workspaceId })
  await Task.deleteMany({ workspaceId })
  await Poll.deleteMany({ workspaceId })
  await Evaluation.deleteMany({ workspaceId })
  await WorkspaceInvitation.deleteMany({ workspaceId })
  await Notification.deleteMany({ workspaceId })
  await Channel.deleteMany({ workspaceId })

  for (const document of documents) {
    if (document.isLink) continue
    const filePath = storedUploadPath(document.fileUrl)
    if (!filePath || await fileIsUsedOutsideWorkspace(document.fileUrl, workspaceId)) continue
    try {
      await unlink(filePath)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  await Document.deleteMany({ workspaceId })
  await WorkspaceMember.deleteMany({ workspaceId })
  await Workspace.deleteOne({ _id: workspaceId, status: 'PURGING' })
}

export async function runDeletedWorkspaceRetentionJobs(now = new Date()) {
  try {
    await backfillLegacyDeletedWorkspaces(now)
  } catch (error) {
    console.error('Unable to backfill legacy deleted Spaces', {
      errorName: error.name,
      errorMessage: error.message,
    })
  }

  const dueForNotice = await Workspace.find({
    status: 'DELETED',
    purgeAt: { $gt: now },
    deletionNoticesSentAt: null,
  }).select('name _id purgeAt deletedMemberIds')

  for (const workspace of dueForNotice) {
    try {
      await notifyDeletedWorkspaceMembers(workspace, now)
    } catch (error) {
      console.error('Unable to deliver deleted Space notifications', {
        workspaceId: String(workspace._id),
        errorName: error.name,
        errorMessage: error.message,
      })
    }
  }

  const dueForPurge = await Workspace.find({
    status: { $in: ['DELETED', 'PURGING'] },
    purgeAt: { $lte: now, $ne: null },
  }).select('_id')

  for (const { _id: workspaceId } of dueForPurge) {
    try {
      await Workspace.updateOne(
        { _id: workspaceId, status: 'DELETED', purgeAt: { $lte: now } },
        { $set: { status: 'PURGING' } },
      )
      await purgeWorkspaceData(workspaceId)
    } catch (error) {
      console.error('Unable to permanently purge deleted Space', {
        workspaceId: String(workspaceId),
        errorName: error.name,
        errorMessage: error.message,
      })
    }
  }
}
