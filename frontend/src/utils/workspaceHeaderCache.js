import { getToken } from './storage.js'

// Short-lived display cache; every page still revalidates membership with the API.
let sessionToken = null
const entries = new Map()

function currentEntries() {
  const token = getToken()
  if (token !== sessionToken) { entries.clear(); sessionToken = token }
  return token ? entries : null
}

export function readWorkspaceHeader(id) { return id ? currentEntries()?.get(id) || null : null }
export function rememberWorkspaceHeader(id, workspace) {
  if (id && workspace) currentEntries()?.set(id, workspace)
}
export function forgetWorkspaceHeader(id) { currentEntries()?.delete(id) }
