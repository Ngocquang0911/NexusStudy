import mongoose from 'mongoose'
import { Document } from '../modules/documents/Document.js'
import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'

export async function requireDocumentMember(request, _response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      const error = new Error('Invalid document id')
      error.statusCode = 400
      return next(error)
    }

    const document = await Document.findById(request.params.id)
    if (!document) {
      const error = new Error('Document not found')
      error.statusCode = 404
      return next(error)
    }

    const member = await WorkspaceMember.findOne({ workspaceId: document.workspaceId, userId: request.auth.userId })
    if (!member) {
      const error = new Error('Workspace membership required')
      error.statusCode = 403
      return next(error)
    }

    request.document = document
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}
