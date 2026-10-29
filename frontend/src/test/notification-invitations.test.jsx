import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import NotificationPopover from '../components/common/NotificationPopover.jsx'

const { acceptInvitation, declineInvitation, dismissNotification, listNotifications, markAllNotificationsRead, markNotificationRead } = vi.hoisted(() => ({
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
  dismissNotification: vi.fn(),
  listNotifications: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
}))

vi.mock('../services/notificationService.js', () => ({
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
}))

vi.mock('../services/workspaceService.js', () => ({
  acceptInvitation,
  declineInvitation,
}))

const notification = {
  _id: 'notification-1',
  createdAt: '2026-10-25T00:00:00.000Z',
  invitationId: 'invitation-1',
  invitationStatus: 'PENDING',
  message: 'Avery invited you to Java study. Respond within 3 days.',
  readAt: null,
  title: 'Workspace invitation',
  type: 'INVITATION',
}

describe('invitation notification actions', () => {
  beforeEach(() => {
    acceptInvitation.mockResolvedValue({})
    declineInvitation.mockResolvedValue({})
    listNotifications.mockResolvedValue({ data: { data: [notification] } })
  })

  test('lets the invited user accept from the notification', async () => {
    const onClose = vi.fn()
    render(<MemoryRouter><NotificationPopover isOpen onClose={onClose} /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: /Accept/ }))

    await waitFor(() => expect(acceptInvitation).toHaveBeenCalledWith('invitation-1'))
    expect(onClose).toHaveBeenCalled()
  })

  test('lets the invited user decline from the notification', async () => {
    render(<MemoryRouter><NotificationPopover isOpen onClose={vi.fn()} /></MemoryRouter>)

    fireEvent.click(await screen.findByRole('button', { name: /Decline/ }))

    await waitFor(() => expect(declineInvitation).toHaveBeenCalledWith('invitation-1'))
    expect(await screen.findByText('Invitation declined')).toBeInTheDocument()
  })
})
