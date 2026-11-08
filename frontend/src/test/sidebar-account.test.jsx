import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext.jsx'
import Sidebar from '../components/layout/Sidebar.jsx'
vi.mock('../services/workspaceService.js', () => ({ listWorkspaces: vi.fn().mockResolvedValue({ data: { data: [] } }) }))
vi.mock('../components/common/NotificationPopover.jsx', () => ({ default: ({ isOpen }) => isOpen ? <div>Notifications panel</div> : null }))
test('opens the sidebar avatar menu with existing account actions', () => {
  const toggle = vi.fn()
  render(<AuthContext.Provider value={{ user: { name: 'Student', systemRole: 'STUDENT' }, logout: vi.fn() }}><MemoryRouter><Sidebar theme="light" onToggleTheme={toggle} /></MemoryRouter></AuthContext.Provider>)
  fireEvent.click(screen.getByRole('button', { name: 'Open sidebar account menu' }))
  expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute('href', '/profile')
  expect(screen.getByRole('menuitem', { name: 'Change password' })).toHaveAttribute('href', '/profile?tab=PASSWORD')
  fireEvent.click(screen.getByRole('menuitem', { name: 'Dark mode' }))
  expect(toggle).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Notifications' }))
  expect(screen.getByText('Notifications panel')).toBeInTheDocument()
})
