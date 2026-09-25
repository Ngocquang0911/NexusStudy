import { body, validationResult } from 'express-validator'

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]

export const loginValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
]

export const refreshValidation = [
  body('refreshToken').isString().notEmpty().withMessage('Refresh token is required'),
]

export function validateRequest(request, _response, next) {
  const errors = validationResult(request)
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed')
    error.statusCode = 400
    error.details = errors.array().map(({ path, msg }) => ({ field: path, message: msg }))
    return next(error)
  }
  return next()
}
