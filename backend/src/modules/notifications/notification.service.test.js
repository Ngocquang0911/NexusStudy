import assert from 'node:assert/strict'
import test from 'node:test'
import { Notification } from './Notification.js'
import { listNotifications } from './notification.service.js'
import { Workspace } from '../workspaces/Workspace.js'

test('only deletion notices for eligible members remain visible from deleted workspaces', async (context) => {
  let notificationFilter
  let workspaceQueries = 0
  context.mock.method(Workspace, 'find', (filter) => {
    workspaceQueries += 1
    if (workspaceQueries === 1) {
      assert.deepEqual(filter, { deletedAt: null, status: { $in: ['ACTIVE', null] } })
      return { select: async () => [{ _id: 'workspace-b' }] }
    }
    assert.equal(filter.status, 'DELETED')
    assert.ok(filter.purgeAt.$gt instanceof Date)
    assert.equal(filter.deletedMemberIds, 'user-a')
    return { select: async () => [{ _id: 'deleted-space' }] }
  })
  context.mock.method(Notification, 'find', (filter) => {
    notificationFilter = filter
    return {
      sort() { return this },
      limit: async () => [],
    }
  })

  const result = await listNotifications('user-a')

  assert.deepEqual(notificationFilter, {
    userId: 'user-a',
    $or: [
      { workspaceId: { $in: ['workspace-b'] } },
      { workspaceId: { $in: ['deleted-space'] }, type: 'WORKSPACE_DELETED' },
    ],
  })
  assert.deepEqual(result, [])
})
