import { useState } from 'react'
import { register } from './authService.js'

export default function Register({ onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  async function handleSubmit(event) { event.preventDefault(); setError(''); try { onSuccess?.(await register(form)) } catch (requestError) { setError(requestError.message) } }
  return <form onSubmit={handleSubmit}><h1>Create account</h1><label>Name<input value={form.name} onChange={update('name')} required /></label><label>Email<input type="email" value={form.email} onChange={update('email')} required /></label><label>Password<input type="password" value={form.password} onChange={update('password')} required /></label>{error && <p role="alert">{error}</p>}<button type="submit">Register</button></form>
}
