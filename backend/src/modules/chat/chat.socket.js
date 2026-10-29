import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from '../workspaces/Workspace.js'
import { findActiveWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { Channel } from './Channel.js'
import { Message } from './Message.js'
import { createMessage, markChannelAsRead, pinMessage } from './chat.service.js'

function socketError(message) {
  const error = new Error(message)
  error.statusCode = 403
  return error
}

async function getMember(workspaceId, userId) {
  return findActiveWorkspaceMember(workspaceId, userId)
}

export async function revokeWorkspaceSockets(io, workspaceId) {
  const workspaceRoom = `workspace:${workspaceId}`
  const channels = await Channel.find({ workspaceId }).select('_id')
  const rooms = [workspaceRoom, ...channels.map(({ _id }) => `channel:${_id}`)]
  const sockets = await Promise.all(rooms.map((room) => io.in(room).fetchSockets()))
  const recipients = new Map(sockets.flat().map((socket) => [socket.id, socket]))
  const event = { workspaceId: String(workspaceId) }
  recipients.forEach((socket) => socket.emit('workspaceDeleted', event))
  await Promise.all(rooms.map((room) => io.in(room).socketsLeave(room)))
}

function validId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
}

function canAccessChannel(channel, userId) {
  return !channel.isPrivate || channel.createdBy.equals(userId) || channel.allowedMembers?.some((id) => id.equals(userId))
}

export async function emitAuthorizedChannelEvent(io, channelId, event, payload, { excludeSocketId } = {}) {
  const channel = await Channel.findById(channelId)
  if (!channel) return
  const workspace = await Workspace.findOne({ _id: channel.workspaceId, ...ACTIVE_WORKSPACE_QUERY }).select('_id')
  if (!workspace) return
  const [members, sockets] = await Promise.all([
    WorkspaceMember.find({ workspaceId: channel.workspaceId }).select('userId').lean(),
    io.in(`channel:${channelId}`).fetchSockets(),
  ])
  const memberIds = new Set(members.map(({ userId }) => userId.toString()))
  for (const recipient of sockets) {
    if (recipient.id === excludeSocketId) continue
    const userId = recipient.auth?.userId
    if (userId && memberIds.has(userId.toString()) && canAccessChannel(channel, userId)) {
      recipient.emit(event, payload)
    }
  }
}

function reportSocketError(error, acknowledge) {
  console.error('Chat socket operation failed', { errorName: error.name, errorMessage: error.message })
  acknowledge?.({
    success: false,
    message: error.statusCode && error.statusCode < 500 ? error.message : 'Unable to complete chat operation',
  })
}

export function setupSocket(server) {
  const io = new Server(server, { cors: { origin: env.clientUrl } })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
    if (!token) return next(socketError('Authentication required'))
    try {
      const payload = jwt.verify(token, env.jwtSecret)
      if (payload.tokenType !== 'access') return next(socketError('Access token required'))
      socket.auth = payload
      return next()
    } catch (_error) {
      return next(socketError('Invalid or expired access token'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('joinWorkspace', async (payload = {}, acknowledge) => {
      try {
        const workspaceId = payload?.workspaceId
        if (!validId(workspaceId)) return acknowledge?.({ success: false, message: 'Invalid workspace id' })
        const member = await getMember(workspaceId, socket.auth.userId)
        if (!member) return acknowledge?.({ success: false, message: 'Workspace membership required' })
        socket.join(`workspace:${workspaceId}`)
        acknowledge?.({ success: true })
      } catch (error) {
        reportSocketError(error, acknowledge)
      }
    })

    socket.on('joinChannel', async (payload = {}, acknowledge) => {
      try {
        const channelId = payload?.channelId
        if (!validId(channelId)) return acknowledge?.({ success: false, message: 'Invalid channel id' })
        const channel = await Channel.findById(channelId)
        const member = channel && await getMember(channel.workspaceId, socket.auth.userId)
        if (!member || !canAccessChannel(channel, socket.auth.userId)) return acknowledge?.({ success: false, message: 'Channel access denied' })
        socket.join(`channel:${channelId}`)
        await markChannelAsRead(channelId, socket.auth.userId)
        await emitAuthorizedChannelEvent(io, channelId, 'channelRead', { channelId, userId: socket.auth.userId })
        acknowledge?.({ success: true })
      } catch (error) {
        reportSocketError(error, acknowledge)
      }
    })

    socket.on('readChannel', async (payload = {}) => {
      try {
        const channelId = payload?.channelId
        if (!validId(channelId)) return
        const channel = await Channel.findById(channelId)
        const member = channel && await getMember(channel.workspaceId, socket.auth.userId)
        if (!channel || !member || !canAccessChannel(channel, socket.auth.userId)) return
        await markChannelAsRead(channelId, socket.auth.userId)
        await emitAuthorizedChannelEvent(io, channelId, 'channelRead', { channelId, userId: socket.auth.userId })
      } catch (error) {
        reportSocketError(error)
      }
    })

    socket.on('sendMessage', async (payload = {}, acknowledge) => {
      try {
        const { channelId, content, attachments } = payload || {}
        if (!validId(channelId)) return acknowledge?.({ success: false, message: 'Invalid channel id' })
        const channel = await Channel.findById(channelId)
        const member = channel && await getMember(channel.workspaceId, socket.auth.userId)
        if (!channel || !member || !canAccessChannel(channel, socket.auth.userId)) return acknowledge?.({ success: false, message: 'Channel access denied' })
        const message = await createMessage(channel, socket.auth.userId, { content, attachments })
        await emitAuthorizedChannelEvent(io, channelId, 'receiveMessage', message)
        acknowledge?.({ success: true, data: message })
      } catch (error) {
        reportSocketError(error, acknowledge)
      }
    })

    for (const event of ['typing', 'stopTyping']) {
      socket.on(event, async (payload = {}) => {
        try {
          const channelId = payload?.channelId
          if (!validId(channelId)) return
          const channel = await Channel.findById(channelId)
          const member = channel && await getMember(channel.workspaceId, socket.auth.userId)
          if (channel && member && canAccessChannel(channel, socket.auth.userId)) {
            await emitAuthorizedChannelEvent(io, channelId, event, { userId: socket.auth.userId }, { excludeSocketId: socket.id })
          }
        } catch (error) {
          reportSocketError(error)
        }
      })
    }

    socket.on('pinMessage', async (payload = {}, acknowledge) => {
      try {
        const messageId = payload?.messageId
        if (!validId(messageId)) return acknowledge?.({ success: false, message: 'Invalid message id' })
        const message = await Message.findById(messageId)
        const member = message && await getMember(message.workspaceId, socket.auth.userId)
        const channel = message && await Channel.findById(message.channelId)
        if (!message || !member || !channel || !canAccessChannel(channel, socket.auth.userId)) {
          return acknowledge?.({ success: false, message: 'Message access denied' })
        }
        const pinnedMessage = await pinMessage(messageId, member)
        await emitAuthorizedChannelEvent(io, message.channelId, 'messagePinned', pinnedMessage)
        acknowledge?.({ success: true, data: pinnedMessage })
      } catch (error) {
        reportSocketError(error, acknowledge)
      }
    })
  })

  return io
}
