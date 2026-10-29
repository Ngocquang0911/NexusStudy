import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { AdminAuditLog } from '../admin/AdminAuditLog.js'
import { Document } from '../documents/Document.js'
import { Notification } from '../notifications/Notification.js'
import { Task } from '../tasks/Task.js'
import { Workspace } from './Workspace.js'
import { WorkspaceInvitation } from './WorkspaceInvitation.js'
import { WorkspaceMember } from './WorkspaceMember.js'
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  deleteWorkspace,
  expirePendingWorkspaceInvitations,
  inviteWorkspaceMember,
  joinWorkspace,
  listUserWorkspaces,
  getUserInvitations,
} from './workspace.service.js'
import { User } from '../users/User.js'

function mockMembershipSnapshot(context, userIds = ['owner-a', 'member-a']) {
  context.mock.method(WorkspaceMember, 'find', () => ({
    select: async () => userIds.map((userId) => ({ userId })),
  }))
}

test('workspace JSON never exposes legacy join codes', () => {
  const workspace = new Workspace({
    name: 'Java study',
    ownerId: 'owner-id',
    type: 'COURSE',
    inviteCode: 'LEGACYCODE',
  })

  assert.equal(workspace.toJSON().inviteCode, undefined)
})

test('the owner soft-deletes only the selected workspace and scopes cleanup to it', async (context) => {
  const now = new Date('2026-10-28T00:00:00.000Z')
  const purgeAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
  const workspace = {
    _id: 'workspace-a',
    name: 'Java study',
    purgeAt,
    deletedMemberIds: ['owner-a', 'member-a'],
  }
  const calls = {}
  mockMembershipSnapshot(context)
  context.mock.method(Workspace, 'findOneAndUpdate', async (...args) => {
    calls.workspace = args
    return workspace
  })
  context.mock.method(Workspace, 'updateOne', async (...args) => { calls.noticeMarker = args })
  context.mock.method(AdminAuditLog, 'create', async (entry) => { calls.audit = entry })
  context.mock.method(WorkspaceInvitation, 'updateMany', async (...args) => { calls.invitations = args })
  context.mock.method(Notification, 'deleteMany', async (filter) => { calls.notifications = filter })
  context.mock.method(Notification, 'findOneAndUpdate', async (...args) => { (calls.deletionNotices ||= []).push(args) })
  for (const model of [Document, Task, WorkspaceMember, User]) {
    context.mock.method(model, 'deleteMany', async () => {
      throw new Error(`${model.modelName} records must be retained`)
    })
  }

  const result = await deleteWorkspace('workspace-a', 'owner-a', now)

  assert.deepEqual(calls.workspace[0], {
    _id: 'workspace-a',
    ownerId: 'owner-a',
    deletedAt: null,
    status: { $in: ['ACTIVE', null] },
  })
  assert.deepEqual(calls.workspace[1], {
    $set: {
      status: 'DELETED',
      deletedAt: now,
      deletedBy: 'owner-a',
      purgeAt,
      deletedMemberIds: ['owner-a', 'member-a'],
    },
  })
  assert.deepEqual(calls.invitations, [
    { workspaceId: 'workspace-a', status: 'PENDING' },
    { $set: { status: 'CANCELLED', cancelledAt: now } },
  ])
  assert.deepEqual(calls.notifications, { workspaceId: 'workspace-a' })
  assert.equal(calls.audit.action, 'WORKSPACE_DELETED')
  assert.equal(calls.audit.targetId, 'workspace-a')
  assert.equal(calls.audit.actorId, 'owner-a')
  assert.deepEqual(calls.deletionNotices.map(([filter]) => filter.userId), ['owner-a', 'member-a'])
  assert.equal(calls.deletionNotices[0][1].$setOnInsert.type, 'WORKSPACE_DELETED')
  assert.match(calls.deletionNotices[0][1].$setOnInsert.message, /2026-11-02T00:00:00.000Z/)
  assert.deepEqual(calls.noticeMarker, [
    { _id: 'workspace-a', status: 'DELETED', deletionNoticesSentAt: null },
    { $set: { deletionNoticesSentAt: now } },
  ])
  assert.deepEqual(result, {
    workspaceId: 'workspace-a',
    deletedAt: now,
    purgeAt,
    cleanupPending: false,
    cleanupWarnings: [],
  })
})

test('a non-owner cannot soft-delete an active workspace', async (context) => {
  mockMembershipSnapshot(context)
  context.mock.method(Workspace, 'findOneAndUpdate', async () => null)
  context.mock.method(Workspace, 'findById', () => ({
    select: async () => ({ _id: 'workspace-a', ownerId: 'owner-a', deletedAt: null, name: 'Java study' }),
  }))
  context.mock.method(AdminAuditLog, 'create', async () => {
    throw new Error('Unauthorized deletion must not be audited as successful')
  })

  await assert.rejects(
    deleteWorkspace('workspace-a', 'member-a'),
    { message: 'Only the workspace owner can delete this workspace', statusCode: 403 },
  )
})

test('a missing or previously deleted workspace cannot be deleted again', async (context) => {
  mockMembershipSnapshot(context)
  context.mock.method(Workspace, 'findOneAndUpdate', async () => null)
  context.mock.method(Workspace, 'findById', () => ({
    select: async () => ({ _id: 'workspace-a', deletedAt: new Date() }),
  }))

  await assert.rejects(deleteWorkspace('workspace-a', 'owner-a'), {
    message: 'Workspace not found',
    statusCode: 404,
  })
})

test('a failed conditional delete leaves invitations, notifications, and audit untouched', async (context) => {
  mockMembershipSnapshot(context)
  context.mock.method(Workspace, 'findOneAndUpdate', async () => null)
  context.mock.method(Workspace, 'findById', () => ({ select: async () => null }))
  context.mock.method(WorkspaceInvitation, 'updateMany', async () => {
    throw new Error('Invitation cleanup must not run')
  })
  context.mock.method(Notification, 'deleteMany', async () => {
    throw new Error('Notification cleanup must not run')
  })
  context.mock.method(AdminAuditLog, 'create', async () => {
    throw new Error('Audit must not run')
  })

  await assert.rejects(deleteWorkspace('workspace-a', 'owner-a'), {
    message: 'Workspace not found',
    statusCode: 404,
  })
})

test('a cleanup failure does not undo access revocation or hide the cleanup warning', async (context) => {
  mockMembershipSnapshot(context)
  const workspace = {
    _id: 'workspace-a',
    name: 'Java study',
    purgeAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    deletedMemberIds: ['owner-a', 'member-a'],
  }
  context.mock.method(Workspace, 'findOneAndUpdate', async () => workspace)
  context.mock.method(Workspace, 'updateOne', async () => ({}))
  context.mock.method(AdminAuditLog, 'create', async () => ({}))
  context.mock.method(WorkspaceInvitation, 'updateMany', async () => {
    throw new Error('Database unavailable')
  })
  context.mock.method(Notification, 'deleteMany', async () => ({}))
  context.mock.method(Notification, 'findOneAndUpdate', async () => ({}))
  context.mock.method(console, 'error', () => {})

  const result = await deleteWorkspace('workspace-a', 'owner-a')

  assert.equal(result.cleanupPending, true)
  assert.deepEqual(result.cleanupWarnings, ['pending invitations'])
})

test('workspace lists exclude deleted workspaces while preserving other memberships', async (context) => {
  let workspaceFilter
  const workspaceA = new mongoose.Types.ObjectId()
  const workspaceB = new mongoose.Types.ObjectId()
  const workspaceBRecord = { _id: workspaceB, toJSON: () => ({ name: 'Database' }) }
  context.mock.method(WorkspaceMember, 'find', () => ({
    select: async () => [
      { workspaceId: workspaceA, role: 'OWNER' },
      { workspaceId: workspaceB, role: 'MEMBER' },
    ],
  }))
  context.mock.method(Workspace, 'find', (filter) => {
    workspaceFilter = filter
    return { sort: async () => [workspaceBRecord] }
  })
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => ({ ownerId: 'owner-b' }) }))
  context.mock.method(User, 'findById', () => ({ select: async () => ({ subscriptionPlan: 'FREE' }) }))

  const result = await listUserWorkspaces('user-a')

  assert.deepEqual(workspaceFilter._id.$in, [workspaceA, workspaceB])
  assert.equal(workspaceFilter.deletedAt, null)
  assert.deepEqual(workspaceFilter.status, { $in: ['ACTIVE', null] })
  assert.deepEqual(result, [{ name: 'Database', role: 'MEMBER', plan: 'FREE' }])
})

test('the invitation list only returns invitations for active workspaces', async (context) => {
  const activeWorkspaceIds = ['workspace-b']
  let invitationFilter
  let findCalls = 0
  context.mock.method(WorkspaceInvitation, 'find', (filter) => {
    findCalls += 1
    if (findCalls === 1) return { select: async () => [] }
    invitationFilter = filter
    return {
      sort() { return this },
      limit() { return this },
      populate(field) { return field === 'inviterId' ? [] : this },
    }
  })
  context.mock.method(WorkspaceInvitation, 'updateMany', async () => ({ modifiedCount: 0 }))
  context.mock.method(Workspace, 'find', () => ({ select: async () => activeWorkspaceIds.map((_id) => ({ _id })) }))

  const result = await getUserInvitations('invitee-a')

  assert.deepEqual(invitationFilter, {
    inviteeId: 'invitee-a',
    workspaceId: { $in: activeWorkspaceIds },
  })
  assert.deepEqual(result, [])
})

test('invites remain pending for three days and are set to expire at the deadline', async (context) => {
  const now = new Date('2026-10-25T00:00:00.000Z')
  const user = { _id: 'invitee-id', email: 'student@example.com', name: 'Student' }
  const workspace = { _id: 'workspace-id', name: 'Java study' }
  const invitation = { _id: 'invitation-id', status: 'PENDING' }
  let createdInvitation

  context.mock.method(WorkspaceInvitation, 'find', () => ({
    select: async () => [],
  }))
  context.mock.method(WorkspaceInvitation, 'updateMany', async () => ({ modifiedCount: 0 }))
  context.mock.method(User, 'findOne', () => ({ select: async () => user }))
  context.mock.method(WorkspaceMember, 'findOne', async () => null)
  context.mock.method(Workspace, 'findById', () => ({ select: async () => workspace }))
  context.mock.method(WorkspaceInvitation, 'create', async (data) => {
    createdInvitation = data
    return invitation
  })
  context.mock.method(User, 'findById', () => ({ select: async () => ({ name: 'Leader' }) }))
  context.mock.method(Notification, 'findOneAndUpdate', async () => ({}))

  const result = await inviteWorkspaceMember('workspace-id', 'leader-id', ' STUDENT@example.com ', now)

  assert.equal(result.status, 'PENDING')
  assert.equal(createdInvitation.status, 'PENDING')
  assert.equal(createdInvitation.expiresAt.getTime() - now.getTime(), 3 * 24 * 60 * 60 * 1000)
})

test('pending invitations at or past their three-day deadline become expired', async (context) => {
  const now = new Date('2026-10-28T00:00:00.000Z')
  let update
  context.mock.method(WorkspaceInvitation, 'find', () => ({
    select: async () => [],
  }))
  context.mock.method(WorkspaceInvitation, 'updateMany', async (filter, operation) => {
    update = { filter, operation }
    return { modifiedCount: 1 }
  })

  await expirePendingWorkspaceInvitations(now)

  assert.deepEqual(update.filter, { status: 'PENDING', expiresAt: { $lte: now } })
  assert.deepEqual(update.operation, { $set: { status: 'EXPIRED' } })
})

test('an invitation cannot be accepted at or after its expiration time', async (context) => {
  const expiresAt = new Date('2026-10-28T00:00:00.000Z')
  let expiredUpdate
  context.mock.method(WorkspaceInvitation, 'findById', async () => ({
    _id: 'invitation-id',
    inviteeId: 'invitee-id',
    workspaceId: 'workspace-id',
    status: 'PENDING',
    expiresAt,
  }))
  context.mock.method(WorkspaceInvitation, 'updateOne', async (filter, update) => {
    expiredUpdate = { filter, update }
  })
  context.mock.method(WorkspaceMember, 'findOne', async () => {
    throw new Error('Membership must not be checked after invitation expiry')
  })

  await assert.rejects(
    acceptWorkspaceInvitation('invitation-id', 'invitee-id', expiresAt),
    { message: 'Workspace invitation has expired', statusCode: 409 },
  )
  assert.deepEqual(expiredUpdate.filter, { _id: 'invitation-id', status: 'PENDING', expiresAt: { $lte: expiresAt } })
  assert.deepEqual(expiredUpdate.update, { $set: { status: 'EXPIRED' } })
})

test('only the invited account can respond to an invitation', async (context) => {
  context.mock.method(WorkspaceInvitation, 'findById', async () => ({
    _id: 'invitation-id',
    inviteeId: 'invitee-id',
    status: 'PENDING',
    expiresAt: new Date('2026-10-28T00:00:00.000Z'),
  }))
  context.mock.method(WorkspaceMember, 'findOne', async () => {
    throw new Error('Unauthorized invitee must not get this far')
  })

  await assert.rejects(
    acceptWorkspaceInvitation('invitation-id', 'different-user', new Date('2026-10-27T00:00:00.000Z')),
    { message: 'Only the invited user can respond to this invitation', statusCode: 403 },
  )
})

test('an invitation for a deleted workspace cannot be accepted', async (context) => {
  const now = new Date('2026-10-27T00:00:00.000Z')
  context.mock.method(WorkspaceInvitation, 'findById', async () => ({
    _id: 'invitation-id',
    inviteeId: 'invitee-id',
    workspaceId: 'workspace-a',
    status: 'PENDING',
    expiresAt: new Date('2026-10-30T00:00:00.000Z'),
  }))
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => null }))
  context.mock.method(WorkspaceMember, 'findOne', async () => {
    throw new Error('Deleted-space membership must not be granted')
  })
  context.mock.method(WorkspaceInvitation, 'findOneAndUpdate', async () => {
    throw new Error('Deleted-space invitation must not be accepted')
  })

  await assert.rejects(acceptWorkspaceInvitation('invitation-id', 'invitee-id', now), {
    message: 'Workspace not found',
    statusCode: 404,
  })
})

test('joining with a workspace code is rejected because membership requires an accepted invitation', async () => {
  await assert.rejects(
    joinWorkspace('invitee-id', 'ABCD1234'),
    { message: 'Joining by workspace code is no longer supported. Accept a pending workspace invitation instead.', statusCode: 410, code: 'INVITATION_REQUIRED' },
  )
})

test('administrators are prohibited from creating personal workspaces', async (context) => {
  context.mock.method(User, 'findById', () => ({
    select: async () => ({ systemRole: 'ADMIN' }),
  }))

  await assert.rejects(
    createWorkspace('admin-id', { name: 'Admin Room', type: 'OTHER' }),
    {
      message: 'Administrators cannot create personal workspaces. Workspaces are managed through the Admin console.',
      statusCode: 403,
    },
  )
})
