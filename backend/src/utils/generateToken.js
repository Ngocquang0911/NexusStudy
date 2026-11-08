import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), systemRole: user.systemRole, tokenType: 'access', tokenVersion: user.tokenVersion || 0 },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), systemRole: user.systemRole, tokenType: 'refresh', tokenVersion: user.tokenVersion || 0 },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn },
  )
}
