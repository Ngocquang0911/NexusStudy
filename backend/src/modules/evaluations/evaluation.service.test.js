import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { Evaluation } from './Evaluation.js'
import { getReport } from './evaluation.service.js'
import { User } from '../users/User.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Task } from '../tasks/Task.js'

test('contribution reports include all current workspace members and their task outcomes', async (context) => {
  const workspaceId = new mongoose.Types.ObjectId()
  const leaderId = new mongoose.Types.ObjectId()
  const ratedUser = { _id: new mongoose.Types.ObjectId(), name: 'Rated teammate', email: 'rated@example.com' }
  const unratedUser = { _id: new mongoose.Types.ObjectId(), name: 'Unrated teammate', email: 'unrated@example.com' }
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCMonth(monthStart.getUTCMonth() - 1)
  const completedAt = new Date(monthStart.getTime() + 10 * 60 * 60 * 1000)
  const deadline = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000)

  context.mock.method(User, 'findById', () => ({
    select: async () => ({ subscriptionPlan: 'PREMIUM' }),
  }))
  context.mock.method(WorkspaceMember, 'find', () => ({
    populate: async () => [{ userId: ratedUser }, { userId: unratedUser }],
  }))
  context.mock.method(Evaluation, 'find', () => ({
    populate: async () => [{
        evaluatedUserId: ratedUser,
        score: 4,
        criteria: [{ name: 'COLLABORATION', score: 4 }],
      }],
  }))
  context.mock.method(Task, 'find', () => ({
    select() {
      return {
        populate: async () => [{
          title: 'Prepare presentation',
          status: 'DONE',
          deadline,
          completedAt,
          assignedTo: [ratedUser],
        }],
      }
    },
  }))

  const report = await getReport(workspaceId, leaderId, { role: 'OWNER' })

  assert.equal(report.members.length, 2)
  assert.equal(report.evaluationCount, 1)
  assert.equal(report.members.find((member) => member.user._id.equals(ratedUser._id)).averageScore, 4)
  const unrated = report.members.find((member) => member.user._id.equals(unratedUser._id))
  assert.equal(unrated.averageScore, null)
  assert.deepEqual(unrated.taskOutcomes, [])
  assert.equal(report.members.find((member) => member.user._id.equals(ratedUser._id)).taskOutcomes[0].outcome, 'ON_TIME')
})
