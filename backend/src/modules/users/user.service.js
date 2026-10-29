import bcrypt from 'bcryptjs'
import { User } from './User.js'
import { validatePasswordChange, validateProfileUpdate } from './user.validation.js'

function userError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function getUserModuleStatus() {
  return { module: 'users', status: 'ready' }
}

export async function updateProfile(userId, payload) {
  const updates = validateProfileUpdate(payload)
  const user = await User.findById(userId)
  if (!user) throw userError('User not found', 404)

  if (updates.name !== undefined) user.name = updates.name
  if (updates.avatar !== undefined) user.avatar = updates.avatar
  if (updates.bio !== undefined) user.bio = updates.bio

  return user.save()
}

export async function changePassword(userId, payload) {
  const { currentPassword, newPassword } = validatePasswordChange(payload)

  const user = await User.findById(userId).select('+password')
  if (!user) throw userError('User not found', 404)

  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) throw userError('Incorrect current password', 400)

  user.password = await bcrypt.hash(newPassword, 10)
  await user.save()
}
