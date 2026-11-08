import api from './api.js'
export const getPremiumRequest = () => api.get('/premium/request')
export const submitPremiumRequest = (plan) => api.post('/premium/request', { plan })
export const listPremiumRequests = () => api.get('/admin/premium-requests')
export const reviewPremiumRequest = (id) => api.patch(`/admin/premium-requests/${id}/review`)
