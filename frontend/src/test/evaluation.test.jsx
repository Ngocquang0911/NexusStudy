import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import EvaluationForm from '../components/evaluation/EvaluationForm.jsx'

describe('Peer Evaluation Module', () => {
  const sampleMembers = [
    { userId: { _id: 'u1', name: 'Evaluator User' } },
    { userId: { _id: 'u2', name: 'Alice Smith' } },
    { userId: { _id: 'u3', name: 'Bob Johnson' } },
  ]

  test('renders EvaluationForm criteria rating rows and member select options', () => {
    render(
      <EvaluationForm
        workspaceId="ws1"
        members={sampleMembers}
        currentUserId="u1"
        myEvaluations={[]}
        onSubmitted={vi.fn()}
      />
    )

    expect(screen.getByText('Submit Peer Evaluation')).toBeInTheDocument()
    expect(screen.getByText('Responsibility')).toBeInTheDocument()
    expect(screen.getByText('Task Completion')).toBeInTheDocument()
    expect(screen.getByText('Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Attendance')).toBeInTheDocument()
    expect(screen.getByText('Work Quality')).toBeInTheDocument()
    expect(screen.getByText('Communication')).toBeInTheDocument()

    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })
})
