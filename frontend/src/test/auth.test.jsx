import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import LoginPage from '../pages/auth/LoginPage.jsx'
import { AuthContext } from '../context/AuthContext.jsx'

describe('Authentication Module', () => {
  test('renders login form inputs correctly', () => {
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

    expect(screen.getByPlaceholderText(/you@university\.edu/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Log in/i })).toBeInTheDocument()
  })

  test('calls login context function on form submit', async () => {
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

    fireEvent.change(screen.getByPlaceholderText(/you@university\.edu/i), {
      target: { value: 'student@nexus.edu' },
    })
    fireEvent.change(screen.getByPlaceholderText(/Your password/i), {
      target: { value: 'password123' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Log in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'student@nexus.edu',
        password: 'password123',
      })
    })
  })
})
