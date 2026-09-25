import api from './api.js'

export const listChannels = (workspaceId) => api.get(`/workspaces/${workspaceId}/channels`)
export const createChannel = (workspaceId, payload) => api.post(`/workspaces/${workspaceId}/channels`, payload)
export const updateChannel = (channelId, payload) => api.put(`/channels/${channelId}`, payload)
export const deleteChannel = (channelId) => api.delete(`/channels/${channelId}`)

export const listMessages = (channelId, limit = 50) => api.get(`/channels/${channelId}/messages?limit=${limit}`)
export const sendMessage = (channelId, payload) => api.post(`/channels/${channelId}/messages`, payload)
export const editMessage = (messageId, payload) => api.put(`/messages/${messageId}`, payload)
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`)
export const togglePinMessage = (messageId) => api.put(`/messages/${messageId}/pin`)
export const searchMessages = (channelId, keyword) => api.get(`/channels/${channelId}/messages/search?q=${encodeURIComponent(keyword)}`)
