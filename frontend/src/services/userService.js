import api from './api.js'

export const getProfile = () => api.get('/auth/me')
export const updateProfile = (payload) => api.put('/users/profile', payload)
export const changePassword = (payload) => api.put('/users/password', payload)
