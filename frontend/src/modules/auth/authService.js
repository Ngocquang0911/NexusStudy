const API_BASE = '/api/auth'

export async function login(credentials) {
  const response = await fetch(`${API_BASE}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
  if (!response.ok) throw new Error('Unable to log in')
  return response.json()
}

export async function register(payload) {
  const response = await fetch(`${API_BASE}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error('Unable to register')
  return response.json()
}
