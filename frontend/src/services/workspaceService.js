import api from './api.js'
import { rememberWorkspaceHeader, forgetWorkspaceHeader } from '../utils/workspaceHeaderCache.js'

export const listWorkspaces = () => api.get('/workspaces')
export const createWorkspace = (payload) => api.post('/workspaces', payload)
export const getWorkspace = (workspaceId) => api.get(`/workspaces/${workspaceId}`).then((response) => { rememberWorkspaceHeader(workspaceId, response.data.data); return response }).catch((error) => { forgetWorkspaceHeader(workspaceId); throw error })
export const uploadWorkspaceAvatar = (workspaceId, file) => { const form = new FormData(); form.append('avatar', file); return api.put(`/workspaces/${workspaceId}/avatar`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((response) => { forgetWorkspaceHeader(workspaceId); return response }) }
export const updateWorkspace = (workspaceId, payload) => api.put(`/workspaces/${workspaceId}`, payload).then((response) => { forgetWorkspaceHeader(workspaceId); return response })
export const deleteWorkspace = (workspaceId) => api.delete(`/workspaces/${workspaceId}`).then((response) => { forgetWorkspaceHeader(workspaceId); return response })
export const listDeletedWorkspaces = () => api.get('/workspaces/deleted-spaces')
export const listDeletedWorkspaceDocuments = (workspaceId) => api.get(`/workspaces/deleted-spaces/${workspaceId}/documents`)
export const downloadDeletedWorkspaceDocument = (workspaceId, documentId) =>
  api.get(`/workspaces/deleted-spaces/${workspaceId}/documents/${documentId}/download`, { responseType: 'blob' })
export const getWorkspaceMembers = (workspaceId) => api.get(`/workspaces/${workspaceId}/members`)
export const getWorkspaceInvitations = (workspaceId) => api.get(`/workspaces/${workspaceId}/invitations`)
export const inviteMember = (workspaceId, email) => api.post(`/workspaces/${workspaceId}/invite`, { email })
export const listInvitations = () => api.get('/workspaces/invitations')
export const acceptInvitation = (invitationId) => api.post(`/workspaces/invitations/${invitationId}/accept`)
export const declineInvitation = (invitationId) => api.post(`/workspaces/invitations/${invitationId}/decline`)
export const cancelInvitation = (workspaceId, invitationId) => api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`)
export const updateMemberRole = (workspaceId, userId, role) => api.put(`/workspaces/${workspaceId}/members/${userId}`, { role })
export const removeMember = (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`)
