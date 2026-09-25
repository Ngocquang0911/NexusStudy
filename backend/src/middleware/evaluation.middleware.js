import mongoose from 'mongoose'
import { Evaluation } from '../modules/evaluations/Evaluation.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'

export async function requireEvaluationMember(request, _response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      const error = new Error('Invalid evaluation id')
      error.statusCode = 400
      return next(error)
    }

    const evaluation = await Evaluation.findById(request.params.id)
    if (!evaluation) {
      const error = new Error('Evaluation not found')
      error.statusCode = 404
      return next(error)
    }

    const member = await WorkspaceMember.findOne({ workspaceId: evaluation.workspaceId, userId: request.auth.userId })
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    request.evaluation = evaluation
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}
