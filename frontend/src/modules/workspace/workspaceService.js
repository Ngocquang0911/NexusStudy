const API_BASE = '/api/v1/workspaces'

export async function getDemoWorkspace() {
  const response = await fetch(`${API_BASE}/demo`)
  if (!response.ok) throw new Error('Unable to load workspace')
  return response.json()
}
