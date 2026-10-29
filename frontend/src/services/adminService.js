import api from './api.js'

export const getAdminOverview = (range = '30d') => api.get('/admin/overview', { params: { range } })
export const listAdminUsers = (params) => api.get('/admin/users', { params })
export const updateAdminUserRole = (userId, systemRole, reason) => api.patch(`/admin/users/${userId}/role`, { systemRole, reason })
export const updateAdminUserPlan = (userId, subscriptionPlan, reason) => api.patch(`/admin/users/${userId}/plan`, { subscriptionPlan, reason })
export const listAdminWorkspaces = (params) => api.get('/admin/workspaces', { params })
export const getAdminWorkspace = (workspaceId) => api.get(`/admin/workspaces/${workspaceId}`)