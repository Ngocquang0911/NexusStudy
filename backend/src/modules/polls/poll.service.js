import mongoose from 'mongoose'
import { Poll } from './Poll.js'

function pollError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function isLeader(member) {
  return ['OWNER', 'LEADER'].includes(member?.role)
}

function formatPoll(poll, userId) {
  const currentTime = new Date()
  const expired = poll.expiresAt <= currentTime
  const userVote = poll.votes.find((vote) => vote.userId.equals(userId))
  return {
    ...poll.toJSON(),
    status: poll.isClosed ? 'CLOSED' : expired ? 'EXPIRED' : 'OPEN',
    options: poll.options.map((option) => ({
      id: option._id,
      label: option.label,
      voteCount: poll.votes.filter((vote) => vote.optionId.equals(option._id)).length,
    })),
    totalVotes: poll.votes.length,
    userVote: userVote?.optionId || null,
    votes: undefined,
  }
}

function normalizeOptions(options) {
  if (!Array.isArray(options) || options.length < 2) throw pollError('At least two options are required', 400)
  const labels = options.map((option) => typeof option === 'string' ? option.trim() : option.label?.trim())
  if (labels.some((label) => !label) || new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
    throw pollError('Poll options must be non-empty and unique', 400)
  }
  return labels.map((label) => ({ label }))
}

export async function createPoll(userId, workspaceId, payload) {
  const expiresAt = new Date(payload.expiresAt)
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) throw pollError('Poll expiration must be a future date', 400)
  const poll = await Poll.create({
    workspaceId,
    createdBy: userId,
    question: payload.question,
    options: normalizeOptions(payload.options),
    expiresAt,
  })
  return formatPoll(poll, userId)
}

export async function listPolls(workspaceId, userId) {
  const polls = await Poll.find({ workspaceId }).sort({ createdAt: -1 })
  return polls.map((poll) => formatPoll(poll, userId))
}

export async function getPoll(poll, userId) {
  return formatPoll(poll, userId)
}

export async function votePoll(poll, userId, optionId) {
  if (poll.isClosed || poll.expiresAt <= new Date()) throw pollError('Poll is closed or expired', 409)
  if (!mongoose.isValidObjectId(optionId)) throw pollError('Invalid poll option', 400)
  const option = poll.options.id(optionId)
  if (!option) throw pollError('Poll option not found', 404)
  if (poll.votes.some((vote) => vote.userId.equals(userId))) throw pollError('User has already voted in this poll', 409)
  poll.votes.push({ userId, optionId: option._id })
  const savedPoll = await poll.save()
  return formatPoll(savedPoll, userId)
}

export async function closePoll(poll, userId, member) {
  if (!poll.createdBy.equals(userId) && !isLeader(member)) throw pollError('Only the poll creator or workspace leader can close a poll', 403)
  poll.isClosed = true
  const savedPoll = await poll.save()
  return formatPoll(savedPoll, userId)
}

export async function deletePoll(poll, userId, member) {
  if (!poll.createdBy.equals(userId) && !isLeader(member)) throw pollError('Only the poll creator or workspace leader can delete a poll', 403)
  await poll.deleteOne()
}
