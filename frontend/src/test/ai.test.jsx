import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import AiChatWindow from '../components/ai/AiChatWindow.jsx'

describe('NEXUS AI Assistant Module', () => {
  test('renders AI chat window with initial welcome message when messages empty', () => {
    render(
      <AiChatWindow
        messages={[]}
        onSendMessage={vi.fn()}
        loading={false}
        documents={[]}
        selectedDocIds={[]}
        onDocSelectionChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Hello! How can NEXUS AI help your studies today\?/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Ask NEXUS AI a study question/i)).toBeInTheDocument()
  })

  test('displays loading spinner and thinking message when loading is true', () => {
    render(
      <AiChatWindow
        messages={[]}
        onSendMessage={vi.fn()}
        loading={true}
        documents={[]}
        selectedDocIds={[]}
        onDocSelectionChange={vi.fn()}
      />
    )

    expect(screen.getByText(/NEXUS AI is analyzing documents and generating response\.\.\./i)).toBeInTheDocument()
  })

  test('renders message stream with user query and AI assistant response', () => {
    const sampleMessages = [
      { role: 'user', content: 'What are the core requirements of this project?' },
      {
        role: 'assistant',
        content: 'The core requirements include React, Vite, Socket.IO, and MongoDB.',
        sourceDocuments: [{ id: 'd1', fileName: 'requirements.pdf' }],
      },
    ]

    render(
      <AiChatWindow
        messages={sampleMessages}
        onSendMessage={vi.fn()}
        loading={false}
        documents={[]}
        selectedDocIds={[]}
        onDocSelectionChange={vi.fn()}
      />
    )

    expect(screen.getByText('What are the core requirements of this project?')).toBeInTheDocument()
    expect(screen.getByText('The core requirements include React, Vite, Socket.IO, and MongoDB.')).toBeInTheDocument()
    expect(screen.getByText('requirements.pdf')).toBeInTheDocument()
  })
})
