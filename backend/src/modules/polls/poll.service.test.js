import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { Poll } from './Poll.js'
import { votePoll } from './poll.service.js'

function createPollDocument({ voterId, isClosed = false, expiresAt = new Date(Date.now() + 60_000) } = {}) {
  return new Poll({
    workspaceId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    question: 'Select a meeting time',
    options: [{ label: 'Monday' }, { label: 'Wednesday' }],
    votes: voterId ? [{ userId: voterId, optionId: new mongoose.Types.ObjectId() }] : [],
    expiresAt,
    isClosed,
  })
}

test('vote uses an atomic query to prevent duplicate ballots under concurrent requests', async (context) => {
  const voterId = new mongoose.Types.ObjectId()
  const poll = createPollDocument()
  const optionId = poll.options[0]._id
  const updatedPoll = createPollDocument()
  updatedPoll._id = poll._id
  updatedPoll.votes.push({ userId: voterId, optionId })

  let query
  context.mock.method(Poll, 'findOneAndUpdate', async (filter) => {
    query = filter
    return updatedPoll
  })

  const result = await votePoll(poll, voterId, optionId.toString())

  assert.equal(query._id.toString(), poll._id.toString())
  assert.deepEqual(query.votes, { $not: { $elemMatch: { userId: voterId } } })
  assert.equal(result.totalVotes, 1)
  assert.equal(result.userVote.toString(), optionId.toString())
})

test('vote reports a concurrent duplicate instead of overwriting the existing vote', async (context) => {
  const voterId = new mongoose.Types.ObjectId()
  const poll = createPollDocument()
  const optionId = poll.options[0]._id
  const latestPoll = createPollDocument({ voterId })
  latestPoll._id = poll._id
  context.mock.method(Poll, 'findOneAndUpdate', async () => null)
  context.mock.method(Poll, 'findById', async () => latestPoll)

  await assert.rejects(
    votePoll(poll, voterId, optionId.toString()),
    { statusCode: 409, message: 'User has already voted in this poll' },
  )
})
