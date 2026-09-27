import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import AdminPage from '../pages/admin/AdminPage.jsx'
import AdminRoute from '../routes/AdminRoute.jsx'
import DashboardRoute from '../routes/DashboardRoute.jsx'
import { AuthContext } from '../context/AuthContext.jsx'
import { getAdminOverview, listAdminUsers, listAdminWorkspaces, updateAdminUserRole } from '../services/adminService.js'

vi.mock('../services/adminService.js', () => ({
  getAdminOverview: vi.fn(),
  listAdminUsers: vi.fn(),
  listAdminWorkspaces: vi.fn(),
  updateAdminUserRole: vi.fn(),
}))

describe('Admin area', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminOverview.mockResolvedValue({ data: { data: { users: 4, admins: 1, workspaces: 2, tasks: 3, polls: 1, documents: 1, messages: 5, recentUsers: [] } } })
    listAdminUsers.mockResolvedValue({ data: { data: { users: [], page: 1, pages: 1, total: 0 } } })
    updateAdminUserRole.mockResolvedValue({ data: { data: { _id: 'student-id', name: 'Sam Student', email: 'sam@example.com', systemRole: 'LECTURER', createdAt: '2026-09-26T00:00:00.000Z' } } })
  })

  test('redirects a non-admin away from the admin route', () => {
    render(
      <AuthContext.Provider value={{ user: { systemRole: 'STUDENT' } }}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
            <Route element={<AdminRoute />}><Route path="/admin" element={<div>Admin area</div>} /></Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Admin area')).not.toBeInTheDocument()
  })

  test('redirects administrators from the student dashboard to administration', () => {
    render(
      <AuthContext.Provider value={{ user: { systemRole: 'ADMIN' } }}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/admin" element={<div>Administration home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Administration home')).toBeInTheDocument()
  })

  test('lets an admin update another user system role', async () => {
    listAdminUsers.mockResolvedValue({ data: { data: { users: [{ _id: 'student-id', name: 'Sam Student', email: 'sam@example.com', systemRole: 'STUDENT', createdAt: '2026-09-26T00:00:00.000Z' }], page: 1, pages: 1, total: 1 } } })

    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', systemRole: 'ADMIN' } }}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Users', exact: true }))
    const roleSelect = await screen.findByRole('combobox', { name: 'Role for Sam Student' })
    fireEvent.change(roleSelect, { target: { value: 'LECTURER' } })

    await waitFor(() => expect(updateAdminUserRole).toHaveBeenCalledWith('student-id', 'LECTURER'))
    expect(await screen.findByRole('status')).toHaveTextContent('Role updated for Sam Student.')
  })

  test('shows an empty state when there are no study rooms', async () => {
    listAdminWorkspaces.mockResolvedValue({ data: { data: { workspaces: [], page: 1, pages: 0, total: 0 } } })

    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', systemRole: 'ADMIN' } }}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Study rooms', exact: true }))

    expect(await screen.findByText('No study rooms yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open workspaces' })).toHaveAttribute('href', '/workspaces')
    expect(listAdminWorkspaces).toHaveBeenCalledWith({ search: '', page: 1 })
  })
})