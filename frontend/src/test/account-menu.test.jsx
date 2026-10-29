import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext.jsx'
import Topbar from '../components/layout/Topbar.jsx'

vi.mock('../components/common/NotificationPopover.jsx', () => ({
  default: () => null,
}))

describe('Topbar account menu', () => {
  const logout = vi.fn()

  beforeEach(() => logout.mockClear())

  test('provides profile, password, and sign-out actions', () => {
    render(
      <AuthContext.Provider value={{
        user: { name: 'Pham Quang', email: 'quang@example.com' },
        logout,
      }}>
        <MemoryRouter>
          <Topbar />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))

    expect(screen.getByText('Pham Quang')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /personal information/i })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('menuitem', { name: /change password/i })).toHaveAttribute('href', '/profile?tab=PASSWORD')
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }))
    expect(logout).toHaveBeenCalledOnce()
  })
})
