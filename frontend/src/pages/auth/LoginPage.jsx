import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [verificationEmail, setVerificationEmail] = useState('')
  async function onSubmit(values) {
    setError('')
    setVerificationEmail('')
    try {
      const identifier = (values.username || values.email || '').trim()
      const user = await login({ username: identifier, password: values.password })
      navigate(user.systemRole === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to log in')
      if (requestError.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        const email = requestError.response?.data?.email || values.username || ''
        setVerificationEmail(email)
      }
    }
  }

  return (
    <AuthLayout mode="login">
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <span className="eyebrow">YOUR STUDY SPACE AWAITS</span>
        <h1>Welcome back<span className="auth-welcome-dot">.</span></h1>
        <p>Log in to pick up where you and your study group left off.</p>
        <label>
          Username or email
          <input
            type="text"
            autoComplete="username"
            {...register('username', { required: 'Username or email is required', validate: (value) => Boolean(value.trim()) || 'Username or email is required' })}
            placeholder="Username or email"
          />
          {errors.username && <small className="field-error">{errors.username.message}</small>}
        </label>
        <label>
          Password
          <span className="auth-password-field"><input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            {...register('password', { required: 'Password is required' })}
            placeholder="Your password"
          /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {verificationEmail && (
          <p style={{ marginTop: '10px', fontSize: '13px' }}>
            Your email has not been verified.{' '}
            <Link to={`/verify-email?email=${encodeURIComponent(verificationEmail)}`} style={{ color: 'var(--landing-purple, #6548c7)', fontWeight: 600 }}>
              Verify your email →
            </Link>
          </p>
        )}
        <button className="primary-action auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Logging in…' : 'Log in'} {!isSubmitting && <ArrowRight size={16} />}</button>
        <p className="auth-switch">New to NEXUS? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthLayout>
  )
}
