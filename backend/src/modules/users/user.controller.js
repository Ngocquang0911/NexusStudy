import { changePassword, getUserModuleStatus, updateProfile } from './user.service.js'

async function handle(request, response, next, action, message) {
  try {
    const data = await action()
    response.json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function getUserModuleStatusResponse(_request, response) {
  response.json(getUserModuleStatus())
}

export function updateProfileController(request, response, next) {
  return handle(request, response, next, () => updateProfile(request.auth.userId, request.body), 'Profile updated')
}

export function changePasswordController(request, response, next) {
  return handle(request, response, next, () => changePassword(request.auth.userId, request.body), 'Password changed successfully')
}
