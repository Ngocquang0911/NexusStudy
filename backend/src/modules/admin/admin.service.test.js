import assert from 'node:assert/strict'
import test from 'node:test'
import { AdminAuditLog } from './AdminAuditLog.js'
import { getAdminOverview, updateSubscriptionPlan } from './admin.service.js'
import { Document } from '../documents/Document.js'
import { Message } from '../chat/Message.js'
import { Notification } from '../notifications/Notification.js'
import { Poll } from '../polls/Poll.js'
import { Task } from '../tasks/Task.js'
import { User } from '../users/User.js'
import { Workspace } from '../workspaces/Workspace.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'

test('admin overview queries real counts and fills missing chart dates with zero', async (context) => {
  const now = new Date('2026-10-25T12:00:00.000Z')
  context.mock.method(User, 'countDocuments', async (filter = {}) => {
    if (filter.systemRole === 'ADMIN') return 2
    if (filter.subscriptionPlan === 'FREE') return 8
    if (filter.subscriptionPlan === 'PREMIUM') return 3
    if (filter.createdAt) return filter.createdAt.$gte.getUTCDate() === 25 ? 1 : 4
    return 11
  })
  context.mock.method(Workspace, 'countDocuments', async (filter = {}) => filter.createdAt ? 2 : 6)
  context.mock.method(WorkspaceMember, 'countDocuments', async () => 14)
  context.mock.method(Task, 'countDocuments', async (filter = {}) => filter.status === 'DONE' ? 7 : filter.deadline ? 2 : 20)
  context.mock.method(Poll, 'countDocuments', async () => 5)
  context.mock.method(Document, 'countDocuments', async (filter = {}) => filter.expiresAt?.$lte ? 3 : 9)
  context.mock.method(Document, 'aggregate', async () => [{ totalBytes: 2048 }])
  context.mock.method(Message, 'countDocuments', async () => 30)
  context.mock.method(Notification, 'countDocuments', async () => 17)
  context.mock.method(AdminAuditLog, 'find', () => ({
    select() { return this },
    populate() { return this },
    sort() { return this },
    limit: async () => [],
  }))
  context.mock.method(User, 'find', () => ({
    select() { return this },
    sort() { return this },
    limit: async () => [],
  }))
  context.mock.method(Workspace, 'find', () => ({
    select() { return this },
    populate() { return this },
    sort() { return this },
    limit: async () => [],
  }))
  context.mock.method(User, 'aggregate', async () => [{ _id: '2026-10-24', count: 2 }])
  context.mock.method(Workspace, 'aggregate', async () => [{ _id: '2026-10-25', count: 1 }])

  const overview = await getAdminOverview('7d', now)

  assert.equal(overview.users.total, 11)
  assert.equal(overview.users.premium, 3)
  assert.equal(overview.users.newToday, 1)
  assert.equal(overview.workspaces.members, 14)
  assert.equal(overview.tasks.completed, 7)
  assert.equal(overview.content.documentStorageBytes, 2048)
  assert.equal(overview.content.notifications, 17)
  assert.equal(overview.trends.users.length, 7)
  assert.equal(overview.trends.users.at(-1).date, '2026-10-25')
  assert.equal(overview.trends.users.at(-1).count, 0)
  assert.equal(overview.trends.users.at(-2).count, 2)
  assert.equal(overview.capabilities.aiUsage, false)
})

test('admin dashboard rejects unsupported chart ranges', async () => {
  await assert.rejects(getAdminOverview('1y'), {
    statusCode: 400,
    message: 'Range must be 7d, 30d, or 90d',
  })
})

test('manual subscription changes require a reason and append an audit record', async (context) => {
  const actorId = '507f1f77bcf86cd799439011'
  const targetId = '507f1f77bcf86cd799439012'
  const user = {
    _id: targetId,
    name: 'Study member',
    email: 'member@example.com',
    systemRole: 'STUDENT',
    subscriptionPlan: 'FREE',
    async save() {},
  }
  context.mock.method(User, 'findById', () => ({
    select: async () => user,
  }))
  let auditRecord
  context.mock.method(AdminAuditLog, 'create', async (record) => { auditRecord = record })

  await assert.rejects(
    updateSubscriptionPlan(targetId, 'PREMIUM', actorId),
    { statusCode: 400, message: 'A reason of 1 to 500 characters is required' },
  )
  await updateSubscriptionPlan(targetId, 'PREMIUM', actorId, 'Approved student access')

  assert.equal(user.subscriptionPlan, 'PREMIUM')
  assert.equal(auditRecord.actorId, actorId)
  assert.equal(auditRecord.targetId, targetId)
  assert.equal(auditRecord.previousValue, 'FREE')
  assert.equal(auditRecord.newValue, 'PREMIUM')
  assert.equal(auditRecord.reason, 'Approved student access')
  assert.equal('password' in auditRecord, false)
})
