import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDocument, createLinkDocument, deleteDocument, getDocument, listDocuments } from './document.service.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function upload(request, response, next) {
  return handle(request, response, next, () => createDocument(request.params.workspaceId, request.auth.userId, request.file), 'Document uploaded', 201)
}

export function addLink(request, response, next) {
  return handle(request, response, next, () => createLinkDocument(request.params.workspaceId, request.auth.userId, request.body), 'Link added', 201)
}

export function list(request, response, next) {
  return handle(request, response, next, () => listDocuments(request.params.workspaceId), 'Documents retrieved')
}

export function getOne(request, response, next) {
  return handle(request, response, next, () => getDocument(request.document), 'Document retrieved')
}

export function download(request, response, next) {
  try {
    const doc = request.document
    const filePath = fileURLToPath(new URL(`../../../uploads/${path.basename(doc.fileUrl)}`, import.meta.url))
    response.download(filePath, doc.fileName)
  } catch (error) {
    next(error)
  }
}

export function remove(request, response, next) {
  return handle(request, response, next, () => deleteDocument(request.document, request.auth.userId, request.workspaceMember), 'Document deleted')
}
