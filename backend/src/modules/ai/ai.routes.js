import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireAiWorkspaceMember, validateAiDocuments } from '../../middleware/ai.middleware.js'
import { chatWithAssistant, createFlashcards, createQuiz, summarizeDocuments, taskSuggestion } from './ai.controller.js'

const router = Router()
router.use(requireAuth)
router.post('/ai/chat', requireAiWorkspaceMember, validateAiDocuments, chatWithAssistant)
router.post('/ai/summarize', requireAiWorkspaceMember, validateAiDocuments, summarizeDocuments)
router.post('/ai/generate-quiz', requireAiWorkspaceMember, validateAiDocuments, createQuiz)
router.post('/ai/generate-flashcards', requireAiWorkspaceMember, validateAiDocuments, createFlashcards)
router.post('/ai/task-suggestion', requireAiWorkspaceMember, taskSuggestion)

export default router
