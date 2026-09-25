import api from './api.js'

export const listPolls = (workspaceId) => api.get(`/workspaces/${workspaceId}/polls`)
export const createPoll = (workspaceId, payload) => api.post(`/workspaces/${workspaceId}/polls`, payload)
export const getPoll = (pollId) => api.get(`/polls/${pollId}`)
export const votePoll = (pollId, optionId) => api.post(`/polls/${pollId}/vote`, { optionId })
export const closePoll = (pollId) => api.put(`/polls/${pollId}/close`)
export const deletePoll = (pollId) => api.delete(`/polls/${pollId}`)
