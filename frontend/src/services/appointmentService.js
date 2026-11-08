import api from './api.js'

export const listAppointments = (workspaceId) => api.get(`/workspaces/${workspaceId}/appointments`)
export const createAppointment = (workspaceId, payload) => api.post(`/workspaces/${workspaceId}/appointments`, payload)
export const updateAppointment = (appointmentId, payload) => api.put(`/appointments/${appointmentId}`, payload)
export const deleteAppointment = (appointmentId) => api.delete(`/appointments/${appointmentId}`)
