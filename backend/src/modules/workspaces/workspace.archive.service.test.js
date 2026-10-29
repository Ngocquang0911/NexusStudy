import assert from 'node:assert/strict'
import { access, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
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
import {
  getDeletedWorkspaceDocument,
  listDeletedWorkspaceDocuments,
  listDeletedWorkspaces,
  notifyDeletedWorkspaceMembers,
  runDeletedWorkspaceRetentionJobs,
} from './workspace.archive.service.js'

const testNow = new Date('2026-10-25T00:00:00.000Z')
const purgeAt = new Date(testNow.getTime() + 5 * 24 * 60 * 60 * 1000)

function mockWorkspaceRetentionQuery(result) {
  return {
    select() { return this },
    limit() { return this },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
  }
}

function archivedWorkspace(userId = 'member-a') {
  return {
    _id: 'workspace-a',
    name: 'Java study',
    type: 'COURSE',
    deletedAt: testNow,
    purgeAt,
    deletedMemberIds: [userId],
  }
}

test('deleted Space visibility is restricted to the snapshot of official members', async (context) => {
  let filter
  context.mock.method(Workspace, 'find', (query) => {
    filter = query
    return {
      select() { return this },
      sort() { return this },
      lean: async () => [{ _id: 'workspace-a', name: 'Java study', deletedAt: testNow, purgeAt }],
    }
  })

  await listDeletedWorkspaces('member-a', testNow)
  assert.deepEqual(filter, {
    status: 'DELETED',
    deletedAt: { $ne: null },
    purgeAt: { $gt: testNow },
    deletedMemberIds: 'member-a',
  })
})

test('official members can view only unexpired documents from the permitted deleted Space', async (context) => {
  const workspace = archivedWorkspace()
  const file = {
    _id: 'document-a',
    workspaceId: 'workspace-a',
    fileName: 'notes.pdf',
    fileType: 'application/pdf',
    fileSize: 25,
    isLink: false,
    expiresAt: purgeAt,
    createdAt: testNow,
    uploadedBy: { name: 'Member' },
  }
  let documentFilter
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => workspace }))
  context.mock.method(Document, 'find', (filter) => {
    documentFilter = filter
    return {
      populate() { return this },
      sort() { return this },
      lean: async () => [file],
    }
  })

  const result = await listDeletedWorkspaceDocuments('workspace-a', 'member-a', testNow)

  assert.equal(documentFilter.workspaceId, 'workspace-a')
  assert.equal(documentFilter.$or[0].expiresAt.$gt, testNow)
  assert.equal(result.workspace.purgeAt, purgeAt)
  assert.deepEqual(result.documents.map(({ _id, downloadAvailable }) => ({ _id, downloadAvailable })), [
    { _id: 'document-a', downloadAvailable: true },
  ])
})

test('a member can download an eligible archive document but cannot substitute another document id', async (context) => {
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => archivedWorkspace() }))
  let filter
  context.mock.method(Document, 'findOne', (query) => {
    filter = query
    return null
  })

  await assert.rejects(getDeletedWorkspaceDocument('workspace-a', 'document-from-space-b', 'member-a', testNow), {
    message: 'Deleted Space not found',
    statusCode: 404,
  })
  assert.equal(filter.workspaceId, 'workspace-a')
  assert.equal(filter._id, 'document-from-space-b')
})

test('a snapshotted Owner is also allowed to download an eligible document', async (context) => {
  const document = { _id: 'document-a', workspaceId: 'workspace-a', isLink: false }
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => archivedWorkspace('owner-a') }))
  context.mock.method(Document, 'findOne', () => document)

  assert.equal(await getDeletedWorkspaceDocument('workspace-a', 'document-a', 'owner-a', testNow), document)
})

test('external links are not presented as protected file downloads', async (context) => {
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => archivedWorkspace() }))
  context.mock.method(Document, 'findOne', () => ({ isLink: true }))

  await assert.rejects(getDeletedWorkspaceDocument('workspace-a', 'external-link', 'member-a', testNow), {
    message: 'External links cannot be downloaded from the deleted Space archive',
    statusCode: 400,
  })
})

test('deleted-Space notifications use a stable per-user key and are safe to retry', async (context) => {
  const notifications = []
  context.mock.method(Notification, 'findOneAndUpdate', async (filter, update) => {
    notifications.push({ filter, update })
  })
  context.mock.method(Workspace, 'updateOne', async () => ({}))
  const workspace = { ...archivedWorkspace(), deletedMemberIds: ['owner-a', 'member-a'] }

  await notifyDeletedWorkspaceMembers(workspace, testNow)
  await notifyDeletedWorkspaceMembers(workspace, testNow)

  assert.equal(notifications.length, 4)
  assert.deepEqual(notifications.map(({ filter }) => filter.userId), ['owner-a', 'member-a', 'owner-a', 'member-a'])
  assert.equal(notifications[0].filter.reminderKey, 'workspace-deleted:workspace-a')
  assert.match(notifications[0].update.$setOnInsert.message, /until 2026-10-30T00:00:00.000Z/)
})

test('invited users and outsiders cannot enumerate archived Spaces', async (context) => {
  context.mock.method(Workspace, 'find', (filter) => ({
    select() {
      assert.deepEqual(filter.deletedMemberIds, 'outsider-a')
      return this
    },
    sort() { return this },
    lean: async () => [],
  }))

  assert.deepEqual(await listDeletedWorkspaces('outsider-a', testNow), [])
})

test('archive access is rejected at and after purgeAt', async (context) => {
  const expiredAt = new Date(testNow.getTime() - 1)
  let calls = 0
  context.mock.method(Workspace, 'findOne', () => ({
    select: async () => {
      calls += 1
      return calls === 1 ? null : { purgeAt: expiredAt }
    },
  }))

  await assert.rejects(getDeletedWorkspaceDocument('workspace-a', 'document-a', 'member-a', testNow), {
    message: 'Deleted Space data is no longer available',
    statusCode: 410,
  })
})

test('legacy soft-deleted Spaces receive a member snapshot and five-day purge deadline', async (context) => {
  const deletedAt = new Date(testNow.getTime() - 2 * 24 * 60 * 60 * 1000)
  const workspaceUpdates = []
  let workspaceFindCalls = 0
  context.mock.method(Workspace, 'find', (filter) => {
    workspaceFindCalls += 1
    if (workspaceFindCalls === 1) {
      assert.deepEqual(filter, {
        deletedAt: { $ne: null },
        status: { $in: ['ACTIVE', null] },
        purgeAt: null,
      })
      return mockWorkspaceRetentionQuery([{ _id: 'legacy-space', deletedAt }])
    }
    return mockWorkspaceRetentionQuery([])
  })
  context.mock.method(WorkspaceMember, 'find', (filter) => {
    assert.deepEqual(filter, { workspaceId: 'legacy-space' })
    return {
      select: async () => [{ userId: 'owner-a' }, { userId: 'member-a' }, { userId: 'member-a' }],
    }
  })
  context.mock.method(Workspace, 'updateOne', async (filter, update) => {
    workspaceUpdates.push({ filter, update })
  })

  await runDeletedWorkspaceRetentionJobs(testNow)

  assert.deepEqual(workspaceUpdates[0], {
    filter: {
      _id: 'legacy-space',
      deletedAt,
      status: { $in: ['ACTIVE', null] },
      purgeAt: null,
    },
    update: {
      $set: {
        status: 'DELETED',
        purgeAt: new Date(deletedAt.getTime() + 5 * 24 * 60 * 60 * 1000),
        deletedMemberIds: ['owner-a', 'member-a'],
      },
    },
  })
})

test('scheduled purge removes only data scoped to the due Space and does not delete user accounts', async (context) => {
  const workspaceId = 'workspace-a'
  const operations = []
  let workspaceFindCalls = 0
  let purgeError
  context.mock.method(Workspace, 'find', () => mockWorkspaceRetentionQuery(
    workspaceFindCalls++ < 2 ? [] : [{ _id: workspaceId }],
  ))
  context.mock.method(Workspace, 'updateOne', async (filter, update) => operations.push(['claim', filter, update]))
  context.mock.method(Workspace, 'deleteOne', async (filter) => operations.push(['workspace', filter]))
  context.mock.method(Document, 'find', () => ({
    select() { return this },
    lean: async () => [],
  }))
  for (const model of [Message, Task, Poll, Evaluation, WorkspaceInvitation, Notification, Channel, Document, WorkspaceMember]) {
    context.mock.method(model, 'deleteMany', async (filter) => operations.push([model.modelName, filter]))
  }
  context.mock.method(console, 'error', (...args) => { purgeError = args })

  await runDeletedWorkspaceRetentionJobs(testNow)

  assert.equal(purgeError, undefined)
  assert.deepEqual(operations[0], ['claim', { _id: workspaceId, status: 'DELETED', purgeAt: { $lte: testNow } }, { $set: { status: 'PURGING' } }])
  for (const [modelName, filter] of operations.filter(([name]) => !['claim', 'workspace'].includes(name))) {
    assert.equal(filter.workspaceId, workspaceId, `${modelName} purge must be scoped to one Space`)
  }
  assert.deepEqual(operations[operations.length - 1], ['workspace', { _id: workspaceId, status: 'PURGING' }])
  assert.equal(operations.some(([name]) => name === 'User'), false)
})

test('scheduled purge preserves physical uploads still referenced by another Space', async (context) => {
  const filename = `shared-archive-${randomUUID()}.txt`
  const fileUrl = `/uploads/${filename}`
  const filePath = new URL(`../../../uploads/${filename}`, import.meta.url)
  await writeFile(filePath, 'shared file')
  try {
    let workspaceFindCalls = 0
    context.mock.method(Workspace, 'find', () => mockWorkspaceRetentionQuery(
      workspaceFindCalls++ < 2 ? [] : [{ _id: 'workspace-a' }],
    ))
    context.mock.method(Workspace, 'updateOne', async () => ({}))
    context.mock.method(Workspace, 'deleteOne', async () => ({}))
    context.mock.method(Document, 'find', () => ({
      select() { return this },
      lean: async () => [{ fileUrl, isLink: false }],
    }))
    context.mock.method(Document, 'exists', async (filter) => filter.fileUrl === fileUrl ? { _id: 'shared-document' } : null)
    context.mock.method(Task, 'exists', async () => null)
    context.mock.method(Message, 'exists', async () => null)
    for (const model of [Message, Task, Poll, Evaluation, WorkspaceInvitation, Notification, Channel, Document, WorkspaceMember]) {
      context.mock.method(model, 'deleteMany', async () => ({}))
    }
    context.mock.method(console, 'error', (...args) => { throw new Error(`Unexpected purge error: ${args[0]}`) })

    await runDeletedWorkspaceRetentionJobs(testNow)
    await access(filePath)
  } finally {
    await unlink(filePath)
  }
})
