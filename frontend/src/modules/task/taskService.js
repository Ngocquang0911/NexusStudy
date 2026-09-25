const API_BASE = '/api/v1/tasks'

export async function getTaskStatus() {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) throw new Error('Unable to load tasks')
  return response.json()
}
