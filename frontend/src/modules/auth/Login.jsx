import { useState } from 'react'
import { login } from './authService.js'

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try { onSuccess?.(await login({ email, password })) } catch (requestError) { setError(requestError.message) }
  }

  return <form onSubmit={handleSubmit}><h1>Log in</h1><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p role="alert">{error}</p>}<button type="submit">Log in</button></form>
}
