const API_BASE = '/api/v1/evaluations'

export async function getEvaluationStatus() {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) throw new Error('Unable to load evaluations')
  return response.json()
}
