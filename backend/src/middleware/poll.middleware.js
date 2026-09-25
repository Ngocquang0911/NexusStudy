import mongoose from 'mongoose'
import { Poll } from '../modules/polls/Poll.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'

export async function requirePollMember(request, _response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      const error = new Error('Invalid poll id')
      error.statusCode = 400
      return next(error)
    }

    const poll = await Poll.findById(request.params.id)
    if (!poll) {
      const error = new Error('Poll not found')
      error.statusCode = 404
      return next(error)
    }

    const member = await WorkspaceMember.findOne({ workspaceId: poll.workspaceId, userId: request.auth.userId })
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    request.poll = poll
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}
