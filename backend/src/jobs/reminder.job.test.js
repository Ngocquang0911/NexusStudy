import assert from 'node:assert/strict'
import test from 'node:test'
import { Poll } from '../modules/polls/Poll.js'
import { Workspace } from '../modules/workspaces/Workspace.js'
import { closeExpiredPolls } from './reminder.job.js'

test('scheduled poll closure updates only open polls whose deadline passed', async (context) => {
  let operation
  context.mock.method(Workspace, 'find', () => ({
    distinct: async () => ['active-workspace'],
  }))
  context.mock.method(Poll, 'updateMany', async (...args) => {
    operation = args
    return { modifiedCount: 2 }
  })
  const now = new Date('2026-10-25T12:00:00.000Z')

  const result = await closeExpiredPolls(now)

  assert.equal(result.modifiedCount, 2)
  assert.deepEqual(operation, [
    { workspaceId: { $in: ['active-workspace'] }, isClosed: false, expiresAt: { $lte: now } },
    { $set: { isClosed: true } },
  ])
})
