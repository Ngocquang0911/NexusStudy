import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import WorkspaceDetailPage from '../pages/workspace/WorkspaceDetailPage.jsx'

const mocks = vi.hoisted(() => ({ role: 'MEMBER' }))

vi.mock('../hooks/useAuth.js', () => ({
  default: () => ({ user: { _id: 'user-1' } }),
}))
vi.mock('../components/workspace/WorkspaceMembers.jsx', () => ({
  default: () => null,
}))
vi.mock('../services/workspaceService.js', () => ({
  deleteWorkspace: vi.fn(),
  getWorkspace: vi.fn(async () => ({ data: { data: { _id: 'workspace-1', name: 'Java Study', type: 'COURSE' } } })),
  getWorkspaceInvitations: vi.fn(async () => ({ data: { data: [] } })),
  getWorkspaceMembers: vi.fn(async () => ({ data: { data: [{ userId: { _id: 'user-1' }, role: mocks.role }] } })),
}))
vi.mock('../services/taskService.js', () => ({
  listTasks: vi.fn(async () => ({ data: { data: [] } })),
}))

function renderWorkspaceDetail() {
  return render(
    <MemoryRouter initialEntries={['/workspaces/workspace-1']}>
      <Routes>
        <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('workspace settings access', () => {
  beforeEach(() => {
    mocks.role = 'MEMBER'
  })

  test('shows settings only to the workspace owner', async () => {
    mocks.role = 'OWNER'
    const { findByRole } = renderWorkspaceDetail()
    expect(await findByRole('button', { name: 'Workspace settings' })).toBeInTheDocument()
  })

  test('does not show settings to a regular member', async () => {
    renderWorkspaceDetail()
    await screen.findByText('Java Study')
    expect(screen.queryByRole('button', { name: 'Workspace settings' })).not.toBeInTheDocument()
  })
})
