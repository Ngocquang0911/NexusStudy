import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'
import BrandLogo from '../../components/common/BrandLogo.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [error, setError] = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm()

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
    <div className="auth-page">
      <Link className="auth-brand" to="/" aria-label="Nexus Study home">
        <BrandLogo className="auth-brand-image" />
      </Link>
      <form className="auth-card" onSubmit={handleSubmit(onSubmit)}>
        <span className="eyebrow">START TOGETHER</span>
        <h1>Create your account</h1>
        <p>Set up your student account and start collaborating.</p>

        <label>
          Full name
          <input
            {...register('name', { required: 'Name is required' })}
            placeholder="Your full name"
          />
          {errors.name && <small className="field-error">{errors.name.message}</small>}
        </label>

        <label>
          Tài khoản đăng nhập (Username)
          <input
            {...register('username', {
              required: 'Tài khoản đăng nhập là bắt buộc',
              minLength: { value: 3, message: 'Tối thiểu 3 ký tự' },
              maxLength: { value: 30, message: 'Tối đa 30 ký tự' },
              pattern: {
                value: /^[a-zA-Z0-9_.]+$/,
                message: 'Chỉ chấp nhận chữ cái, số, dấu gạch dưới và dấu chấm',
              },
            })}
            placeholder="Chọn username đăng nhập (vd: quang_study)"
          />
          {errors.username && <small className="field-error">{errors.username.message}</small>}
        </label>

        <label>
          Email (bắt buộc để nhận mã xác thực)
          <input
            type="email"
            {...register('email', {
              required: 'Email là bắt buộc để xác thực tài khoản',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
            })}
            placeholder="you@university.edu"
          />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </label>

        <label>
          Password
          <input
            type="password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'At least 6 characters' },
            })}
            placeholder="At least 6 characters"
          />
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </label>

        <label>
          Confirm password
          <input
            type="password"
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
            placeholder="Repeat your password"
          />
          {errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-action auth-submit" type="submit">Create account</button>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
