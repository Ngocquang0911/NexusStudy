const PROFILE_LIMITS = {
  name: 80,
  avatar: 2048,
  bio: 500,
}

export function validateProfileUpdate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw validationError('Profile update must be an object')
  }

  const fields = Object.keys(payload)
  if (!fields.length) throw validationError('At least one profile field must be updated')
  const unsupportedField = fields.find((field) => !Object.hasOwn(PROFILE_LIMITS, field))
  if (unsupportedField) throw validationError(`Unsupported profile field: ${unsupportedField}`)

  const update = {}
  for (const field of fields) {
    if (typeof payload[field] !== 'string') {
      throw validationError(`${field} must be a string`)
    }

    const value = payload[field].trim()
    if (field === 'name' && (value.length < 2 || value.length > PROFILE_LIMITS.name)) {
      throw validationError(`Name must be between 2 and ${PROFILE_LIMITS.name} characters`)
    }
    if (value.length > PROFILE_LIMITS[field]) {
      throw validationError(`${field} cannot exceed ${PROFILE_LIMITS[field]} characters`)
    }
    if (field === 'avatar' && value) {
      let avatarUrl
      try {
        avatarUrl = new URL(value)
      } catch {
        throw validationError('Avatar must be a valid HTTP or HTTPS URL')
      }
      if (!['http:', 'https:'].includes(avatarUrl.protocol)) {
        throw validationError('Avatar must be a valid HTTP or HTTPS URL')
      }
    }

    update[field] = value
  }

  return update
}

export function validatePasswordChange(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw validationError('Password update must be an object')
  }

  const { currentPassword, newPassword } = payload
  if (typeof currentPassword !== 'string' || !currentPassword) {
    throw validationError('Current password is required')
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    throw validationError('New password must be at least 6 characters')
  }
  if (Buffer.byteLength(newPassword, 'utf8') > 72) {
    throw validationError('New password cannot exceed 72 UTF-8 bytes')
  }

  return { currentPassword, newPassword }
}

function validationError(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}
