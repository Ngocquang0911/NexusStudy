import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { requireDocumentMember } from '../../middleware/document.middleware.js'
import { documentUpload } from '../../middleware/upload.middleware.js'
import { requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { addLink, download, getOne, list, remove, upload } from './document.controller.js'

const router = Router()

router.use(requireAuth)
router.post('/workspaces/:workspaceId/documents/link', requireWorkspaceMember, addLink)
router.post('/workspaces/:workspaceId/documents', requireWorkspaceMember, documentUpload, upload)
router.get('/workspaces/:workspaceId/documents', requireWorkspaceMember, list)
router.get('/documents/:id', requireDocumentMember, getOne)
router.get('/documents/:id/download', requireDocumentMember, download)
router.delete('/documents/:id', requireDocumentMember, remove)

export default router
