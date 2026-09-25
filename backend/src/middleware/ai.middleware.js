import mongoose from 'mongoose'
import { Document } from '../modules/documents/Document.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'

export async function requireAiWorkspaceMember(request, _response, next) {
  try {
    const workspaceId = request.body.workspaceId || request.params.workspaceId
    if (!mongoose.isValidObjectId(workspaceId)) {
      const error = new Error('A valid workspaceId is required')
      error.statusCode = 400
      return next(error)
    }
    const member = await WorkspaceMember.findOne({ workspaceId, userId: request.auth.userId })
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }
    request.aiWorkspaceId = workspaceId
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}

export async function validateAiDocuments(request, _response, next) {
  try {
    const documentIds = request.body.documentIds || []
    if (!Array.isArray(documentIds) || documentIds.some((id) => !mongoose.isValidObjectId(id))) {
      const error = new Error('documentIds must be an array of valid ids')
      error.statusCode = 400
      return next(error)
    }
    const documents = await Document.find({ _id: { $in: documentIds }, workspaceId: request.aiWorkspaceId }).select('_id')
    if (documents.length !== documentIds.length) {
      const error = new Error('One or more documents are not accessible in this workspace')
      error.statusCode = 403
      return next(error)
    }
    return next()
  } catch (error) {
    return next(error)
  }
}
