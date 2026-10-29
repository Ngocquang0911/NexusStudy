import mongoose from 'mongoose'
import { Evaluation } from '../modules/evaluations/Evaluation.js'
import { findActiveWorkspaceMember } from './workspace.middleware.js'

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

    const member = await findActiveWorkspaceMember(evaluation.workspaceId, request.auth.userId)
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    if (!evaluation.evaluatorId.equals(request.auth.userId)) {
      const error = new Error('Only the evaluator can view this evaluation')
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
