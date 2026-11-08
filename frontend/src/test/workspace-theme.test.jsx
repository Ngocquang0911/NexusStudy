import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { ThemeProvider } from '../context/ThemeContext.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
vi.mock('../hooks/useAuth.js', () => ({ default: () => ({ user: { name: 'Test', systemRole: 'ADMIN' }, logout: vi.fn() }) }))
vi.mock('../components/layout/Sidebar.jsx', () => ({ default: () => null }))
vi.mock('../components/common/NotificationPopover.jsx', () => ({ default: () => null }))
afterEach(() => { localStorage.removeItem('nexus.workspace.theme'); delete document.body.dataset.workspaceTheme })
test('switches and remembers the workspace theme', async () => {
  const view = render(<MemoryRouter><ThemeProvider><AppLayout /></ThemeProvider></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Switch to dark mode' }))
  await waitFor(() => expect(document.body).toHaveAttribute('data-workspace-theme', 'dark'))
  expect(localStorage.getItem('nexus.workspace.theme')).toBe('dark')
  view.unmount()
  render(<MemoryRouter><ThemeProvider><AppLayout /></ThemeProvider></MemoryRouter>)
  await waitFor(() => expect(document.body).toHaveAttribute('data-workspace-theme', 'dark'))
  fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Switch to light mode' }))
  await waitFor(() => expect(document.body).toHaveAttribute('data-workspace-theme', 'light'))
})


test('updates the current page when the theme changes in another tab', async () => {
  render(<MemoryRouter><ThemeProvider><AppLayout /></ThemeProvider></MemoryRouter>)
  fireEvent(window, new StorageEvent('storage', { key: 'nexus.workspace.theme', newValue: 'dark' }))
  await waitFor(() => expect(document.body).toHaveAttribute('data-workspace-theme', 'dark'))
  fireEvent(window, new StorageEvent('storage', { key: 'nexus.workspace.theme', newValue: 'light' }))
  await waitFor(() => expect(document.body).toHaveAttribute('data-workspace-theme', 'light'))
})
