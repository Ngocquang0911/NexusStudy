import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext.jsx'
import ProfilePage from '../pages/profile/ProfilePage.jsx'

vi.mock('../services/userService.js', () => ({
  changePassword: vi.fn(),
  updateProfile: vi.fn(),
}))

describe('Profile page', () => {
  test('shows the signed-in user current subscription plan', () => {
    render(
      <AuthContext.Provider value={{
        user: {
          _id: 'student-id',
          name: 'Sam Student',
          email: 'sam@example.com',
          systemRole: 'STUDENT',
          subscriptionPlan: 'PREMIUM',
        },
        updateUser: vi.fn(),
      }}>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Current plan: Premium')).toBeInTheDocument()
  })
})
