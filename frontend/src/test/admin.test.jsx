import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import AdminPage from '../pages/admin/AdminPage.jsx'
import AdminRoute from '../routes/AdminRoute.jsx'
import DashboardRoute from '../routes/DashboardRoute.jsx'
import { AuthContext } from '../context/AuthContext.jsx'
import { getAdminOverview, listAdminUsers, listAdminWorkspaces, updateAdminUserPlan, updateAdminUserRole } from '../services/adminService.js'
import Sidebar from '../components/layout/Sidebar.jsx'

vi.mock('../services/adminService.js', () => ({
  getAdminOverview: vi.fn(),
  listAdminUsers: vi.fn(),
  listAdminWorkspaces: vi.fn(),
  updateAdminUserRole: vi.fn(),
  updateAdminUserPlan: vi.fn(),
}))

vi.mock('../components/layout/CurrentWorkspace.jsx', () => ({ default: () => null }))

describe('Admin area', () => {
  afterEach(() => vi.restoreAllMocks())

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'prompt').mockReturnValue('Approved admin operation')
    getAdminOverview.mockResolvedValue({ data: { data: {
      users: { total: 4, admins: 1, free: 3, premium: 1, newToday: 0, newLast7Days: 2, newLast30Days: 4 },
      workspaces: { total: 2, createdThisMonth: 1, members: 4 },
      tasks: { total: 3, completed: 1, overdue: 0 },
      content: { polls: 1, activeDocuments: 1, documentStorageBytes: 0, documentsExpiringSoon: 0, messages: 5, notifications: 2 },
      trends: { range: '30d', users: [], workspaces: [] },
      capabilities: { activeUsers: false, aiUsage: false, reports: false },
      recentActivity: [],
      recentUsers: [],
    } } })
    listAdminUsers.mockResolvedValue({ data: { data: { users: [], page: 1, pages: 1, total: 0 } } })
    listAdminWorkspaces.mockResolvedValue({ data: { data: { workspaces: [], page: 1, pages: 1, total: 0 } } })
    updateAdminUserRole.mockResolvedValue({ data: { data: { _id: 'student-id', name: 'Sam Student', email: 'sam@example.com', systemRole: 'LECTURER', createdAt: '2026-09-26T00:00:00.000Z' } } })
    updateAdminUserPlan.mockResolvedValue({ data: { data: { _id: 'student-id', name: 'Sam Student', email: 'sam@example.com', systemRole: 'STUDENT', subscriptionPlan: 'PREMIUM', createdAt: '2026-09-26T00:00:00.000Z' } } })
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

    expect((await screen.findAllByText('4')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Users', exact: true }))
    const roleSelect = await screen.findByRole('combobox', { name: 'Role for Sam Student' })
    fireEvent.change(roleSelect, { target: { value: 'LECTURER' } })

    await waitFor(() => expect(updateAdminUserRole).toHaveBeenCalledWith('student-id', 'LECTURER', 'Approved admin operation'))
    expect(listAdminUsers).toHaveBeenCalledWith({ search: '', role: '', plan: '', page: 1 })
    expect(await screen.findByRole('status')).toHaveTextContent('Role updated for Sam Student.')
  })

  test('admin sidebar opens User Management and marks it active', async () => {
    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', name: 'Admin User', systemRole: 'ADMIN' }, logout: vi.fn() }}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<><Sidebar /><AdminPage /></>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'User Management' }))

    await waitFor(() => expect(listAdminUsers).toHaveBeenCalledWith({ search: '', role: '', plan: '', page: 1 }))
    expect(screen.getByRole('link', { name: 'User Management' })).toHaveClass('active')
    expect(screen.getByRole('heading', { name: 'User accounts' })).toBeInTheDocument()
  })

  test('admin sidebar opens All Workspaces', async () => {
    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', name: 'Admin User', systemRole: 'ADMIN' }, logout: vi.fn() }}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route path="/admin" element={<><Sidebar /><AdminPage /></>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('link', { name: 'All Workspaces' }))

    await waitFor(() => expect(listAdminWorkspaces).toHaveBeenCalledWith({ search: '', page: 1 }))
    expect(screen.getByRole('link', { name: 'All Workspaces' })).toHaveClass('active')
    expect(screen.getByRole('heading', { name: 'All workspaces' })).toBeInTheDocument()
  })

  test('lets an admin manually grant the Premium plan', async () => {
    listAdminUsers.mockResolvedValue({ data: { data: { users: [{ _id: 'student-id', name: 'Sam Student', email: 'sam@example.com', systemRole: 'STUDENT', subscriptionPlan: 'FREE', createdAt: '2026-09-26T00:00:00.000Z' }], page: 1, pages: 1, total: 1 } } })

    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', systemRole: 'ADMIN' } }}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Users', exact: true }))
    fireEvent.change(await screen.findByRole('combobox', { name: 'Plan for Sam Student' }), { target: { value: 'PREMIUM' } })

    await waitFor(() => expect(updateAdminUserPlan).toHaveBeenCalledWith('student-id', 'PREMIUM', 'Approved admin operation'))
    expect(await screen.findByRole('status')).toHaveTextContent('Plan updated for Sam Student.')
  })

  test('shows an empty state when there are no workspaces', async () => {
    listAdminWorkspaces.mockResolvedValue({ data: { data: { workspaces: [], page: 1, pages: 0, total: 0 } } })

    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', systemRole: 'ADMIN' } }}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'All workspaces', exact: true }))

    expect(await screen.findByText('No workspaces have been created.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open workspaces' })).not.toBeInTheDocument()
    expect(listAdminWorkspaces).toHaveBeenCalledWith({ search: '', page: 1 })
  })

  test('does not render stale user rows as workspaces while switching tabs', async () => {
    let resolveWorkspaces
    listAdminUsers.mockResolvedValue({ data: { data: {
      users: [{ _id: 'user-id', name: 'Sam Student', email: 'sam@example.com', systemRole: 'STUDENT', createdAt: '2026-09-26T00:00:00.000Z' }],
      page: 1,
      pages: 1,
    } } })
    listAdminWorkspaces.mockImplementation(() => new Promise((resolve) => { resolveWorkspaces = resolve }))

    render(
      <AuthContext.Provider value={{ user: { _id: 'admin-id', systemRole: 'ADMIN' } }}>
        <MemoryRouter><AdminPage /></MemoryRouter>
      </AuthContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Users', exact: true }))
    expect(await screen.findByText('Sam Student')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All workspaces', exact: true }))

    expect(await screen.findByRole('status')).toHaveTextContent('Loading workspaces...')
    expect(screen.queryByText('No workspaces have been created.')).not.toBeInTheDocument()

    resolveWorkspaces({ data: { data: {
      workspaces: [{ _id: 'workspace-id', name: 'Study group', ownerId: null, createdAt: '2026-10-25T00:00:00.000Z' }],
      page: 1,
      pages: 1,
    } } })

    expect(await screen.findByText('Study group')).toBeInTheDocument()
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument()
  })
})