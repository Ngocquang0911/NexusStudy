import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useAuth from '../../hooks/useAuth.js'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [error, setError] = useState('')
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  async function onSubmit(values) { try { await registerUser({ name: values.name, email: values.email, password: values.password }); navigate('/dashboard') } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create account') } }
  return <div className="auth-page"><div className="auth-brand"><div className="brand-mark">N</div><strong>NEXUS STUDY</strong></div><form className="auth-card" onSubmit={handleSubmit(onSubmit)}><span className="eyebrow">START TOGETHER</span><h1>Create your account</h1><p>Set up your student account and start collaborating.</p><label>Name<input {...register('name', { required: 'Name is required' })} placeholder="Your name" />{errors.name && <small className="field-error">{errors.name.message}</small>}</label><label>Email<input type="email" {...register('email', { required: 'Email is required' })} placeholder="you@university.edu" />{errors.email && <small className="field-error">{errors.email.message}</small>}</label><label>Password<input type="password" {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })} placeholder="At least 6 characters" />{errors.password && <small className="field-error">{errors.password.message}</small>}</label><label>Confirm password<input type="password" {...register('confirmPassword', { validate: (value) => value === watch('password') || 'Passwords do not match' })} placeholder="Repeat your password" />{errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}</label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-action auth-submit" type="submit">Create account</button><p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p></form></div>
}
