import api from './api.js'

export const askAi = (payload) => api.post('/ai/chat', payload)
export const summarizeDocument = (payload) => api.post('/ai/summarize', payload)
export const generateQuiz = (payload) => api.post('/ai/generate-quiz', payload)
export const generateFlashcards = (payload) => api.post('/ai/generate-flashcards', payload)
export const suggestTaskDistribution = (payload) => api.post('/ai/task-suggestion', payload)
