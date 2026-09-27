import { Router } from 'express'
import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js'
import { changeUserRole, overview, users, workspaces } from './admin.controller.js'

const router = Router()

router.use(requireAuth, requireAdmin)
router.get('/overview', overview)
router.get('/users', users)
router.patch('/users/:userId/role', changeUserRole)
router.get('/workspaces', workspaces)

export default router