import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireTaskMember } from '../../middleware/task.middleware.js'
import { requireWorkspaceLeader, requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { assign, create, getOne, list, progress, remove, update, updateStatus } from './task.controller.js'

const router = Router()

router.use(requireAuth)
router.post('/tasks', requireWorkspaceMember, create)
router.get('/workspaces/:workspaceId/tasks', requireWorkspaceMember, list)
router.get('/workspaces/:workspaceId/progress', requireWorkspaceMember, progress)
router.get('/tasks/:id', requireTaskMember, getOne)
router.put('/tasks/:id', requireTaskMember, update)
router.delete('/tasks/:id', requireTaskMember, requireWorkspaceLeader, remove)
router.put('/tasks/:id/status', requireTaskMember, updateStatus)
router.put('/tasks/:id/assign', requireTaskMember, requireWorkspaceLeader, assign)

export default router
