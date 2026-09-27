import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm()
  async function onSubmit(values) { try { const user = await login(values); navigate(user.systemRole === 'ADMIN' ? '/admin' : '/dashboard') } catch (error) { setError(error.response?.data?.message || 'Unable to log in') } }
  const [error, setError] = useState('')
  return <div className="auth-page"><div className="auth-brand"><div className="brand-mark">N</div><strong>NEXUS STUDY</strong></div><form className="auth-card" onSubmit={handleSubmit(onSubmit)}><span className="eyebrow">WELCOME BACK</span><h1>Log in to your workspace</h1><p>Pick up where your study group left off.</p><label>Email<input type="email" {...register('email', { required: 'Email is required' })} placeholder="you@university.edu" />{errors.email && <small className="field-error">{errors.email.message}</small>}</label><label>Password<input type="password" {...register('password', { required: 'Password is required' })} placeholder="Your password" />{errors.password && <small className="field-error">{errors.password.message}</small>}</label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-action auth-submit" type="submit">Log in</button><p className="auth-switch">New to NEXUS? <Link to="/register">Create an account</Link></p></form></div>
}
