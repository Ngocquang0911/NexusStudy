import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'
import BrandLogo from '../../components/common/BrandLogo.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [error, setError] = useState('')

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
    <div className="auth-page">
      <Link className="auth-brand" to="/" aria-label="Nexus Study home">
        <BrandLogo className="auth-brand-image" />
      </Link>
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <span className="eyebrow">WELCOME BACK</span>
        <h1>Log in to your workspace</h1>
        <p>Pick up where your study group left off.</p>
        <label>
          Tài khoản đăng nhập (Username)
          <input
            type="text"
            autoComplete="username"
            {...register('username', { required: 'Tài khoản đăng nhập là bắt buộc' })}
            placeholder="Nhập username của bạn"
          />
          {errors.username && <small className="field-error">{errors.username.message}</small>}
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            {...register('password', { required: 'Password is required' })}
            placeholder="Your password"
          />
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {verificationEmail && (
          <p style={{ marginTop: '10px', fontSize: '13px' }}>
            Tài khoản chưa xác thực email.{' '}
            <Link to={`/verify-email?email=${encodeURIComponent(verificationEmail)}`} style={{ color: 'var(--landing-purple, #6548c7)', fontWeight: 600 }}>
              Xác thực email ngay →
            </Link>
          </p>
        )}
        <button className="primary-action auth-submit" type="submit">Log in</button>
        <p className="auth-switch">New to NEXUS? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  )
}
