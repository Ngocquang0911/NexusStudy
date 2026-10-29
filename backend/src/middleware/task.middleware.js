import mongoose from 'mongoose'
import { Task } from '../modules/tasks/Task.js'
import { findActiveWorkspaceMember } from './workspace.middleware.js'

export async function requireTaskMember(request, _response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      const error = new Error('Invalid task id')
      error.statusCode = 400
      return next(error)
    }

    const task = await Task.findById(request.params.id)
    if (!task) {
      const error = new Error('Task not found')
      error.statusCode = 404
      return next(error)
    }

    const member = await findActiveWorkspaceMember(task.workspaceId, request.auth.userId)
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    request.task = task
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireTaskReminderManager(request, _response, next) {
  if (['OWNER', 'LEADER'].includes(request.workspaceMember?.role) || request.task.createdBy.equals(request.auth.userId)) {
    return next()
  }
  const error = new Error('Only a workspace leader or the task creator can manage reminders')
  error.statusCode = 403
  return next(error)
}
