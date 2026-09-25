import {
  getCurrentUser,
  loginUser,
  refreshAccessToken,
  registerUser,
} from './auth.service.js'

export async function register(request, response, next) {
  try {
    const data = await registerUser(request.body)
    response.status(201).json({ success: true, message: 'Registration successful', data })
  } catch (error) {
    next(error)
  }
}

export async function login(request, response, next) {
  try {
    const data = await loginUser(request.body)
    response.json({ success: true, message: 'Login successful', data })
  } catch (error) {
    next(error)
  }
}

export async function refresh(request, response, next) {
  try {
    const data = await refreshAccessToken(request.body.refreshToken)
    response.json({ success: true, message: 'Access token refreshed', data })
  } catch (error) {
    next(error)
  }
}

export async function me(request, response, next) {
  try {
    const data = await getCurrentUser(request.auth.userId)
    response.json({ success: true, message: 'Current user retrieved', data })
  } catch (error) {
    next(error)
  }
}
