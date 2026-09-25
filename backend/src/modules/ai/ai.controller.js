import { chat, generateFlashcards, generateQuiz, suggestTasks, summarize } from './ai.service.js'

async function handle(request, response, next, action, message) {
  try {
    const data = await action()
    response.json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function chatWithAssistant(request, response, next) {
  return handle(request, response, next, () => chat({ workspaceId: request.aiWorkspaceId, documentIds: request.body.documentIds, question: request.body.question }), 'AI response generated')
}

export function summarizeDocuments(request, response, next) {
  return handle(request, response, next, () => summarize({ workspaceId: request.aiWorkspaceId, documentIds: request.body.documentIds }), 'Document summary generated')
}

export function createQuiz(request, response, next) {
  return handle(request, response, next, () => generateQuiz({ workspaceId: request.aiWorkspaceId, documentIds: request.body.documentIds, count: request.body.count }), 'Quiz draft generated')
}

export function createFlashcards(request, response, next) {
  return handle(request, response, next, () => generateFlashcards({ workspaceId: request.aiWorkspaceId, documentIds: request.body.documentIds, count: request.body.count }), 'Flashcard draft generated')
}

export function taskSuggestion(request, response, next) {
  return handle(request, response, next, () => suggestTasks({ workspaceId: request.aiWorkspaceId }), 'Task suggestions generated')
}
