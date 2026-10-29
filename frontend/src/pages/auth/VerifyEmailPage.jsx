import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'
import BrandLogo from '../../components/common/BrandLogo.jsx'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { verifyEmail, resendVerification } = useAuth()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(
    searchParams.get('delivery') === 'failed'
      ? 'Your account was created, but we could not deliver the email. Request a new code to continue.'
      : '',
  )
  const [resending, setResending] = useState(false)
  const email = searchParams.get('email') || ''
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email, code: '' },
  })
  const currentEmail = watch('email')

  async function onSubmit(values) {
    setError('')
    try {
      const user = await verifyEmail({ email: values.email, code: values.code })
      navigate(user.systemRole === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to verify this email address.')
    }
  }

  async function handleResend() {
    if (!currentEmail || resending) return
    setError('')
    setNotice('')
    setResending(true)
    try {
      await resendVerification(currentEmail)
      setNotice('If this account needs verification, a new code has been sent.')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send a verification code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-page">
      <Link className="auth-brand" to="/" aria-label="Nexus Study home">
        <BrandLogo className="auth-brand-image" />
      </Link>
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <span className="eyebrow">EMAIL VERIFICATION</span>
        <h1>Check your email</h1>
        <p>Enter the 6-digit code we sent to your email address. The code expires in 15 minutes.</p>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
            })}
            placeholder="you@university.edu"
          />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </label>
        <label>
          Verification code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            {...register('code', {
              required: 'Verification code is required',
              pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit code' },
            })}
            placeholder="000000"
          />
          {errors.code && <small className="field-error">{errors.code.message}</small>}
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="inline-success" role="status">{notice}</p>}
        <button className="primary-action auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying...' : 'Verify email'}
        </button>
        <button className="secondary-action auth-resend" type="button" onClick={handleResend} disabled={!currentEmail || resending}>
          {resending ? 'Sending...' : 'Resend verification code'}
        </button>
        <p className="auth-switch">Already verified? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
