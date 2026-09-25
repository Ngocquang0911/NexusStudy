import { createEvaluation, getReport, listEvaluations, listMyEvaluations } from './evaluation.service.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function create(request, response, next) {
  return handle(request, response, next, () => createEvaluation(request.params.workspaceId, request.auth.userId, request.body), 'Evaluation submitted', 201)
}

export function list(request, response, next) {
  return handle(request, response, next, () => listEvaluations(request.params.workspaceId, request.workspaceMember), 'Evaluations retrieved')
}

export function mine(request, response, next) {
  return handle(request, response, next, () => listMyEvaluations(request.params.workspaceId, request.auth.userId), 'Your evaluations retrieved')
}

export function report(request, response, next) {
  return handle(request, response, next, () => getReport(request.params.workspaceId), 'Evaluation report retrieved')
}
