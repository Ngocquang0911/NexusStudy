import bcrypt from 'bcryptjs'
import { User } from './User.js'

function userError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function getUserModuleStatus() {
  return { module: 'users', status: 'ready' }
}

export async function updateProfile(userId, payload) {
  const user = await User.findById(userId)
  if (!user) throw userError('User not found', 404)

  if (payload.name !== undefined) user.name = payload.name.trim()
  if (payload.avatar !== undefined) user.avatar = payload.avatar.trim()
  if (payload.bio !== undefined) user.bio = payload.bio.trim()

  return user.save()
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) throw userError('Current and new password are required', 400)
  if (newPassword.length < 6) throw userError('New password must be at least 6 characters', 400)

  const user = await User.findById(userId).select('+password')
  if (!user) throw userError('User not found', 404)

  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) throw userError('Incorrect current password', 400)

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()
}
