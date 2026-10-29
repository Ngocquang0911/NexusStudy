import bcrypt from 'bcryptjs'
import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js'
import { User } from '../users/User.js'
import { isSmtpConfigured, sendEmailVerification } from '../notifications/email.service.js'

const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000
const VERIFICATION_RESEND_INTERVAL_MS = 60 * 1000
const MAX_VERIFICATION_ATTEMPTS = 5

function authError(message, statusCode, code) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

function hashVerificationCode(code) {
  return createHash('sha256').update(code).digest('hex')
}

async function issueVerificationCode(user, { enforceCooldown = false } = {}) {
  if (!isSmtpConfigured()) {
    throw authError('Email verification requires SMTP configuration on the server.', 503, 'SMTP_NOT_CONFIGURED')
  }
  const now = new Date()
  if (enforceCooldown && user.emailVerificationSentAt
      && now.getTime() - user.emailVerificationSentAt.getTime() < VERIFICATION_RESEND_INTERVAL_MS) {
    throw authError('Please wait before requesting another verification email.', 429, 'VERIFICATION_RATE_LIMITED')
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  user.emailVerificationCodeHash = hashVerificationCode(code)
  user.emailVerificationExpiresAt = new Date(now.getTime() + VERIFICATION_CODE_TTL_MS)
  user.emailVerificationSentAt = now
  user.emailVerificationAttempts = 0
  await user.save()
  try {
    await sendEmailVerification({ to: user.email, code })
  } catch (error) {
    user.emailVerificationSentAt = undefined
    await user.save()
    const isAuthenticationFailure = error.code === 'EAUTH'
      || [534, 535].includes(Number(error.responseCode))
    const deliveryError = isAuthenticationFailure
      ? authError(
        'Gmail rejected the SMTP login. Use a Google App Password (not your Google account password), then restart the backend.',
        502,
        'SMTP_AUTH_FAILED',
      )
      : authError(
        'We could not connect to the email provider. Check the server network and SMTP settings, then try again.',
        error.statusCode || 502,
        error.code || 'SMTP_DELIVERY_FAILED',
      )
    deliveryError.cause = error
    throw deliveryError
  }
}

function publicUser(user) {
  const returnedUser = user.toJSON ? user.toJSON() : { ...user }
  delete returnedUser.password
  return returnedUser
}

function authenticationResult(user) {
  return {
    user: publicUser(user),
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  }
}

export async function registerUser({ name, username, email, password }) {
  if (!isSmtpConfigured()) {
    throw authError('Email verification is unavailable. Configure SMTP on the server before registering.', 503, 'SMTP_NOT_CONFIGURED')
  }

  const normalizedUsername = (username || '').trim().toLowerCase()
  const normalizedEmail = (email || '').trim().toLowerCase()

  if (!normalizedUsername) {
    const error = new Error('Username is required')
    error.statusCode = 400
    throw error
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    const error = new Error('Username must be between 3 and 30 characters')
    error.statusCode = 400
    throw error
  }

  if (!/^[a-zA-Z0-9_.]+$/.test(normalizedUsername)) {
    const error = new Error('Username can only contain letters, numbers, underscores, and dots')
    error.statusCode = 400
    throw error
  }

  const existingByUsername = await User.findOne({ username: normalizedUsername })
  if (existingByUsername && existingByUsername.email !== normalizedEmail) {
    const error = new Error('Username is already taken')
    error.statusCode = 409
    throw error
  }

  const existingUser = await User.findOne({ email: normalizedEmail })
    .select('+password +emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationSentAt')
  if (existingUser) {
    if (!existingUser.emailVerified && await bcrypt.compare(password, existingUser.password)) {
      if (existingUser.username !== normalizedUsername && !existingByUsername) {
        existingUser.username = normalizedUsername
      }
      await issueVerificationCode(existingUser, { enforceCooldown: true })
      return { email: existingUser.email, username: existingUser.username, verificationRequired: true }
    }
    const error = new Error('Email is already registered')
    error.statusCode = 409
    throw error
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await User.create({
    name,
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
    emailVerified: false,
  })
  try {
    await issueVerificationCode(user)
  } catch (error) {
    if (error.code === 'SMTP_NOT_CONFIGURED') throw error
    error.code = 'VERIFICATION_EMAIL_SEND_FAILED'
    error.statusCode = 502
    error.message = 'Your account was created, but the verification email could not be sent. Request a new code to continue.'
    throw error
  }
  return { email: user.email, username: user.username, verificationRequired: true }
}

export async function verifyEmail({ email, code }) {
  const user = await User.findOneAndUpdate(
    {
      email,
      emailVerified: false,
      emailVerificationExpiresAt: { $gt: new Date() },
      emailVerificationAttempts: { $lt: MAX_VERIFICATION_ATTEMPTS },
    },
    { $inc: { emailVerificationAttempts: 1 } },
    { new: true },
  ).select('+emailVerificationCodeHash +emailVerificationExpiresAt')
  if (!user) throw authError('Invalid or expired verification code.', 400, 'INVALID_VERIFICATION_CODE')
  const submittedHash = Buffer.from(hashVerificationCode(code), 'hex')
  const storedHash = user.emailVerificationCodeHash
    ? Buffer.from(user.emailVerificationCodeHash, 'hex')
    : Buffer.alloc(submittedHash.length)
  const matches = storedHash.length === submittedHash.length && timingSafeEqual(storedHash, submittedHash)
  if (!matches || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt <= new Date()) {
    throw authError('Invalid or expired verification code.', 400, 'INVALID_VERIFICATION_CODE')
  }
  const verifiedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      emailVerified: false,
      emailVerificationCodeHash: user.emailVerificationCodeHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    },
    {
      $set: { emailVerified: true },
      $unset: {
        emailVerificationCodeHash: 1,
        emailVerificationExpiresAt: 1,
        emailVerificationSentAt: 1,
        emailVerificationAttempts: 1,
      },
    },
    { new: true },
  )
  if (!verifiedUser) throw authError('Invalid or expired verification code.', 400, 'INVALID_VERIFICATION_CODE')
  return authenticationResult(verifiedUser)
}

export async function resendVerificationEmail({ email }) {
  const user = await User.findOne({ email })
    .select('+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationSentAt')
  if (!user || user.emailVerified) return { email, verificationRequired: true }
  await issueVerificationCode(user, { enforceCooldown: true })
  return { email: user.email, verificationRequired: true }
}

export async function loginUser({ username, email, account, password }) {
  const identifier = (username || account || email || '').trim().toLowerCase()
  if (!identifier) {
    const error = new Error('Username or email is required')
    error.statusCode = 400
    throw error
  }

  const user = await User.findOne({
    $or: [
      { username: identifier },
      { email: identifier },
    ],
  }).select('+password')

  const passwordMatches = user && await bcrypt.compare(password, user.password)
  if (!passwordMatches) {
    const error = new Error('Invalid username, email, or password')
    error.statusCode = 401
    throw error
  }
  if (!user.emailVerified) {
    const error = authError('Verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED')
    error.email = user.email
    throw error
  }
  return authenticationResult(user)
}

export async function refreshAccessToken(refreshToken) {
  let payload
  try {
    payload = jwt.verify(refreshToken, env.jwtSecret)
  } catch (_error) {
    const error = new Error('Invalid or expired refresh token')
    error.statusCode = 401
    throw error
  }

  if (payload.tokenType !== 'refresh') {
    const error = new Error('Refresh token required')
    error.statusCode = 401
    throw error
  }

  const user = await User.findById(payload.userId)
  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 401
    throw error
  }

  return { accessToken: generateAccessToken(user) }
}

export async function getCurrentUser(userId) {
  const user = await User.findById(userId)
  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }
  return publicUser(user)
}
