import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requirePollMember } from '../../middleware/poll.middleware.js'
import { requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { close, create, getOne, list, remove, vote } from './poll.controller.js'

const router = Router()
router.use(requireAuth)
router.post('/workspaces/:workspaceId/polls', requireWorkspaceMember, create)
router.get('/workspaces/:workspaceId/polls', requireWorkspaceMember, list)
router.get('/polls/:id', requirePollMember, getOne)
router.post('/polls/:id/vote', requirePollMember, vote)
router.put('/polls/:id/close', requirePollMember, close)
router.delete('/polls/:id', requirePollMember, remove)

export default router
