import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import LoginPage from '../pages/auth/LoginPage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage.jsx'
import { AuthContext } from '../context/AuthContext.jsx'

describe('Authentication Module', () => {
  test('renders login form inputs correctly with username field', () => {
    const mockContext = {
      login: vi.fn(),
      loading: false,
      user: null,
      token: null,
      isAuthenticated: false,
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument()
  })

  test('calls login context function on form submit with username', async () => {
    const mockLogin = vi.fn().mockResolvedValue({})
    const mockContext = {
      login: mockLogin,
      loading: false,
      user: null,
      token: null,
      isAuthenticated: false,
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: 'alex_study' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Your password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Log in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'alex_study',
        password: 'password123',
      })
    })
  })

  test('renders register form inputs including username and email', () => {
    const mockContext = {
      register: vi.fn(),
      loading: false,
      user: null,
      token: null,
      isAuthenticated: false,
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByPlaceholderText(/Your full name/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Chọn username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@university\.edu/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create account/i })).toBeInTheDocument()
  })

  test('submits the email verification code and authenticates the verified account', async () => {
    const mockVerifyEmail = vi.fn().mockResolvedValue({ systemRole: 'STUDENT' })
    const mockContext = {
      verifyEmail: mockVerifyEmail,
      resendVerification: vi.fn(),
      loading: false,
      user: null,
      token: null,
      isAuthenticated: false,
    }

    render(
      <AuthContext.Provider value={mockContext}>
        <MemoryRouter initialEntries={['/verify-email?email=student%40nexus.edu']}>
          <VerifyEmailPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    fireEvent.change(screen.getByLabelText(/Verification code/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify email/i }))

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({ email: 'student@nexus.edu', code: '123456' })
    })
  })
})
