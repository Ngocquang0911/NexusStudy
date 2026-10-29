import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import TaskCard from '../components/task/TaskCard.jsx'
import KanbanBoard from '../components/task/KanbanBoard.jsx'
import TaskModal from '../components/task/TaskModal.jsx'
import { getTaskBoardStatus } from '../utils/taskStatus.js'

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

  test('derives overdue status from the deadline but excludes finished and cancelled tasks', () => {
    const now = new Date('2026-10-24T12:00:00.000Z')

    expect(getTaskBoardStatus({ status: 'TODO', deadline: '2026-10-23T00:00:00.000Z' }, now)).toBe('OVERDUE')
    expect(getTaskBoardStatus({ status: 'TODO', deadline: '2026-10-24T00:00:00.000Z' }, now)).toBe('OVERDUE')
    expect(getTaskBoardStatus({ status: 'DONE', deadline: '2026-10-23T00:00:00.000Z' }, now)).toBe('DONE')
    expect(getTaskBoardStatus({ status: 'CANCELLED', deadline: '2026-10-23T00:00:00.000Z' }, now)).toBe('CANCELLED')
  })

  test('renders all workflow columns and places overdue work in its derived column', () => {
    render(
      <KanbanBoard
        tasks={[
          { ...sampleTask, _id: 'todo', title: 'To do task', status: 'TODO', deadline: null, assignedTo: [] },
          { ...sampleTask, _id: 'progress', title: 'In progress task', status: 'IN_PROGRESS', deadline: null, assignedTo: [] },
          { ...sampleTask, _id: 'cancelled', title: 'Cancelled task', status: 'CANCELLED', deadline: null, assignedTo: [] },
          { ...sampleTask, _id: 'review', title: 'Review task', status: 'REVIEW', deadline: null, assignedTo: [] },
          { ...sampleTask, _id: 'finished', title: 'Finished task', status: 'DONE', deadline: null, assignedTo: [] },
          { ...sampleTask, _id: 'overdue', title: 'Overdue task', status: 'TODO', deadline: '2020-01-01T00:00:00.000Z', assignedTo: [] },
        ]}
      />
    )

    for (const heading of ['To Do', 'In Progress', 'Cancel', 'Review', 'Finish', 'Overdue']) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    }
    expect(screen.getByText('Overdue task')).toBeInTheDocument()
    expect(screen.getByText('Finished task')).toBeInTheDocument()
  })
})
