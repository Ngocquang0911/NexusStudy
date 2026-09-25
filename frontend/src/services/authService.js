import api from './api.js'

export const login = (payload) => api.post('/auth/login', payload)
export const register = (payload) => api.post('/auth/register', payload)
export const getCurrentUser = () => api.get('/auth/me')
