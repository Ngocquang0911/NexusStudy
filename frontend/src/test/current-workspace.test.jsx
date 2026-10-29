import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import CurrentWorkspace from '../components/layout/CurrentWorkspace.jsx'

const { listWorkspaces, updateWorkspace } = vi.hoisted(() => ({
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}))

vi.mock('../services/workspaceService.js', () => ({
  listWorkspaces,
  updateWorkspace,
}))

const workspaces = [
  { _id: 'space-1', name: 'HCI · Team 04', role: 'OWNER' },
  { _id: 'space-2', name: 'Biology', role: 'MEMBER' },
]

describe('Current workspace switcher', () => {
  beforeEach(() => {
    localStorage.clear()
    listWorkspaces.mockResolvedValue({ data: { data: workspaces } })
    updateWorkspace.mockResolvedValue({ data: { data: { _id: 'space-1', name: 'HCI Team' } } })
  })

  test('shows the current workspace and allows an owner to rename it', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/space-1']}>
        <Routes>
          <Route path="/workspaces/:workspaceId" element={<CurrentWorkspace />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('HCI · Team 04')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /current workspace/i }))
    fireEvent.click(screen.getByRole('button', { name: /rename workspace/i }))
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'HCI Team' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(updateWorkspace).toHaveBeenCalledWith('space-1', { name: 'HCI Team' }))
    await waitFor(() => expect(screen.getAllByText('HCI Team').length).toBeGreaterThan(0))
  })

  test('does not offer rename to a regular workspace member', async () => {
    render(
      <MemoryRouter initialEntries={['/workspaces/space-2']}>
        <Routes>
          <Route path="/workspaces/:workspaceId" element={<CurrentWorkspace />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Biology')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /current workspace/i }))
    expect(screen.queryByRole('button', { name: /rename workspace/i })).not.toBeInTheDocument()
  })
})
