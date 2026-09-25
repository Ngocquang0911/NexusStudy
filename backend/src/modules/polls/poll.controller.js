import { closePoll, createPoll, deletePoll, getPoll, listPolls, votePoll } from './poll.service.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function list(request, response, next) {
  return handle(request, response, next, () => listPolls(request.params.workspaceId, request.auth.userId), 'Polls retrieved')
}

export function create(request, response, next) {
  return handle(request, response, next, () => createPoll(request.auth.userId, request.params.workspaceId, request.body), 'Poll created', 201)
}

export function getOne(request, response, next) {
  return handle(request, response, next, () => getPoll(request.poll, request.auth.userId), 'Poll retrieved')
}

export function vote(request, response, next) {
  return handle(request, response, next, () => votePoll(request.poll, request.auth.userId, request.body.optionId), 'Vote recorded')
}

export function close(request, response, next) {
  return handle(request, response, next, () => closePoll(request.poll, request.auth.userId, request.workspaceMember), 'Poll closed')
}

export function remove(request, response, next) {
  return handle(request, response, next, () => deletePoll(request.poll, request.auth.userId, request.workspaceMember), 'Poll deleted')
}
