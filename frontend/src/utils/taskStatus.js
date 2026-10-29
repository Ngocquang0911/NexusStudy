import { TASK_STATUSES } from './constants.js'

export const TASK_BOARD_STATUSES = [...TASK_STATUSES, 'OVERDUE']

export const TASK_STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  CANCELLED: 'Cancel',
  REVIEW: 'Review',
  DONE: 'Finish',
  OVERDUE: 'Overdue',
}

export function isTaskOverdue(task, now = new Date()) {
  if (!task.deadline || ['DONE', 'CANCELLED'].includes(task.status)) return false

  const deadline = new Date(task.deadline)
  if (Number.isNaN(deadline.getTime())) return false

  return deadline.getTime() < now.getTime()
}

export function isTaskDueSoon(task, now = new Date()) {
  if (!task.deadline || ['DONE', 'CANCELLED'].includes(task.status) || isTaskOverdue(task, now)) return false

  const deadline = new Date(task.deadline)
  if (Number.isNaN(deadline.getTime())) return false

  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (60 * 60 * 1000)
  return hoursUntilDeadline <= 48
}

export function getTaskBoardStatus(task, now = new Date()) {
  return isTaskOverdue(task, now) ? 'OVERDUE' : task.status
}
