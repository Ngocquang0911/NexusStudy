import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import ProtectedRoute from '../routes/ProtectedRoute.jsx'
import PublicRoute from '../routes/PublicRoute.jsx'
import { AuthContext } from '../context/AuthContext.jsx'

describe('Protected Routes & Navigation', () => {
  test('redirects unauthenticated users to /login when accessing protected routes', () => {
    const unauthContext = {
      isAuthenticated: false,
      loading: false,
      user: null,
      token: null,
    }

    render(
      <AuthContext.Provider value={unauthContext}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  test('allows authenticated users to access protected routes', () => {
    const authContext = {
      isAuthenticated: true,
      loading: false,
      user: { _id: '1', name: 'Student' },
      token: 'valid-token',
    }

    render(
      <AuthContext.Provider value={authContext}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument()
  })
})
