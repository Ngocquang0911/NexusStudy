import api from './api.js'

export const listDocuments = (workspaceId) => api.get(`/workspaces/${workspaceId}/documents`)
export const uploadDocument = (workspaceId, formData, onUploadProgress) =>
  api.post(`/workspaces/${workspaceId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
export const getDocument = (documentId) => api.get(`/documents/${documentId}`)
export const addDocumentLink = (workspaceId, payload) => api.post(`/workspaces/${workspaceId}/documents/link`, payload)
export const deleteDocument = (documentId) => api.delete(`/documents/${documentId}`)
