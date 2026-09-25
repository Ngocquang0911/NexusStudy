import {
  assignTask,
  createTask,
  deleteTask,
  getTask,
  getWorkspaceProgress,
  listTasks,
  updateTask,
  updateTaskStatus,
} from './task.service.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function create(request, response, next) {
  return handle(request, response, next, () => createTask(request.auth.userId, request.body.workspaceId, request.body, request.workspaceMember), 'Task created', 201)
}

export function list(request, response, next) {
  return handle(request, response, next, () => listTasks(request.params.workspaceId), 'Tasks retrieved')
}

export function getOne(request, response, next) {
  return handle(request, response, next, () => getTask(request.params.id), 'Task retrieved')
}

export function update(request, response, next) {
  return handle(request, response, next, () => updateTask(request.task, request.auth.userId, request.workspaceMember, request.body), 'Task updated')
}

export function updateStatus(request, response, next) {
  return handle(request, response, next, () => updateTaskStatus(request.task, request.auth.userId, request.workspaceMember, request.body.status, request.body.progress), 'Task status updated')
}

export function assign(request, response, next) {
  return handle(request, response, next, () => assignTask(request.task, request.workspaceMember, request.body.assignedTo), 'Task assigned')
}

export function remove(request, response, next) {
  return handle(request, response, next, () => deleteTask(request.task, request.workspaceMember), 'Task deleted')
}

export function progress(request, response, next) {
  return handle(request, response, next, () => getWorkspaceProgress(request.params.workspaceId), 'Workspace progress retrieved')
}
