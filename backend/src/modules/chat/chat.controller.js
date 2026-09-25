import {
  createChannel,
  createMessage,
  deleteChannel,
  deleteMessage,
  listChannels,
  listMessages,
  pinMessage,
  searchMessages,
  updateChannel,
  updateMessage,
} from './chat.service.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function getChannels(request, response, next) {
  return handle(request, response, next, () => listChannels(request.params.workspaceId), 'Channels retrieved')
}

export function create(request, response, next) {
  return handle(request, response, next, () => createChannel(request.params.workspaceId, request.auth.userId, request.body), 'Channel created', 201)
}

export function update(request, response, next) {
  return handle(request, response, next, () => updateChannel(request.channel, request.workspaceMember, request.body), 'Channel updated')
}

export function remove(request, response, next) {
  return handle(request, response, next, () => deleteChannel(request.channel, request.workspaceMember), 'Channel deleted')
}

export function getMessages(request, response, next) {
  return handle(request, response, next, () => listMessages(request.channel._id, request.query.limit), 'Messages retrieved')
}

export function sendMessage(request, response, next) {
  return handle(request, response, next, () => createMessage(request.channel, request.auth.userId, request.body), 'Message created', 201)
}

export function editMessage(request, response, next) {
  return handle(request, response, next, () => updateMessage(request.params.id, request.auth.userId, request.workspaceMember, request.body), 'Message updated')
}

export function removeMessage(request, response, next) {
  return handle(request, response, next, () => deleteMessage(request.params.id, request.auth.userId, request.workspaceMember), 'Message deleted')
}

export function togglePin(request, response, next) {
  return handle(request, response, next, () => pinMessage(request.params.id, request.workspaceMember), 'Message pin updated')
}

export function search(request, response, next) {
  return handle(request, response, next, () => searchMessages(request.channel._id, request.query.q), 'Messages searched')
}
