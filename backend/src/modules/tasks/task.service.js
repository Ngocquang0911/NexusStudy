import mongoose from 'mongoose'
import { Task } from './Task.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { assertPremiumUser } from '../plans/plan.service.js'
import { createTaskNotification } from '../notifications/notification.service.js'

const TASK_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'CANCELLED', 'REVIEW', 'DONE'])
const DEFAULT_REMINDER_OFFSETS = [3 * 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 2 * 60 * 60 * 1000]

function errorWithStatus(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function isLeader(member) {
  return ['OWNER', 'LEADER'].includes(member?.role)
}

function normalizeAssignedTo(assignedTo = []) {
  const values = Array.isArray(assignedTo) ? assignedTo : [assignedTo]
  if (values.some((userId) => !mongoose.isValidObjectId(userId))) {
    throw errorWithStatus('Every assignee must be a valid user id', 400)
  }
  return [...new Set(values.map((userId) => userId.toString()))]
}

async function ensureWorkspaceMembers(workspaceId, assignedTo) {
  const assigneeIds = normalizeAssignedTo(assignedTo)
  if (!assigneeIds.length) return assigneeIds
  const memberCount = await WorkspaceMember.countDocuments({ workspaceId, userId: { $in: assigneeIds } })
  if (memberCount !== assigneeIds.length) throw errorWithStatus('All assignees must belong to the workspace', 400)
  return assigneeIds
}

function normalizeStatus(status = 'TODO') {
  if (!TASK_STATUSES.has(status)) {
    throw errorWithStatus('Status must be TODO, IN_PROGRESS, CANCELLED, REVIEW, or DONE', 400)
  }
  return status
}

function normalizeProgress(status, progress) {
  if (status === 'DONE') return 100
  if (status === 'TODO') return 0
  if (progress === undefined) return 0
  const numericProgress = Number(progress)
  if (!Number.isInteger(numericProgress) || numericProgress < 0 || numericProgress > 100) {
    throw errorWithStatus('Progress must be an integer between 0 and 100', 400)
  }
  return numericProgress
}

function defaultReminders(deadline) {
  if (!deadline) return []
  const dueAt = new Date(deadline).getTime()
  const now = Date.now()
  if (!Number.isFinite(dueAt) || dueAt <= now) return []
  const timeRemaining = dueAt - now
  return DEFAULT_REMINDER_OFFSETS
    .map((offset, index) => new Date(dueAt - Math.min(offset, timeRemaining * (0.75 - index * 0.25))))
    .sort((left, right) => left - right)
    .map((sendAt) => ({ sendAt }))
}

function canEditTask(task, userId, member) {
  return isLeader(member) || task.assignedTo.some((assigneeId) => assigneeId.equals(userId))
}

function addTaskHistory(task, actorId, action, changes = []) {
  task.history.push({ actorId, action, changes })
  return task.history[task.history.length - 1]
}

async function notifyAssignees(task, recipientIds, actorId, activityId, type, title, message) {
  const recipients = [...new Set(recipientIds.map((id) => id.toString()))]
    .filter((recipientId) => recipientId !== actorId.toString())
  await Promise.all(recipients.map((userId) => createTaskNotification({
    userId,
    workspaceId: task.workspaceId,
    taskId: task._id,
    activityId,
    type,
    title,
    message,
  })))
}

function changedFields(task, updates) {
  const trackedFields = ['title', 'description', 'status', 'priority', 'deadline', 'estimatedHours', 'difficulty', 'progress', 'assignedTo']
  return trackedFields
    .filter((field) => updates[field] !== undefined)
    .filter((field) => {
      const current = task[field]
      const next = updates[field]
      if (field === 'deadline') return (current ? new Date(current).getTime() : null) !== (next ? new Date(next).getTime() : null)
      if (field === 'assignedTo') {
        return current.length !== next.length || current.some((id) => !next.some((value) => id.equals(value)))
      }
      return current !== next
    })
    .map((field) => ({
      field,
      from: field === 'assignedTo' ? task[field].map(String).join(',') : String(task[field] ?? ''),
      to: field === 'assignedTo' ? updates[field].map(String).join(',') : String(updates[field] ?? ''),
    }))
}

export async function createTask(userId, workspaceId, payload, member) {
  const assignedTo = normalizeAssignedTo(payload.assignedTo)
  const status = normalizeStatus(payload.status)
  if (assignedTo.length && !isLeader(member)) throw errorWithStatus('Only workspace leaders can assign tasks', 403)
  await ensureWorkspaceMembers(workspaceId, assignedTo)

  const task = await Task.create({
    workspaceId,
    title: payload.title,
    description: payload.description || '',
    assignedTo,
    createdBy: userId,
    status,
    priority: payload.priority || 'MEDIUM',
    deadline: payload.deadline || null,
    estimatedHours: payload.estimatedHours ?? 0,
    difficulty: payload.difficulty || 'MEDIUM',
    reminders: ['DONE', 'CANCELLED'].includes(status) ? [] : defaultReminders(payload.deadline),
    progress: normalizeProgress(status, payload.progress),
    attachments: payload.attachments || [],
    history: [{ actorId: userId, action: 'CREATED' }],
  })
  const activity = task.history[0]
  await notifyAssignees(task, assignedTo, userId, activity._id, 'TASK_ASSIGNED', 'New task assigned', `You were assigned to "${task.title}".`)
  return task
}

export async function listTasks(workspaceId) {
  return Task.find({ workspaceId })
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email')
    .populate('feedback.authorId feedback.recipientId history.actorId', 'name email avatar')
    .sort({ deadline: 1, createdAt: -1 })
}

export async function getTask(taskId) {
  return Task.findById(taskId)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email')
    .populate('feedback.authorId feedback.recipientId history.actorId', 'name email avatar')
}

export async function updateTask(task, userId, member, payload) {
  if (!canEditTask(task, userId, member)) throw errorWithStatus('You can only update tasks assigned to you', 403)
  if (payload.assignedTo !== undefined && !isLeader(member)) throw errorWithStatus('Only workspace leaders can assign tasks', 403)

  const nextStatus = normalizeStatus(payload.status || task.status)
  const nextProgress = normalizeProgress(nextStatus, payload.progress ?? task.progress)
  const editableFields = ['title', 'description', 'assignedTo', 'priority', 'deadline', 'estimatedHours', 'difficulty', 'attachments']
  const updates = Object.fromEntries(editableFields
    .filter((field) => payload[field] !== undefined)
    .map((field) => [field, payload[field]]))
  updates.status = nextStatus
  updates.progress = nextProgress
  if (updates.assignedTo !== undefined) updates.assignedTo = await ensureWorkspaceMembers(task.workspaceId, updates.assignedTo)
  const changes = changedFields(task, updates)
  const assigneesChanged = changes.some(({ field }) => field === 'assignedTo')
  const deadlineChanged = updates.deadline !== undefined
    && (task.deadline ? new Date(task.deadline).getTime() : null)
      !== (updates.deadline ? new Date(updates.deadline).getTime() : null)
  const terminalStatusChanged = nextStatus !== task.status
    && (['DONE', 'CANCELLED'].includes(nextStatus) || ['DONE', 'CANCELLED'].includes(task.status))
  if (deadlineChanged || terminalStatusChanged) {
    updates.reminders = ['DONE', 'CANCELLED'].includes(nextStatus)
      ? []
      : defaultReminders(updates.deadline !== undefined ? updates.deadline : task.deadline)
  }

  Object.assign(task, updates)
  if (changes.length) {
    const action = assigneesChanged
      ? 'ASSIGNEES_CHANGED'
      : changes.some(({ field }) => field === 'status') ? 'STATUS_CHANGED' : 'UPDATED'
    const activity = addTaskHistory(task, userId, action, changes)
    const savedTask = await task.save()
    if (assigneesChanged) {
      await notifyAssignees(
        savedTask,
        savedTask.assignedTo,
        userId,
        activity._id,
        'TASK_ASSIGNED',
        'Task assignment updated',
        `You were assigned to "${savedTask.title}".`,
      )
    }
    return savedTask
  }
  return task.save()
}

export async function updateTaskReminders(task, userId, member, reminders) {
  if (!Array.isArray(reminders) || reminders.length > 50) {
    throw errorWithStatus('Provide no more than 50 reminder times', 400)
  }
  if (!isLeader(member) && !task.createdBy.equals(userId)) {
    throw errorWithStatus('Only a workspace leader or the task creator can manage reminders', 403)
  }
  await assertPremiumUser(userId, 'Custom reminder schedules require a Premium plan')
  if (!task.deadline) throw errorWithStatus('Set a task deadline before configuring reminders', 400)
  const dueAt = new Date(task.deadline).getTime()
  const now = Date.now()
  const normalized = reminders.map((value) => new Date(value))
  if (normalized.some((date) => Number.isNaN(date.getTime()) || date.getTime() <= now || date.getTime() >= dueAt)) {
    throw errorWithStatus('Every reminder must be in the future and before the task deadline', 400)
  }
  if (new Set(normalized.map((date) => date.getTime())).size !== normalized.length) {
    throw errorWithStatus('Reminder times must be unique', 400)
  }
  task.reminders = normalized.map((sendAt) => ({ sendAt }))
  return task.save()
}

export async function updateTaskStatus(task, userId, member, status, progress) {
  return updateTask(task, userId, member, { status, progress })
}

export async function assignTask(task, userId, member, assignedTo) {
  if (!isLeader(member)) throw errorWithStatus('Only workspace leaders can assign tasks', 403)
  const nextAssignees = await ensureWorkspaceMembers(task.workspaceId, assignedTo)
  const changes = changedFields(task, { assignedTo: nextAssignees })
  if (!changes.length) return task
  task.assignedTo = nextAssignees
  const activity = addTaskHistory(task, userId, 'ASSIGNEES_CHANGED', changes)
  const savedTask = await task.save()
  await notifyAssignees(
    savedTask,
    savedTask.assignedTo,
    userId,
    activity._id,
    'TASK_ASSIGNED',
    'Task assignment updated',
    `You were assigned to "${savedTask.title}".`,
  )
  return savedTask
}

export async function addTaskFeedback(task, authorId, { recipientId, message }) {
  if (!mongoose.isValidObjectId(recipientId)) throw errorWithStatus('Select a valid feedback recipient', 400)
  if (recipientId.toString() === authorId.toString()) throw errorWithStatus('You cannot send task feedback to yourself', 400)
  if (typeof message !== 'string' || !message.trim() || message.trim().length > 2000) {
    throw errorWithStatus('Feedback must be between 1 and 2000 characters', 400)
  }
  const recipientIsRelated = task.createdBy.equals(recipientId)
    || task.assignedTo.some((assigneeId) => assigneeId.equals(recipientId))
  if (!recipientIsRelated) throw errorWithStatus('Feedback recipient must be the task creator or an assignee', 400)

  const member = await WorkspaceMember.findOne({ workspaceId: task.workspaceId, userId: recipientId })
  if (!member) throw errorWithStatus('Feedback recipient must belong to the workspace', 400)

  const feedback = { authorId, recipientId, message: message.trim() }
  task.feedback.push(feedback)
  const activity = addTaskHistory(task, authorId, 'FEEDBACK_ADDED', [{ field: 'feedback', to: message.trim() }])
  await task.save()
  const savedFeedback = task.feedback[task.feedback.length - 1]
  await createTaskNotification({
    userId: recipientId,
    workspaceId: task.workspaceId,
    taskId: task._id,
    activityId: savedFeedback._id,
    type: 'TASK_FEEDBACK',
    title: 'New feedback on your task',
    message: `A teammate left feedback on "${task.title}".`,
  })
  return { feedback: savedFeedback, activity }
}

export async function deleteTask(task, member) {
  if (!isLeader(member)) throw errorWithStatus('Only workspace leaders can delete tasks', 403)
  await task.deleteOne()
}

export async function getWorkspaceProgress(workspaceId) {
  const tasks = await Task.find({ workspaceId }).select('status progress')
  const activeTasks = tasks.filter((task) => task.status !== 'CANCELLED')
  const total = activeTasks.length
  const done = activeTasks.filter((task) => task.status === 'DONE').length
  const progress = total ? Math.round((done / total) * 100) : 0
  return { total, done, remaining: total - done, cancelled: tasks.length - total, progress }
}
