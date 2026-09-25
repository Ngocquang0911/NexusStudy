import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js'
import { User } from '../users/User.js'

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

export async function registerUser({ name, email, password }) {
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    const error = new Error('Email is already registered')
    error.statusCode = 409
    throw error
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await User.create({ name, email, password: hashedPassword })
  return authenticationResult(user)
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+password')
  const passwordMatches = user && await bcrypt.compare(password, user.password)
  if (!passwordMatches) {
    const error = new Error('Invalid email or password')
    error.statusCode = 401
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
