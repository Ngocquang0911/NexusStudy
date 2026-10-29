import { body, validationResult } from 'express-validator'

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_.]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and dots'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .isByteLength({ max: 72 })
    .withMessage('Password cannot exceed 72 UTF-8 bytes'),
]

export const loginValidation = [
  body('username')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty'),
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty'),
  body().custom((value) => {
    if (!value.username && !value.email && !value.account) {
      throw new Error('Username or email is required')
    }
    return true
  }),
  body('password').notEmpty().withMessage('Password is required'),
]

export const emailVerificationValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Enter the 6-digit verification code'),
]

export const resendVerificationValidation = [
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
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
