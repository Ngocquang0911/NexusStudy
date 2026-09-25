const API_BASE = '/api/v1/polls'

export async function getPollStatus() {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) throw new Error('Unable to load polls')
  return response.json()
}
