import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import WorkspaceSettingsDialog from '../components/workspace/WorkspaceSettingsDialog.jsx'
import { deleteWorkspace } from '../services/workspaceService.js'

vi.mock('../services/workspaceService.js', () => ({
  deleteWorkspace: vi.fn(),
}))

const workspace = { _id: 'workspace-123', name: 'Java Study' }

function renderDialog(onDeleted = vi.fn()) {
  const onClose = vi.fn()
  render(<WorkspaceSettingsDialog workspace={workspace} onClose={onClose} onDeleted={onDeleted} />)
  return { onClose, onDeleted }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workspace deletion confirmation', () => {
  test('requires the exact Space name before enabling the final delete action', () => {
    renderDialog()
    const input = screen.getByLabelText(/Type Java Study to confirm/i)
    const button = screen.getByRole('button', { name: 'Delete Space' })

    expect(screen.getByText(/download eligible documents for five days/i)).toBeInTheDocument()
    expect(button).toBeDisabled()

    fireEvent.change(input, { target: { value: 'Java study' } })
    expect(button).toBeDisabled()
    fireEvent.change(input, { target: { value: 'Java Study' } })
    expect(button).toBeEnabled()
    expect(deleteWorkspace).not.toHaveBeenCalled()
  })

  test('shows progress and navigates only after the server confirms deletion', async () => {
    let resolveRequest
    deleteWorkspace.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const { onDeleted } = renderDialog()
    fireEvent.change(screen.getByLabelText(/Type Java Study to confirm/i), { target: { value: 'Java Study' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete Space' }))

    expect(screen.getByRole('button', { name: 'Deleting Space…' })).toBeDisabled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(deleteWorkspace).toHaveBeenCalledWith('workspace-123')

    resolveRequest({ data: { success: true } })
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })

  test('keeps the confirmation open and reports a backend failure', async () => {
    deleteWorkspace.mockRejectedValue({ response: { data: { message: 'Deletion was rejected' } } })
    const { onDeleted, onClose } = renderDialog()
    fireEvent.change(screen.getByLabelText(/Type Java Study to confirm/i), { target: { value: 'Java Study' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete Space' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Deletion was rejected')
    expect(screen.getByRole('button', { name: 'Delete Space' })).toBeEnabled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
