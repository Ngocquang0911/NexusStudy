import mongoose from 'mongoose'
import { Document } from '../documents/Document.js'
import { Message } from '../chat/Message.js'
import { Poll } from '../polls/Poll.js'
import { Task } from '../tasks/Task.js'
import { User } from '../users/User.js'
import { Workspace } from '../workspaces/Workspace.js'

const systemRoles = ['STUDENT', 'LECTURER', 'ADMIN']

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}

export async function getAdminOverview() {
  const [users, admins, workspaces, tasks, polls, documents, messages, recentUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ systemRole: 'ADMIN' }),
    Workspace.countDocuments(),
    Task.countDocuments(),
    Poll.countDocuments(),
    Document.countDocuments(),
    Message.countDocuments({ deletedAt: null }),
    User.find().select('name email systemRole createdAt').sort({ createdAt: -1 }).limit(6),
  ])

  return { users, admins, workspaces, tasks, polls, documents, messages, recentUsers }
}

export async function listAdminUsers(query) {
  const { page, limit, skip } = parsePagination(query)
  const filter = {}
  const search = query.search?.trim()
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: expression }, { email: expression }]
  }
  if (query.role && systemRoles.includes(query.role)) filter.systemRole = query.role

  const [users, total] = await Promise.all([
    User.find(filter).select('name email systemRole createdAt updatedAt').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ])
  return { users, page, limit, total, pages: Math.ceil(total / limit) }
}

export async function updateSystemRole(userId, role, actorId) {
  if (!systemRoles.includes(role)) {
    const error = new Error('Invalid system role')
    error.statusCode = 400
    throw error
  }
  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }
  if (userId === actorId && role !== 'ADMIN') {
    const error = new Error('You cannot remove your own administrator role')
    error.statusCode = 409
    throw error
  }

  const user = await User.findById(userId).select('name email systemRole createdAt updatedAt')
  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }
  if (user.systemRole === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await User.countDocuments({ systemRole: 'ADMIN' })
    if (adminCount <= 1) {
      const error = new Error('The last administrator cannot be demoted')
      error.statusCode = 409
      throw error
    }
  }

  user.systemRole = role
  await user.save()
  return user
}

export async function listAdminWorkspaces(query) {
  const { page, limit, skip } = parsePagination(query)
  const search = query.search?.trim()
  const filter = search ? { name: new RegExp(escapeRegex(search), 'i') } : {}
  const [workspaces, total] = await Promise.all([
    Workspace.find(filter)
      .select('name description type ownerId createdAt updatedAt')
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Workspace.countDocuments(filter),
  ])
  return { workspaces, page, limit, total, pages: Math.ceil(total / limit) }
}