import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document } from './Document.js'
import { getUserPlan, PLAN_LIMITS } from '../plans/plan.service.js'

function documentError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function canManageDocument(document, userId, member) {
  return document.uploadedBy.equals(userId) || ['OWNER', 'LEADER'].includes(member?.role)
}

function storedFilePath(fileUrl) {
  return fileURLToPath(new URL(`../../../uploads/${path.basename(fileUrl)}`, import.meta.url))
}

export async function removeStoredDocuments(documents) {
  for (const document of documents) {
    if (document.isLink) continue
    try {
      await unlink(storedFilePath(document.fileUrl))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      const cleanupError = documentError(`Unable to remove stored document ${document.fileUrl}`, 500)
      cleanupError.code = 'DOCUMENT_CLEANUP_FAILED'
      cleanupError.cause = error
      throw cleanupError
    }
  }
}

export async function createDocument(workspaceId, userId, file) {
  if (!file) throw documentError('A file is required', 400)
  try {
    const plan = await getUserPlan(userId)
    return await Document.create({
      workspaceId,
      uploadedBy: userId,
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`,
      fileType: file.mimetype,
      fileSize: file.size,
      expiresAt: new Date(Date.now() + PLAN_LIMITS[plan].documentRetentionDays * 24 * 60 * 60 * 1000),
    })
  } catch (error) {
    await unlink(file.path).catch(() => {})
    throw error
  }
}

export async function createLinkDocument(workspaceId, userId, payload) {
  if (!payload.fileName?.trim()) throw documentError('Link title is required', 400)
  if (!payload.fileUrl?.trim()) throw documentError('Valid URL is required', 400)
  let url = payload.fileUrl.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  const plan = await getUserPlan(userId)
  return await Document.create({
    workspaceId,
    uploadedBy: userId,
    fileName: payload.fileName.trim(),
    fileUrl: url,
    fileType: 'link',
    fileSize: 0,
    isLink: true,
    expiresAt: new Date(Date.now() + PLAN_LIMITS[plan].documentRetentionDays * 24 * 60 * 60 * 1000),
  })
}

export async function listDocuments(workspaceId) {
  return Document.find({ workspaceId, $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: null }] })
    .populate('uploadedBy', 'name email avatar')
    .sort({ createdAt: -1 })
}

export async function getDocument(document) {
  return document.populate('uploadedBy', 'name email avatar')
}

export async function deleteDocument(document, userId, member) {
  if (!canManageDocument(document, userId, member)) throw documentError('Only the uploader or workspace leader can delete this document', 403)
  await Document.deleteOne({ _id: document._id })
  if (!document.isLink) {
    try {
      await unlink(storedFilePath(document.fileUrl))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}
