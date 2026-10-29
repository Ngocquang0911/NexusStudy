import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import adminRoutes from './modules/admin/admin.routes.js'
import authRoutes from './modules/auth/auth.routes.js'
import chatRoutes from './modules/chat/chat.routes.js'
import documentRoutes from './modules/documents/document.routes.js'
import evaluationRoutes from './modules/evaluations/evaluation.routes.js'
import aiRoutes from './modules/ai/ai.routes.js'
import pollRoutes from './modules/polls/poll.routes.js'
import taskRoutes from './modules/tasks/task.routes.js'
import notificationRoutes from './modules/notifications/notification.routes.js'
import workspaceRoutes from './modules/workspaces/workspace.routes.js'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.clientUrl }))
  app.use(express.json())
  app.get('/api/health', (_request, response) => {
    response.json({
      success: true,
      message: 'NEXUS STUDY API is healthy',
      data: {
        service: 'nexus-study-api',
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/api', chatRoutes)
  app.use('/api', documentRoutes)
  app.use('/api', evaluationRoutes)
  app.use('/api', aiRoutes)
  app.use('/api', pollRoutes)
  app.use('/api/workspaces', workspaceRoutes)
  app.use('/api', taskRoutes)
  app.use('/api', notificationRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
