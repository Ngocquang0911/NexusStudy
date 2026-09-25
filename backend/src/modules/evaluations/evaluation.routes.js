import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireEvaluationMember } from '../../middleware/evaluation.middleware.js'
import { requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { create, list, mine, report } from './evaluation.controller.js'

const router = Router()
router.use(requireAuth)
router.post('/workspaces/:workspaceId/evaluations', requireWorkspaceMember, create)
router.get('/workspaces/:workspaceId/evaluations', requireWorkspaceMember, list)
router.get('/workspaces/:workspaceId/evaluations/me', requireWorkspaceMember, mine)
router.get('/workspaces/:workspaceId/evaluations/report', requireWorkspaceMember, report)
router.get('/evaluations/:id', requireEvaluationMember, (request, response) => response.json({ success: true, data: request.evaluation }))

export default router
