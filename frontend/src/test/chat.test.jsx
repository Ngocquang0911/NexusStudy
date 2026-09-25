import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import ChannelList from '../components/chat/ChannelList.jsx'
import MessageInput from '../components/chat/MessageInput.jsx'

describe('Chat Module', () => {
  const sampleChannels = [
    { _id: 'c1', name: 'general', isPrivate: false },
    { _id: 'c2', name: 'backend-dev', isPrivate: true },
  ]

  test('renders ChannelList with channels and highlights active channel', () => {
    render(
      <ChannelList
        channels={sampleChannels}
        activeChannelId="c1"
        onSelectChannel={vi.fn()}
        onOpenCreateModal={vi.fn()}
        isLeader={true}
      />
    )

    expect(screen.getByText('general')).toBeInTheDocument()
    expect(screen.getByText('backend-dev')).toBeInTheDocument()
  })

  test('submits MessageInput content when submit button clicked', () => {
    const mockSend = vi.fn()
    render(
      <MessageInput
        onSendMessage={mockSend}
        onTyping={vi.fn()}
        onStopTyping={vi.fn()}
        disabled={false}
      />
    )

    const input = screen.getByPlaceholderText(/Type a message/i)
    fireEvent.change(input, { target: { value: 'Hello team!' } })

    const sendBtn = screen.getByTitle('Send message')
    fireEvent.click(sendBtn)

    expect(mockSend).toHaveBeenCalledWith({
      content: 'Hello team!',
      attachments: [],
    })
  })
})
