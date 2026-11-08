import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import ReportDialog from '../components/workspace/ReportDialog.jsx'
import { submitReport } from '../services/reportService.js'
vi.mock('../services/reportService.js', () => ({ submitReport: vi.fn() }))
test('requires a reason and submits the selected report target', async () => {
  submitReport.mockResolvedValue({ data: { success: true } })
  render(<ReportDialog workspaceId="space-1" targetType="USER" targetId="user-2" targetName="Alex" onClose={vi.fn()} />)
  const button = screen.getByRole('button', { name: 'Send report' })
  expect(button).toBeDisabled()
  fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Repeated harassment in group chat' } })
  fireEvent.click(button)
  await waitFor(() => expect(submitReport).toHaveBeenCalledWith('space-1', { targetType: 'USER', targetId: 'user-2', reason: 'Repeated harassment in group chat' }))
  expect(await screen.findByRole('status')).toHaveTextContent('sent')
})
