import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext.jsx'
import PremiumPage from '../pages/premium/PremiumPage.jsx'
import { getPremiumRequest, submitPremiumRequest } from '../services/premiumService.js'
vi.mock('../services/premiumService.js', () => ({ getPremiumRequest: vi.fn(), submitPremiumRequest: vi.fn() }))
beforeEach(() => { getPremiumRequest.mockResolvedValue({ data: { data: null } }); submitPremiumRequest.mockResolvedValue({ data: { data: { plan: 'YEARLY', status: 'PENDING' } } }) })
test('displays the requested prices and submits a selected plan as a pending request', async () => {
  render(<AuthContext.Provider value={{ user: { subscriptionPlan: 'FREE' } }}><PremiumPage /></AuthContext.Provider>)
  expect(screen.getByText('39.000')).toBeInTheDocument()
  expect(screen.getByText('150.000')).toBeInTheDocument()
  expect(screen.getByText('289.000')).toBeInTheDocument()
  expect(screen.getByText(/chưa tích hợp thanh toán/i)).toBeInTheDocument()
  await screen.findByRole('button', { name: /Gửi yêu cầu đăng ký/i })
  fireEvent.click(screen.getByRole('button', { name: /1 năm/i }))
  fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu đăng ký/i }))
  await waitFor(() => expect(submitPremiumRequest).toHaveBeenCalledWith('YEARLY'))
  expect(await screen.findByRole('status')).toHaveTextContent('đang chờ')
})
