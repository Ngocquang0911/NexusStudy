const API_BASE = '/api/v1/ai'

export async function getAiStatus() {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) throw new Error('Unable to contact study assistant')
  return response.json()
}
