import mongoose from 'mongoose'
import { Channel } from './Channel.js'
import { Message } from './Message.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { assertPremiumWorkspace, getWorkspacePlan, PLAN_LIMITS } from '../plans/plan.service.js'

function serviceError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function canModerate(member) {
  return ['OWNER', 'LEADER'].includes(member?.role)
}

export async function listChannels(workspaceId, userId) {
  const filter = { workspaceId, $or: [{ isPrivate: false }, { allowedMembers: userId }, { createdBy: userId }] }
  return Channel.find(filter).populate('createdBy', 'name email').sort({ createdAt: 1 })
}

export async function createChannel(workspaceId, userId, payload) {
  await assertPremiumWorkspace(workspaceId, 'Creating additional channels requires the workspace owner to have a Premium plan')
  const selectedMembers = payload.allowedMembers ?? []
  if (!Array.isArray(selectedMembers) || selectedMembers.some((id) => !mongoose.isValidObjectId(id))) {
    throw serviceError('Private channel members must be valid workspace user ids', 400)
  }
  const requestedMembers = [...new Set([userId, ...selectedMembers.map(String)])]
  if (payload.isPrivate && requestedMembers.length > 1) {
    const workspaceMemberCount = await WorkspaceMember.countDocuments({
      workspaceId,
      userId: { $in: requestedMembers },
    })
    if (workspaceMemberCount !== requestedMembers.length) {
      throw serviceError('All private channel members must belong to this workspace', 400)
    }
  }
  return Channel.create({
    workspaceId,
    name: payload.name,
    description: payload.description || '',
    createdBy: userId,
    isPrivate: Boolean(payload.isPrivate),
    allowedMembers: payload.isPrivate ? requestedMembers : [],
  })
}

export async function updateChannel(channel, member, payload) {
  if (!canModerate(member) && !channel.createdBy.equals(member.userId)) {
    throw serviceError('Only the channel creator or workspace leader can update this channel', 403)
  }
  if (payload.name !== undefined) channel.name = payload.name
  if (payload.description !== undefined) channel.description = payload.description
  if (payload.isPrivate !== undefined) channel.isPrivate = Boolean(payload.isPrivate)
  return channel.save()
}

export async function deleteChannel(channel, member) {
  if (!canModerate(member)) throw serviceError('Only workspace leaders can delete channels', 403)
  await Message.updateMany({ channelId: channel._id, deletedAt: null }, { deletedAt: new Date(), content: '[Channel deleted]' })
  await channel.deleteOne()
}

export async function listMessages(channelId, limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)
  return Message.find({ channelId, deletedAt: null })
    .populate('senderId', 'name email avatar')
    .populate('readBy', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(safeLimit)
}

export async function createMessage(channel, userId, payload) {
  if (!payload.content?.trim()) throw serviceError('Message content is required', 400)
  const created = await Message.create({
    workspaceId: channel.workspaceId,
    channelId: channel._id,
    senderId: userId,
    content: payload.content.trim(),
    attachments: payload.attachments || [],
    readBy: [userId],
  })
  return Message.findById(created._id)
    .populate('senderId', 'name email avatar')
    .populate('readBy', 'name email avatar')
}

export async function markChannelAsRead(channelId, userId) {
  await Message.updateMany(
    { channelId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  )
  return listMessages(channelId)
}

export async function updateMessage(messageId, userId, member, payload) {
  const message = await Message.findById(messageId)
  if (!message || message.deletedAt) throw serviceError('Message not found', 404)
  if (!canModerate(member) && !message.senderId.equals(userId)) throw serviceError('You can only edit your own messages', 403)
  if (payload.content !== undefined) {
    if (!payload.content.trim()) throw serviceError('Message content is required', 400)
    message.content = payload.content.trim()
  }
  return message.save().then((savedMessage) => savedMessage.populate('senderId', 'name email avatar').populate('readBy', 'name email avatar'))
}

export async function deleteMessage(messageId, userId, member) {
  const message = await Message.findById(messageId)
  if (!message || message.deletedAt) throw serviceError('Message not found', 404)
  if (!canModerate(member) && !message.senderId.equals(userId)) throw serviceError('You can only delete your own messages', 403)
  message.deletedAt = new Date()
  message.content = '[Message deleted]'
  await message.save()
}

export async function pinMessage(messageId, member) {
  if (!canModerate(member)) throw serviceError('Only workspace leaders can pin messages', 403)
  const message = await Message.findOne({ _id: messageId, deletedAt: null })
  if (!message) throw serviceError('Message not found', 404)
  if (!message.isPinned) {
    const plan = await getWorkspacePlan(message.workspaceId)
    const pinCount = await Message.countDocuments({ workspaceId: message.workspaceId, isPinned: true, deletedAt: null })
    if (pinCount >= PLAN_LIMITS[plan].maxPinnedMessages) {
      throw serviceError(`${plan === 'FREE' ? 'Free' : 'Premium'} workspaces can pin up to ${PLAN_LIMITS[plan].maxPinnedMessages} messages`, 403)
    }
  }
  message.isPinned = !message.isPinned
  return message.save().then((savedMessage) => savedMessage.populate('senderId', 'name email avatar').populate('readBy', 'name email avatar'))
}

export async function searchMessages(channelId, keyword) {
  if (!keyword?.trim()) throw serviceError('Search keyword is required', 400)
  return Message.find({ channelId, deletedAt: null, $text: { $search: keyword.trim() } })
    .populate('senderId', 'name email avatar')
    .populate('readBy', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(100)
}

export function isValidObjectId(value) {
  return mongoose.isValidObjectId(value)
}
