import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../modules/users/User.js'

export function requireAuth(request, _response, next) {
  const authorization = request.headers.authorization
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice(7)
    : (request.query?.token || null)

  if (!token) {
    const error = new Error('Authentication required')
    error.statusCode = 401
    return next(error)
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (payload.tokenType !== 'access') {
      const error = new Error('Access token required')
      error.statusCode = 401
      return next(error)
    }
    request.auth = payload
    return next()
  } catch (_error) {
    const error = new Error('Invalid or expired access token')
    error.statusCode = 401
    return next(error)
  }
}

export async function requireAdmin(request, _response, next) {
  try {
    const user = await User.findById(request.auth.userId).select('systemRole')
    if (user?.systemRole !== 'ADMIN') {
      const error = new Error('Administrator access required')
      error.statusCode = 403
      return next(error)
    }
    return next()
  } catch (error) {
    return next(error)
  }
}
