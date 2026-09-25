import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { env } from '../../config/env.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Channel } from './Channel.js'
import { Message } from './Message.js'
import { createMessage, markChannelAsRead, pinMessage } from './chat.service.js'

function socketError(message) {
  const error = new Error(message)
  error.statusCode = 403
  return error
}

async function getMember(workspaceId, userId) {
  return WorkspaceMember.findOne({ workspaceId, userId })
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
    socket.on('joinWorkspace', async ({ workspaceId }, acknowledge) => {
      const member = await getMember(workspaceId, socket.auth.userId)
      if (!member) return acknowledge?.({ success: false, message: 'Workspace membership required' })
      socket.join(`workspace:${workspaceId}`)
      acknowledge?.({ success: true })
    })

    socket.on('joinChannel', async ({ channelId }, acknowledge) => {
      const channel = await Channel.findById(channelId)
      const member = channel && await getMember(channel.workspaceId, socket.auth.userId)
      if (!member) return acknowledge?.({ success: false, message: 'Channel access denied' })
      socket.join(`channel:${channelId}`)
      await markChannelAsRead(channelId, socket.auth.userId)
      io.to(`channel:${channelId}`).emit('channelRead', { channelId, userId: socket.auth.userId })
      acknowledge?.({ success: true })
    })

    socket.on('readChannel', async ({ channelId }) => {
      await markChannelAsRead(channelId, socket.auth.userId)
      io.to(`channel:${channelId}`).emit('channelRead', { channelId, userId: socket.auth.userId })
    })

    socket.on('sendMessage', async ({ channelId, content, attachments }, acknowledge) => {
      try {
        const channel = await Channel.findById(channelId)
        const member = channel && await getMember(channel.workspaceId, socket.auth.userId)
        if (!channel || !member) return acknowledge?.({ success: false, message: 'Channel access denied' })
        const message = await createMessage(channel, socket.auth.userId, { content, attachments })
        io.to(`channel:${channelId}`).emit('receiveMessage', message)
        acknowledge?.({ success: true, data: message })
      } catch (error) {
        acknowledge?.({ success: false, message: error.message })
      }
    })

    socket.on('typing', ({ channelId }) => socket.to(`channel:${channelId}`).emit('typing', { userId: socket.auth.userId }))
    socket.on('stopTyping', ({ channelId }) => socket.to(`channel:${channelId}`).emit('stopTyping', { userId: socket.auth.userId }))

    socket.on('pinMessage', async ({ messageId }, acknowledge) => {
      try {
        const message = await Message.findById(messageId)
        const member = message && await getMember(message.workspaceId, socket.auth.userId)
        if (!message || !member) return acknowledge?.({ success: false, message: 'Message access denied' })
        const pinnedMessage = await pinMessage(messageId, member)
        io.to(`channel:${message.channelId}`).emit('messagePinned', pinnedMessage)
        acknowledge?.({ success: true, data: pinnedMessage })
      } catch (error) {
        acknowledge?.({ success: false, message: error.message })
      }
    })
  })

  return io
}
