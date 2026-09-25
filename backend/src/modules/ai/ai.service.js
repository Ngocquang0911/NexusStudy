import OpenAI from 'openai'
import { env } from '../../config/env.js'
import { Document } from '../documents/Document.js'
import { Task } from '../tasks/Task.js'

function aiError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function createClient() {
  if (!env.aiApiKey) return null
  return new OpenAI({ apiKey: env.aiApiKey, baseURL: env.aiBaseUrl })
}

async function getAuthorizedDocuments(workspaceId, documentIds = []) {
  const filter = { workspaceId }
  if (documentIds.length) filter._id = { $in: documentIds }
  const documents = await Document.find(filter).select('fileName fileType fileUrl fileSize createdAt')
  if (documentIds.length && documents.length !== documentIds.length) throw aiError('One or more documents are not accessible in this workspace', 403)
  return documents
}

function contextFromDocuments(documents) {
  if (!documents.length) return 'No workspace documents were selected.'
  return documents.map((document) => `[Document: ${document.fileName}]\nFile type: ${document.fileType}\nStored reference: ${document.fileUrl}`).join('\n\n')
}

async function complete(systemPrompt, userPrompt) {
  const client = createClient()
  if (!client) return null
  const completion = await client.chat.completions.create({
    model: env.aiModel,
    temperature: 0.2,
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
  })
  return completion.choices[0]?.message?.content || ''
}

async function generateWorkspaceResponse({ workspaceId, documentIds, instruction, fallback }) {
  const documents = await getAuthorizedDocuments(workspaceId, documentIds)
  const context = contextFromDocuments(documents)
  const answer = await complete(
    'You are the NEXUS STUDY learning assistant. Support learning, do not claim unsupported facts, and clearly say when the provided workspace context is insufficient.',
    `${instruction}\n\nAuthorized workspace context:\n${context}`,
  )
  return { answer: answer || fallback, sourceDocuments: documents.map(({ _id, fileName }) => ({ id: _id, fileName })), provider: answer ? 'openai-compatible' : 'mock' }
}

export async function chat({ workspaceId, documentIds = [], question }) {
  if (!question?.trim()) throw aiError('Question is required', 400)
  return generateWorkspaceResponse({ workspaceId, documentIds, instruction: `Answer this academic question: ${question.trim()}`, fallback: `I can help explore this workspace, but no AI provider is configured. Your question was: ${question.trim()}` })
}

export async function summarize({ workspaceId, documentIds = [] }) {
  if (!documentIds.length) throw aiError('At least one document is required', 400)
  return generateWorkspaceResponse({ workspaceId, documentIds, instruction: 'Summarize the authorized documents into concise study notes with key ideas and open questions.', fallback: 'AI provider is not configured. The selected documents are authorized and ready for summarization.' })
}

export async function generateQuiz({ workspaceId, documentIds = [], count = 5 }) {
  if (!documentIds.length) throw aiError('At least one document is required', 400)
  const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20)
  return generateWorkspaceResponse({ workspaceId, documentIds, instruction: `Generate ${safeCount} draft quiz questions from the authorized documents. Include answers and mark the result as a draft for student review.`, fallback: `AI provider is not configured. A ${safeCount}-question quiz draft can be generated after an AI provider is connected.` })
}

export async function generateFlashcards({ workspaceId, documentIds = [], count = 10 }) {
  if (!documentIds.length) throw aiError('At least one document is required', 400)
  const safeCount = Math.min(Math.max(Number(count) || 10, 1), 50)
  return generateWorkspaceResponse({ workspaceId, documentIds, instruction: `Generate ${safeCount} draft flashcards as front/back pairs from the authorized documents.`, fallback: `AI provider is not configured. A ${safeCount}-card draft can be generated after an AI provider is connected.` })
}

export async function suggestTasks({ workspaceId }) {
  const tasks = await Task.find({ workspaceId }).select('title status priority deadline assignedTo progress').lean()
  const answer = await complete('You are a study project planning assistant. Suggest practical task distribution without making final decisions for students.', `Suggest task distribution improvements for this workspace task data:\n${JSON.stringify(tasks)}`)
  return { answer: answer || 'AI provider is not configured. Review open tasks, deadlines, priorities, and member workload manually.', taskCount: tasks.length, provider: answer ? 'openai-compatible' : 'mock' }
}
