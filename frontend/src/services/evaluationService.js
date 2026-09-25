import api from './api.js'

export const submitEvaluation = (workspaceId, payload) => api.post(`/workspaces/${workspaceId}/evaluations`, payload)
export const getMyEvaluations = (workspaceId) => api.get(`/workspaces/${workspaceId}/evaluations/me`)
export const listEvaluations = (workspaceId) => api.get(`/workspaces/${workspaceId}/evaluations`)
export const getEvaluationReport = (workspaceId) => api.get(`/workspaces/${workspaceId}/evaluations/report`)
