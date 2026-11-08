import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { User } from '../users/User.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Workspace } from '../workspaces/Workspace.js'
import { Document } from '../documents/Document.js'
import { Message } from '../chat/Message.js'
import { Channel } from '../chat/Channel.js'
import { Task } from '../tasks/Task.js'
import { Poll } from '../polls/Poll.js'
import { Evaluation } from '../evaluations/Evaluation.js'
import { WorkspaceInvitation } from '../workspaces/WorkspaceInvitation.js'
import { Notification } from '../notifications/Notification.js'
import { Report } from './Report.js'
import router from './report.routes.js'
const id = '111111111111111111111111', other = '222222222222222222222222', workspace = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const handler = (path, method) => router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack.at(-1).handle
const reply = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this }, json(value) { this.body = value; return this } })
test('locked accounts and revoked tokens cannot access authenticated APIs', async (t) => {
  const token = jwt.sign({ userId: id, tokenType: 'access', tokenVersion: 0 }, env.jwtSecret)
  let record = { isLocked: true, tokenVersion: 1 }
  t.mock.method(User, 'findById', () => ({ select: async () => record }))
  async function check() { let result = 'allowed'; await requireAuth({ headers: { authorization: `Bearer ${token}` } }, {}, (error) => { result = error || 'allowed' }); return result }
  assert.equal((await check()).statusCode, 401)
  record = { isLocked: false, tokenVersion: 1 }; assert.equal((await check()).statusCode, 401)
  record = { isLocked: false, tokenVersion: 0 }; assert.equal(await check(), 'allowed')
})
test('reports reject unrelated or self targets and store the reporter identity', async (t) => {
  let saved
  t.mock.method(WorkspaceMember, 'exists', async () => false)
  t.mock.method(Report, 'create', async (data) => { saved = data; return { _id: id, status: 'OPEN' } })
  const create = handler('/workspaces/:workspaceId/reports', 'post')
  let res = reply()
  await create({ params: { workspaceId: workspace }, auth: { userId: id }, body: { targetType: 'USER', targetId: other, reason: 'Unrelated person' } }, res, (error) => { throw error })
  assert.equal(res.statusCode, 403)
  res = reply()
  await create({ params: { workspaceId: workspace }, auth: { userId: id }, body: { targetType: 'USER', targetId: id, reason: 'A reason to report' } }, res, (error) => { throw error })
  assert.equal(res.statusCode, 400)
  res = reply()
  await create({ params: { workspaceId: workspace }, auth: { userId: id }, body: { targetType: 'WORKSPACE', targetId: workspace, reason: '  Detailed reason  ' } }, res, (error) => { throw error })
  assert.equal(res.statusCode, 201); assert.equal(saved.reporterId, id); assert.equal(saved.reason, 'Detailed reason')
})
test('administrative report actions require admin middleware and cannot lock administrators', async (t) => {
  for (const path of ['/admin/reports', '/admin/reports/:id', '/admin/users/:id/lock', '/admin/workspaces/:id']) assert.ok(router.stack.find((layer) => layer.route?.path === path).route.stack.some((layer) => layer.handle === requireAdmin))
  t.mock.method(User, 'findById', async () => ({ systemRole: 'ADMIN' }))
  const res = reply()
  await handler('/admin/users/:id/lock', 'patch')({ params: { id }, body: { locked: true, reason: 'Violation' }, auth: { userId: other } }, res, (error) => { throw error })
  assert.equal(res.statusCode, 403)
})

test('locking a user revokes existing sessions and records the administrator reason', async (t) => {
  const user = { _id: id, email: 'member@example.com', systemRole: 'STUDENT', isLocked: false, tokenVersion: 2, save: async () => {} }
  t.mock.method(User, 'findById', async () => user)
  let audit, disconnected = false
  const { AdminAuditLog } = await import('../admin/AdminAuditLog.js')
  t.mock.method(AdminAuditLog, 'create', async (entry) => { audit = entry })
  const res = reply()
  const app = { get: () => ({ in: () => ({ disconnectSockets: () => { disconnected = true } }) }) }
  await handler('/admin/users/:id/lock', 'patch')({ params: { id }, body: { locked: true, reason: 'Repeated abuse' }, auth: { userId: other }, app }, res, (error) => { throw error })
  assert.equal(res.statusCode, 200)
  assert.equal(user.isLocked, true)
  assert.equal(user.tokenVersion, 3)
  assert.equal(audit.actorId, other)
  assert.equal(audit.reason, 'Repeated abuse')
  assert.equal(disconnected, true)
})

test('admin permanently deletes an ownerless workspace without creating an archive', async (t) => {
  t.mock.method(Workspace, 'findById', () => ({ select: async () => ({ _id: workspace, ownerId: null }) }))
  let claim, removed
  t.mock.method(Workspace, 'findOneAndUpdate', async (filter, update) => { claim = { filter, update }; return { _id: workspace, name: 'Ownerless' } })
  t.mock.method(Workspace, 'deleteOne', async (filter) => { removed = filter })
  t.mock.method(Document, 'find', () => ({ select() { return this }, lean: async () => [] }))
  for (const model of [Document, Message, Channel, Task, Poll, Evaluation, WorkspaceInvitation, Notification, WorkspaceMember]) t.mock.method(model, 'deleteMany', async () => ({}))
  const { AdminAuditLog } = await import('../admin/AdminAuditLog.js')
  t.mock.method(AdminAuditLog, 'create', async () => ({}))
  const res = reply()
  await handler('/admin/workspaces/:id', 'delete')({ params: { id: workspace }, body: { reason: 'Owner no longer exists' }, auth: { userId: id }, app: { get: () => null } }, res, (error) => { throw error })
  assert.equal(claim.update.$set.status, 'PURGING')
  assert.deepEqual(claim.update.$set.deletedMemberIds, [])
  assert.deepEqual(removed, { _id: workspace, status: 'PURGING' })
  assert.equal(res.body.data.permanentlyDeleted, true)
})
