const WORKSPACE_UPDATE_LIMITS = {
  name: 120,
  description: 1000,
  avatar: 2048,
}

export function validateWorkspaceUpdate(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw invalidWorkspaceUpdate('Workspace update must be an object')
  }

  const fields = Object.keys(payload)
  if (!fields.length) throw invalidWorkspaceUpdate('At least one workspace field must be updated')

  const unknownFields = fields.filter((field) => !Object.hasOwn(WORKSPACE_UPDATE_LIMITS, field))
  if (unknownFields.length) {
    throw invalidWorkspaceUpdate(`Unsupported workspace field: ${unknownFields[0]}`)
  }

  const update = {}
  for (const field of fields) {
    const value = payload[field]
    if (typeof value !== 'string') {
      throw invalidWorkspaceUpdate(`${field} must be a string`)
    }

    const normalizedValue = value.trim()
    if (field === 'name' && !normalizedValue) {
      throw invalidWorkspaceUpdate('Workspace name cannot be empty')
    }
    if (normalizedValue.length > WORKSPACE_UPDATE_LIMITS[field]) {
      throw invalidWorkspaceUpdate(`${field} cannot exceed ${WORKSPACE_UPDATE_LIMITS[field]} characters`)
    }

    update[field] = normalizedValue
  }

  return update
}

function invalidWorkspaceUpdate(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}
