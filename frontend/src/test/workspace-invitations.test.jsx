import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import WorkspaceListPage from '../pages/workspace/WorkspaceListPage.jsx'

const { acceptInvitation, declineInvitation, listInvitations, listWorkspaces } = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
  listInvitations: vi.fn(),
  listWorkspaces: vi.fn(),
}))

vi.mock('../services/workspaceService.js', () => ({
  acceptInvitation,
  createWorkspace: vi.fn(),
  declineInvitation,
  listInvitations,
  listWorkspaces,
}))

const pendingInvitation = {
  _id: 'invitation-1',
  createdAt: '2026-10-25T00:00:00.000Z',
  expiresAt: '2026-10-28T00:00:00.000Z',
  status: 'PENDING',
  workspaceId: { name: 'Java study' },
  inviterId: { name: 'Avery' },
}

describe('workspace invitations', () => {
  beforeEach(() => {
    acceptInvitation.mockResolvedValue({})
    declineInvitation.mockResolvedValue({})
    listWorkspaces.mockResolvedValue({ data: { data: [] } })
    listInvitations.mockResolvedValue({ data: { data: [pendingInvitation] } })
  })

  test('accepts an invitation and refreshes My workspaces without navigating automatically', async () => {
    listWorkspaces
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: [{ _id: 'workspace-1', name: 'Java study', role: 'MEMBER' }] } })
    listInvitations
      .mockResolvedValueOnce({ data: { data: [pendingInvitation] } })
      .mockResolvedValueOnce({ data: { data: [{ ...pendingInvitation, status: 'ACCEPTED' }] } })

    render(<MemoryRouter><WorkspaceListPage /></MemoryRouter>)

    expect(await screen.findByText('Java study')).toBeInTheDocument()
    expect(screen.getByText(/Respond by/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Accept/ }))

    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith('invitation-1'))
    expect((await screen.findAllByText('Java study')).length).toBe(2)
    expect(screen.getByRole('heading', { name: 'My workspaces' })).toBeInTheDocument()
    expect(screen.getByText('ACCEPTED')).toBeInTheDocument()
  })

  test('declines a pending invitation without adding a workspace', async () => {
    listInvitations
      .mockResolvedValueOnce({ data: { data: [pendingInvitation] } })
      .mockResolvedValueOnce({ data: { data: [{ ...pendingInvitation, status: 'DECLINED' }] } })

    render(<MemoryRouter><WorkspaceListPage /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Decline/ }))

    await waitFor(() => expect(declineInvitation).toHaveBeenCalledWith('invitation-1'))
    expect(screen.getByText('DECLINED')).toBeInTheDocument()
    expect(screen.getByText('No workspace yet')).toBeInTheDocument()
  })

  test('does not offer joining a workspace by code', async () => {
    render(<MemoryRouter><WorkspaceListPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'My workspaces' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /join with code/i })).not.toBeInTheDocument()
  })
})
