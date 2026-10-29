import api from './api.js'

export const login = (payload) => api.post('/auth/login', payload)
export const register = (payload) => api.post('/auth/register', payload)
export const verifyEmail = (payload) => api.post('/auth/verify-email', payload)
export const resendVerification = (email) => api.post('/auth/resend-verification', { email })
export const getCurrentUser = () => api.get('/auth/me')
