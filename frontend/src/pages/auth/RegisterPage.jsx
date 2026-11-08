import { useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ mode: 'onTouched' })

  async function onSubmit(values) {
    setError('')
    try {
      await registerUser({
        name: values.name.trim(),
        username: values.username.trim().toLowerCase(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      navigate(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}`)
    } catch (requestError) {
      if (['VERIFICATION_EMAIL_SEND_FAILED', 'VERIFICATION_RATE_LIMITED'].includes(requestError.response?.data?.code)) {
        navigate(`/verify-email?email=${encodeURIComponent(values.email.trim().toLowerCase())}&delivery=failed`)
        return
      }
      setError(requestError.response?.data?.message || 'Unable to create account')
    }
  }

  return (
    <AuthLayout mode="register">
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <span className="eyebrow">START TOGETHER</span>
        <h1>Create your account</h1>
        <p>Join your team and bring your study plans together.</p>

        <label>
          Full name
          <input
            autoComplete="name"
            {...register('name', { required: 'Name is required', validate: (value) => Boolean(value.trim()) || 'Name is required' })}
            placeholder="Your full name"
          />
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>

        <label>
          Username
          <input
            autoComplete="username"
            {...register('username', {
              required: 'Username is required',
              minLength: { value: 3, message: 'At least 3 characters' },
              maxLength: { value: 30, message: 'No more than 30 characters' },
              pattern: {
                value: /^[a-zA-Z0-9_.]+$/,
                message: 'Use letters, numbers, underscores or dots',
              },
            })}
            placeholder="e.g. quang_study"
          />
          {errors.username && <small className="field-error">{errors.username.message}</small>}
        </label>

        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
            })}
            placeholder="you@university.edu"
          />
          <small className="auth-field-hint">We’ll send a verification code to this email.</small>
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </label>

        <label>
          Password
          <span className="auth-password-field"><input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'At least 6 characters' },
              validate: (value) => new TextEncoder().encode(value).length <= 72 || 'Password must be no more than 72 UTF-8 bytes',
            })}
            placeholder="At least 6 characters"
          /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          {errors.password ? <small className="field-error" role="alert">{errors.password.message}</small> : <small className="auth-field-hint">Use at least 6 characters.</small>}
        </label>

        <label>
          Confirm password
          <span className="auth-password-field"><input
            type={showConfirmation ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
            placeholder="Repeat your password"
          /><button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmation}>{showConfirmation ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          {errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-action auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'} {!isSubmitting && <ArrowRight size={16} />}</button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </AuthLayout>
  )
}
