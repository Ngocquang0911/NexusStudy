import { Router } from 'express'
import { requireAdmin, requireAuth } from '../../middleware/auth.middleware.js'
import { changeSubscriptionPlan, changeUserRole, overview, users, workspaceDetails, workspaces } from './admin.controller.js'

const router = Router()

router.use(requireAuth, requireAdmin)
router.get('/overview', overview)
router.get('/users', users)
router.patch('/users/:userId/role', changeUserRole)
router.patch('/users/:userId/plan', changeSubscriptionPlan)
router.get('/workspaces', workspaces)
router.get('/workspaces/:workspaceId', workspaceDetails)

export default router