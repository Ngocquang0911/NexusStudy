import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), systemRole: user.systemRole, tokenType: 'access' },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

export function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), systemRole: user.systemRole, tokenType: 'refresh' },
    env.jwtSecret,
    { expiresIn: env.jwtRefreshExpiresIn },
  )
}
