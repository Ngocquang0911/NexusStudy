import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireWorkspaceLeader, requireWorkspaceMember, requireWorkspaceOwner } from '../../middleware/workspace.middleware.js'
import { downloadDeletedDocument, listDeleted, listDeletedDocuments } from './workspace.archive.controller.js'
import {
	changeMemberRole,
	acceptInvitation,
	cancelInvitation,
	create,
	declineInvitation,
	getOne,
	invite,
	join,
	list,
	members,
	myInvitations,
	remove,
	removeMemberFromWorkspace,
	update,
	workspaceInvitations,
} from './workspace.controller.js'

const router = Router()

router.use(requireAuth)
router.post('/', create)
router.get('/', list)
router.get('/invitations', myInvitations)
router.get('/deleted-spaces', listDeleted)
router.get('/deleted-spaces/:id/documents', listDeletedDocuments)
router.get('/deleted-spaces/:id/documents/:documentId/download', downloadDeletedDocument)
router.post('/invitations/:invitationId/accept', acceptInvitation)
router.post('/invitations/:invitationId/decline', declineInvitation)
router.post('/join', join)
router.post('/:id/join', join)
router.get('/:id', requireWorkspaceMember, getOne)
router.put('/:id', requireWorkspaceMember, requireWorkspaceLeader, update)
router.delete('/:id', requireWorkspaceMember, requireWorkspaceOwner, remove)
router.post('/:id/invite', requireWorkspaceMember, requireWorkspaceLeader, invite)
router.get('/:id/invitations', requireWorkspaceMember, workspaceInvitations)
router.delete('/:id/invitations/:invitationId', requireWorkspaceMember, requireWorkspaceLeader, cancelInvitation)
router.get('/:id/members', requireWorkspaceMember, members)
router.put('/:id/members/:userId', requireWorkspaceMember, requireWorkspaceLeader, changeMemberRole)
router.delete('/:id/members/:userId', requireWorkspaceMember, requireWorkspaceLeader, removeMemberFromWorkspace)

export default router
