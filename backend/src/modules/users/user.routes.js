import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { changePasswordController, getUserModuleStatusResponse, updateProfileController } from './user.controller.js'

const router = Router()

router.get('/status', getUserModuleStatusResponse)
router.use(requireAuth)
router.put('/profile', updateProfileController)
router.put('/password', changePasswordController)

export default router
