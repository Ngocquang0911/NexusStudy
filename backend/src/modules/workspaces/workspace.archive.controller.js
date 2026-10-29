import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getDeletedWorkspaceDocument,
  listDeletedWorkspaceDocuments,
  listDeletedWorkspaces,
} from './workspace.archive.service.js'

async function handle(request, response, next, action, message) {
  try {
    const data = await action()
    response.json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function listDeleted(request, response, next) {
  return handle(
    request,
    response,
    next,
    () => listDeletedWorkspaces(request.auth.userId),
    'Deleted Spaces retrieved',
  )
}

export function listDeletedDocuments(request, response, next) {
  return handle(
    request,
    response,
    next,
    () => listDeletedWorkspaceDocuments(request.params.id, request.auth.userId),
    'Archived documents retrieved',
  )
}

export async function downloadDeletedDocument(request, response, next) {
  try {
    const document = await getDeletedWorkspaceDocument(
      request.params.id,
      request.params.documentId,
      request.auth.userId,
    )
    const filePath = fileURLToPath(new URL(`../../../uploads/${path.basename(document.fileUrl)}`, import.meta.url))
    response.download(filePath, document.fileName, (error) => {
      if (error && !response.headersSent) next(error)
    })
  } catch (error) {
    next(error)
  }
}
