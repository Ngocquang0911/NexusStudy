import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal.jsx'

describe('Workspace Creation Module', () => {
  test('renders workspace creation modal inputs', () => {
    render(
      <CreateWorkspaceModal
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
        error=""
      />
    )

    expect(screen.getByText('Bring your group together')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Software Engineering thesis/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create workspace/i })).toBeInTheDocument()
  })

  test('calls onSubmit when modal form is submitted', async () => {
    const mockSubmit = vi.fn()
    render(
      <CreateWorkspaceModal
        onClose={vi.fn()}
        onSubmit={mockSubmit}
        submitting={false}
        error=""
      />
    )

    fireEvent.change(screen.getByPlaceholderText(/Software Engineering thesis/i), {
      target: { value: 'Distributed Systems Project' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Create workspace/i }))

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled()
    })
  })
})
