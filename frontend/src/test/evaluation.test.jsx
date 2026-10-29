import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import EvaluationForm from '../components/evaluation/EvaluationForm.jsx'
import ContributionReport from '../components/evaluation/ContributionReport.jsx'

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

  test('shows task outcomes and allows leaders to export completed-period reports', () => {
    render(
      <ContributionReport
        isLeader
        reportData={{
          period: '2026-06',
          evaluationCount: 1,
          members: [{
            user: { _id: 'u2', name: 'Alice Smith' },
            averageScore: 4,
            contributionScore: 80,
            evaluationCount: 1,
            scoreByCriterion: {},
            taskOutcomes: [
              { title: 'Finish on schedule', outcome: 'ON_TIME' },
              { title: 'Missed deadline', outcome: 'OVERDUE' },
            ],
          }],
        }}
      />
    )

    expect(screen.getByText('Finish on schedule')).toBeInTheDocument()
    expect(screen.getByText('ON TIME')).toBeInTheDocument()
    expect(screen.getByText('OVERDUE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument()
  })
})
