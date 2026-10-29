import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { login, me, refresh, register, resendVerification, verify } from './auth.controller.js'
import {
	emailVerificationValidation,
	loginValidation,
	resendVerificationValidation,
	refreshValidation,
	registerValidation,
	validateRequest,
} from './auth.validation.js'

const router = Router()
router.post('/register', registerValidation, validateRequest, register)
router.post('/verify-email', emailVerificationValidation, validateRequest, verify)
router.post('/resend-verification', resendVerificationValidation, validateRequest, resendVerification)
router.post('/login', loginValidation, validateRequest, login)
router.get('/me', requireAuth, me)
router.post('/refresh', refreshValidation, validateRequest, refresh)

export default router
