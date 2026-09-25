const API_BASE = '/api/v1/messages'

export async function getChatStatus() {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) throw new Error('Unable to load messages')
  return response.json()
}
