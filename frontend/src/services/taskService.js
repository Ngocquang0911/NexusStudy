import api from './api.js'

export const listTasks = (workspaceId) => api.get(`/workspaces/${workspaceId}/tasks`)
export const getTask = (taskId) => api.get(`/tasks/${taskId}`)
export const createTask = (payload) => api.post('/tasks', payload)
export const updateTask = (taskId, payload) => api.put(`/tasks/${taskId}`, payload)
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`)
export const updateTaskStatus = (taskId, status, progress) => api.put(`/tasks/${taskId}/status`, { status, progress })
export const assignTask = (taskId, assignedTo) => api.put(`/tasks/${taskId}/assign`, { assignedTo })
export const getWorkspaceProgress = (workspaceId) => api.get(`/workspaces/${workspaceId}/progress`)
