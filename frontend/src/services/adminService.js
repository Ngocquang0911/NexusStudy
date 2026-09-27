import api from './api.js'

export const getAdminOverview = () => api.get('/admin/overview')
export const listAdminUsers = (params) => api.get('/admin/users', { params })
export const updateAdminUserRole = (userId, systemRole) => api.patch(`/admin/users/${userId}/role`, { systemRole })
export const listAdminWorkspaces = (params) => api.get('/admin/workspaces', { params })