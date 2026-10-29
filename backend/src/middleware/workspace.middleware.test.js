import assert from 'node:assert/strict'
import test from 'node:test'
import { Workspace } from '../modules/workspaces/Workspace.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'
import { findActiveWorkspaceMember, requireWorkspaceMember, requireWorkspaceOwner } from './workspace.middleware.js'

test('deleted workspaces are rejected before checking membership', async (context) => {
  let membershipQueried = false
  context.mock.method(Workspace, 'findOne', (filter) => {
    assert.deepEqual(filter, { _id: 'workspace-a', deletedAt: null, status: { $in: ['ACTIVE', null] } })
    return { select: async () => null }
  })
  context.mock.method(WorkspaceMember, 'findOne', async () => {
    membershipQueried = true
    return { role: 'OWNER' }
  })

  await assert.rejects(findActiveWorkspaceMember('workspace-a', 'owner-a'), {
    message: 'Workspace not found',
    statusCode: 404,
  })
  assert.equal(membershipQueried, false)
})

test('workspace owner authorization rejects members regardless of the requested workspace id', async () => {
  const errors = []
  requireWorkspaceOwner(
    { params: { id: 'workspace-a' }, workspaceMember: { role: 'MEMBER' } },
    {},
    (error) => { if (error) errors.push(error) },
  )

  assert.equal(errors[0]?.statusCode, 403)
  assert.equal(errors[0]?.message, 'Workspace owner permission required')
})

test('a non-member cannot reach owner-only operations by substituting a workspace id', async (context) => {
  context.mock.method(Workspace, 'findOne', (filter) => {
    assert.deepEqual(filter, { _id: 'workspace-a', deletedAt: null, status: { $in: ['ACTIVE', null] } })
    return { select: async () => ({ _id: 'workspace-a' }) }
  })
  context.mock.method(WorkspaceMember, 'findOne', (filter) => {
    assert.deepEqual(filter, { workspaceId: 'workspace-a', userId: 'outsider-a' })
    return null
  })

  let nextError
  await requireWorkspaceMember(
    { params: { id: 'workspace-a' }, auth: { userId: 'outsider-a' } },
    {},
    (error) => { nextError = error },
  )

  assert.equal(nextError.statusCode, 403)
  assert.equal(nextError.message, 'Workspace membership required')
})
