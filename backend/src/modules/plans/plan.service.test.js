import assert from 'node:assert/strict'
import test from 'node:test'
import { User } from '../users/User.js'
import { Workspace } from '../workspaces/Workspace.js'
import { assertPremiumWorkspace, getWorkspacePlan, PLAN_LIMITS } from './plan.service.js'

test('Free accounts can create or join up to three workspaces', () => {
  assert.equal(PLAN_LIMITS.FREE.maxWorkspaces, 3)
})

test('workspace features use the owner plan rather than a member plan', async (context) => {
  context.mock.method(Workspace, 'findOne', () => ({
    select: async () => ({ ownerId: 'owner-id' }),
  }))
  context.mock.method(User, 'findById', () => ({
    select: async () => ({ subscriptionPlan: 'FREE' }),
  }))

  assert.equal(await getWorkspacePlan('workspace-id'), 'FREE')
  await assert.rejects(
    assertPremiumWorkspace('workspace-id'),
    { statusCode: 403, code: 'PREMIUM_REQUIRED' },
  )
})

test('premium workspace feature access is available when its owner is premium', async (context) => {
  context.mock.method(Workspace, 'findOne', () => ({
    select: async () => ({ ownerId: 'owner-id' }),
  }))
  context.mock.method(User, 'findById', () => ({
    select: async () => ({ subscriptionPlan: 'PREMIUM' }),
  }))

  await assert.doesNotReject(assertPremiumWorkspace('workspace-id'))
})
