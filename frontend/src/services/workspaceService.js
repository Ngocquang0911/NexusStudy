import api from './api.js'

export const listWorkspaces = () => api.get('/workspaces')
export const createWorkspace = (payload) => api.post('/workspaces', payload)
export const getWorkspace = (workspaceId) => api.get(`/workspaces/${workspaceId}`)
export const getWorkspaceMembers = (workspaceId) => api.get(`/workspaces/${workspaceId}/members`)
export const inviteMember = (workspaceId, email) => api.post(`/workspaces/${workspaceId}/invite`, { email })
export const joinWorkspace = (inviteCode) => api.post('/workspaces/join', { inviteCode })
export const updateMemberRole = (workspaceId, userId, role) => api.put(`/workspaces/${workspaceId}/members/${userId}`, { role })
export const removeMember = (workspaceId, userId) => api.delete(`/workspaces/${workspaceId}/members/${userId}`)
