import mongoose from 'mongoose'
import { Task } from '../modules/tasks/Task.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'

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

    const member = await WorkspaceMember.findOne({ workspaceId: task.workspaceId, userId: request.auth.userId })
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
