import mongoose from 'mongoose'
import { Task } from './Task.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'

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

function canEditTask(task, userId, member) {
  return isLeader(member) || task.assignedTo.some((assigneeId) => assigneeId.equals(userId))
}

export async function createTask(userId, workspaceId, payload, member) {
  const assignedTo = normalizeAssignedTo(payload.assignedTo)
  if (assignedTo.length && !isLeader(member)) throw errorWithStatus('Only workspace leaders can assign tasks', 403)
  await ensureWorkspaceMembers(workspaceId, assignedTo)

  return Task.create({
    workspaceId,
    title: payload.title,
    description: payload.description || '',
    assignedTo,
    createdBy: userId,
    status: payload.status || 'TODO',
    priority: payload.priority || 'MEDIUM',
    deadline: payload.deadline || null,
    progress: normalizeProgress(payload.status || 'TODO', payload.progress),
    attachments: payload.attachments || [],
  })
}

export async function listTasks(workspaceId) {
  return Task.find({ workspaceId }).populate('assignedTo', 'name email avatar').populate('createdBy', 'name email').sort({ deadline: 1, createdAt: -1 })
}

export async function getTask(taskId) {
  return Task.findById(taskId).populate('assignedTo', 'name email avatar').populate('createdBy', 'name email')
}

export async function updateTask(task, userId, member, payload) {
  if (!canEditTask(task, userId, member)) throw errorWithStatus('You can only update tasks assigned to you', 403)
  if (payload.assignedTo !== undefined && !isLeader(member)) throw errorWithStatus('Only workspace leaders can assign tasks', 403)

  const nextStatus = payload.status || task.status
  const nextProgress = normalizeProgress(nextStatus, payload.progress ?? task.progress)
  const updates = { ...payload, status: nextStatus, progress: nextProgress }
  delete updates.workspaceId
  delete updates.createdBy
  if (updates.assignedTo !== undefined) updates.assignedTo = await ensureWorkspaceMembers(task.workspaceId, updates.assignedTo)

  Object.assign(task, updates)
  return task.save()
}

export async function updateTaskStatus(task, userId, member, status, progress) {
  return updateTask(task, userId, member, { status, progress })
}

export async function assignTask(task, member, assignedTo) {
  if (!isLeader(member)) throw errorWithStatus('Only workspace leaders can assign tasks', 403)
  task.assignedTo = await ensureWorkspaceMembers(task.workspaceId, assignedTo)
  return task.save()
}

export async function deleteTask(task, member) {
  if (!isLeader(member)) throw errorWithStatus('Only workspace leaders can delete tasks', 403)
  await task.deleteOne()
}

export async function getWorkspaceProgress(workspaceId) {
  const tasks = await Task.find({ workspaceId }).select('status progress')
  const total = tasks.length
  const done = tasks.filter((task) => task.status === 'DONE').length
  const progress = total ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / total) : 0
  return { total, done, remaining: total - done, progress }
}
