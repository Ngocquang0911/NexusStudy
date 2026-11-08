import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import PollCard from '../components/poll/PollCard.jsx'
import CreatePollModal from '../components/poll/CreatePollModal.jsx'

describe('Poll Module', () => {
  const samplePoll = {
    _id: 'p1',
    question: 'Select preferred meeting time',
    status: 'OPEN',
    expiresAt: '2026-10-20T00:00:00.000Z',
    options: [
      { id: 'opt1', label: 'Monday 2:00 PM', voteCount: 3 },
      { id: 'opt2', label: 'Wednesday 4:00 PM', voteCount: 1 },
    ],
    totalVotes: 4,
    userVote: null,
    createdBy: 'u1',
  }

  test.each([1, 3, 5])('creates a poll expiring in %i hours', async (hours) => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<CreatePollModal isOpen onClose={vi.fn()} onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText(/Poll Question/), { target: { value: 'When to meet?' } })
    fireEvent.change(screen.getByPlaceholderText('Option 1'), { target: { value: 'Today' } })
    fireEvent.change(screen.getByPlaceholderText('Option 2'), { target: { value: 'Tomorrow' } })
    fireEvent.change(screen.getByLabelText('Poll Expiration'), { target: { value: `${hours}h` } })
    const before = Date.now()
    fireEvent.click(screen.getByRole('button', { name: 'Create Poll' }))
    await waitFor(() => expect(submit).toHaveBeenCalledOnce())
    const expires = new Date(submit.mock.calls[0][0].expiresAt).getTime()
    expect(expires - before).toBeGreaterThanOrEqual(hours * 3600000)
    expect(expires - before).toBeLessThan(hours * 3600000 + 5000)
  })

  test('renders PollCard question and option labels with vote counts', () => {
    render(
      <PollCard
        poll={samplePoll}
        onVote={vi.fn()}
        onClosePoll={vi.fn()}
        onDeletePoll={vi.fn()}
        currentUserId="u2"
        userRole="MEMBER"
      />
    )

    expect(screen.getByText('Select preferred meeting time')).toBeInTheDocument()
    expect(screen.getByText('Monday 2:00 PM')).toBeInTheDocument()
    expect(screen.getByText('Wednesday 4:00 PM')).toBeInTheDocument()
    expect(screen.getByText('4 Total Votes')).toBeInTheDocument()
  })

  test('calls onVote handler when an option is selected and vote submitted', () => {
    const mockVote = vi.fn()
    render(
      <PollCard
        poll={samplePoll}
        onVote={mockVote}
        onClosePoll={vi.fn()}
        onDeletePoll={vi.fn()}
        currentUserId="u2"
        userRole="MEMBER"
      />
    )

    const optionItem = screen.getByText('Monday 2:00 PM')
    fireEvent.click(optionItem)

    const submitBtn = screen.getByRole('button', { name: /Submit Vote/i })
    fireEvent.click(submitBtn)

    expect(mockVote).toHaveBeenCalledWith('p1', 'opt1')
  })
})
