import mongoose from 'mongoose'
import { Channel } from '../modules/chat/Channel.js'
import { Message } from '../modules/chat/Message.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'

export async function requireChannelMember(request, _response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id || request.params.channelId)) {
      const error = new Error('Invalid channel id')
      error.statusCode = 400
      return next(error)
    }

    const channelId = request.params.channelId || request.params.id
    const channel = await Channel.findById(channelId)
    if (!channel) {
      const error = new Error('Channel not found')
      error.statusCode = 404
      return next(error)
    }

    const member = await WorkspaceMember.findOne({ workspaceId: channel.workspaceId, userId: request.auth.userId })
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    request.channel = channel
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}

export async function requireMessageMember(request, _response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      const error = new Error('Invalid message id')
      error.statusCode = 400
      return next(error)
    }

    const message = await Message.findById(request.params.id)
    if (!message) {
      const error = new Error('Message not found')
      error.statusCode = 404
      return next(error)
    }

    const member = await WorkspaceMember.findOne({ workspaceId: message.workspaceId, userId: request.auth.userId })
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    request.message = message
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}
