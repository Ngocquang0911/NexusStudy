import api from './api.js'
export const submitReport = (workspaceId, payload) => api.post(`/workspaces/${workspaceId}/reports`, payload)
export const listReports = (status = 'OPEN', page = 1) => api.get('/admin/reports', { params: { status, page } })
export const resolveReport = (id, status, resolution) => api.patch(`/admin/reports/${id}`, { status, resolution })
export const setUserLock = (id, locked, reason) => api.patch(`/admin/users/${id}/lock`, { locked, reason })
export const deleteAdminWorkspace = (id, reason) => api.delete(`/admin/workspaces/${id}`, { data: { reason } })
