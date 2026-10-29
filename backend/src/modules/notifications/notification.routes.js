import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { dismiss, list, markAllRead, markRead } from './notification.controller.js'

const router = Router()

router.use(requireAuth)
router.get('/notifications', list)
router.patch('/notifications/read-all', markAllRead)
router.patch('/notifications/:id/read', markRead)
router.delete('/notifications/:id', dismiss)

export default router
