import { describe, expect, test } from 'vitest'
import { getTaskBoardStatus, isTaskDueSoon, isTaskOverdue } from '../utils/taskStatus.js'

describe('task deadline status', () => {
  const now = new Date('2026-10-25T00:00:00.000Z')

  test('does not mark a task overdue until its exact deadline instant has passed', () => {
    const task = { status: 'IN_PROGRESS', deadline: '2026-10-25T01:00:00.000Z' }

    expect(isTaskOverdue(task, now)).toBe(false)
    expect(getTaskBoardStatus(task, now)).toBe('IN_PROGRESS')
    expect(isTaskOverdue(task, new Date('2026-10-25T01:00:00.001Z'))).toBe(true)
  })

  test('does not mark completed or cancelled tasks overdue', () => {
    const pastDeadline = '2026-10-24T00:00:00.000Z'

    expect(isTaskOverdue({ status: 'DONE', deadline: pastDeadline }, now)).toBe(false)
    expect(isTaskOverdue({ status: 'CANCELLED', deadline: pastDeadline }, now)).toBe(false)
  })

  test('marks a task due soon only when its deadline is within 48 hours', () => {
    expect(isTaskDueSoon({ status: 'TODO', deadline: '2026-10-26T23:59:59.000Z' }, now)).toBe(true)
    expect(isTaskDueSoon({ status: 'TODO', deadline: '2026-10-27T01:00:00.000Z' }, now)).toBe(false)
  })
})
