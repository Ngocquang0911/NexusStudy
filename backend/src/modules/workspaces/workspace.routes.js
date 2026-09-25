import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireWorkspaceLeader, requireWorkspaceMember, requireWorkspaceOwner } from '../../middleware/workspace.middleware.js'
import {
	changeMemberRole,
	create,
	getOne,
	invite,
	join,
	list,
	members,
	remove,
	removeMemberFromWorkspace,
	update,
} from './workspace.controller.js'

const router = Router()

router.use(requireAuth)
router.post('/', create)
router.get('/', list)
router.post('/join', join)
router.post('/:id/join', join)
router.get('/:id', requireWorkspaceMember, getOne)
router.put('/:id', requireWorkspaceMember, requireWorkspaceLeader, update)
router.delete('/:id', requireWorkspaceMember, requireWorkspaceOwner, remove)
router.post('/:id/invite', requireWorkspaceMember, requireWorkspaceLeader, invite)
router.get('/:id/members', requireWorkspaceMember, members)
router.put('/:id/members/:userId', requireWorkspaceMember, requireWorkspaceLeader, changeMemberRole)
router.delete('/:id/members/:userId', requireWorkspaceMember, requireWorkspaceLeader, removeMemberFromWorkspace)

export default router
