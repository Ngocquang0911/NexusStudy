import assert from 'node:assert/strict'
import test from 'node:test'
import { Task } from '../modules/tasks/Task.js'
import { Workspace } from '../modules/workspaces/Workspace.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'
import { requireTaskMember } from './task.middleware.js'

test('task routes reject deleted Spaces before allowing reads or writes', async (context) => {
  context.mock.method(Task, 'findById', async () => ({ workspaceId: 'deleted-space' }))
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => null }))
  context.mock.method(WorkspaceMember, 'findOne', async () => {
    throw new Error('Deleted Space membership must not grant access')
  })

  let nextError
  await requireTaskMember(
    { params: { id: '507f1f77bcf86cd799439011' }, auth: { userId: 'member-a' } },
    {},
    (error) => { nextError = error },
  )

  assert.equal(nextError.statusCode, 404)
  assert.equal(nextError.message, 'Workspace not found')
})
