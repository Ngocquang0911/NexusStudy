import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { Evaluation } from '../modules/evaluations/Evaluation.js'
import { Workspace } from '../modules/workspaces/Workspace.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'
import { requireEvaluationMember } from './evaluation.middleware.js'

test('an unrelated workspace member cannot read an individual evaluation after the period ends', async (context) => {
  const evaluatorId = new mongoose.Types.ObjectId()
  const requestingUserId = new mongoose.Types.ObjectId()
  const evaluationId = new mongoose.Types.ObjectId()
  const workspaceId = new mongoose.Types.ObjectId()
  context.mock.method(Evaluation, 'findById', async () => ({
    workspaceId,
    evaluatorId,
    periodEndsAt: new Date(Date.now() - 60_000),
  }))
  context.mock.method(Workspace, 'findOne', () => ({ select: async () => ({ _id: workspaceId }) }))
  context.mock.method(WorkspaceMember, 'findOne', async () => ({ role: 'MEMBER' }))

  let nextError
  await requireEvaluationMember(
    { params: { id: evaluationId.toString() }, auth: { userId: requestingUserId } },
    {},
    (error) => { nextError = error },
  )

  assert.equal(nextError.statusCode, 403)
  assert.equal(nextError.message, 'Only the evaluator can view this evaluation')
})
