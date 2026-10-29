import api from './api.js'

export const listNotifications = () => api.get('/notifications')
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.patch('/notifications/read-all')
export const dismissNotification = (id) => api.delete(`/notifications/${id}`)
