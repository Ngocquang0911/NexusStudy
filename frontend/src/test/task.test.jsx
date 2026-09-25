import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import TaskCard from '../components/task/TaskCard.jsx'
import TaskModal from '../components/task/TaskModal.jsx'

describe('Task Management & Kanban Module', () => {
  const sampleTask = {
    _id: 'task-1',
    title: 'Implement Authentication API',
    description: 'Build JWT login endpoints',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    progress: 50,
    deadline: '2026-10-15T00:00:00.000Z',
    assignedTo: [{ _id: 'u1', name: 'John Doe' }],
  }

  test('renders TaskCard title, priority tag, and progress bar', () => {
    render(
      <TaskCard
        task={sampleTask}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onStatusChange={vi.fn()}
        currentUserId="u1"
        userRole="MEMBER"
      />
    )

    expect(screen.getByText('Implement Authentication API')).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByTitle('John Doe')).toBeInTheDocument()
  })

  test('renders TaskModal with pre-populated values when editing', () => {
    render(
      <TaskModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        initialData={sampleTask}
        workspaceMembers={[]}
        isLeader={true}
        loading={false}
      />
    )

    expect(screen.getByText('Edit Task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Implement Authentication API')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Build JWT login endpoints')).toBeInTheDocument()
  })
})
