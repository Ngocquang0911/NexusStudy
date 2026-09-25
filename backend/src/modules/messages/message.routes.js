import { Router } from 'express'
import { getMessageModuleStatusResponse } from './message.controller.js'

const router = Router()
router.get('/status', getMessageModuleStatusResponse)

export default router
