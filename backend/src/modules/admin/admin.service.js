import mongoose from 'mongoose'
import { Document } from '../documents/Document.js'
import { Message } from '../chat/Message.js'
import { Notification } from '../notifications/Notification.js'
import { Poll } from '../polls/Poll.js'
import { Task } from '../tasks/Task.js'
import { User } from '../users/User.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from '../workspaces/Workspace.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { AdminAuditLog } from './AdminAuditLog.js'

const systemRoles = ['STUDENT', 'LECTURER', 'ADMIN']

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 20 : Number(query.limit)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    const error = new Error('Page and limit must be positive integers')
    error.statusCode = 400
    throw error
  }
  const boundedLimit = Math.min(100, limit)
  return { page, limit: boundedLimit, skip: (page - 1) * boundedLimit }
}

function parseSearch(search) {
  if (search === undefined || search === '') return ''
  if (typeof search !== 'string' || search.length > 100) {
    const error = new Error('Search must be a string of no more than 100 characters')
    error.statusCode = 400
    throw error
  }
  return search.trim()
}

function getRangeDays(range) {
  const ranges = { '7d': 7, '30d': 30, '90d': 90 }
  const days = ranges[range || '30d']
  if (!days) {
    const error = new Error('Range must be 7d, 30d, or 90d')
    error.statusCode = 400
    throw error
  }
  return days
}

function getDailySeries(aggregate, days, now) {
  const counts = new Map(aggregate.map(({ _id, count }) => [_id, count]))
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Array.from({ length: days }, (_value, index) => {
    const date = new Date(today)
    date.setUTCDate(today.getUTCDate() - days + index + 1)
    const key = date.toISOString().slice(0, 10)
    return { date: key, count: counts.get(key) || 0 }
  })
}

function dailyCounts(model, start, additionalFilter = {}) {
  return model.aggregate([
    { $match: { ...additionalFilter, createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])
}

export async function getAdminOverview(range = '30d', now = new Date()) {
  const days = getRangeDays(range)
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 6)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(today.getUTCDate() - 29)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const chartStart = new Date(today)
  chartStart.setUTCDate(today.getUTCDate() - days + 1)
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [
    users,
    admins,
    usersToday,
    usersLast7Days,
    usersLast30Days,
    freeUsers,
    premiumUsers,
    workspaces,
    workspacesThisMonth,
    workspaceMembers,
    tasks,
    completedTasks,
    overdueTasks,
    polls,
    documents,
    documentStorageBytes,
    documentsExpiringSoon,
    messages,
    notifications,
    recentUsers,
    recentWorkspaces,
    recentAdminChanges,
    userGrowth,
    workspaceGrowth,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ systemRole: 'ADMIN' }),
    User.countDocuments({ createdAt: { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ subscriptionPlan: 'FREE' }),
    User.countDocuments({ subscriptionPlan: 'PREMIUM' }),
    Workspace.countDocuments(ACTIVE_WORKSPACE_QUERY),
    Workspace.countDocuments({ ...ACTIVE_WORKSPACE_QUERY, createdAt: { $gte: monthStart } }),
    WorkspaceMember.countDocuments(),
    Task.countDocuments(),
    Task.countDocuments({ status: 'DONE' }),
    Task.countDocuments({ status: { $nin: ['DONE', 'CANCELLED'] }, deadline: { $lt: now, $ne: null } }),
    Poll.countDocuments(),
    Document.countDocuments({ expiresAt: { $gt: now } }),
    Document.aggregate([
      { $match: { expiresAt: { $gt: now }, isLink: false } },
      { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } },
    ]),
    Document.countDocuments({ expiresAt: { $gt: now, $lte: nextWeek } }),
    Message.countDocuments({ deletedAt: null }),
    Notification.countDocuments(),
    User.find().select('name email systemRole subscriptionPlan createdAt').sort({ createdAt: -1 }).limit(6),
    Workspace.find(ACTIVE_WORKSPACE_QUERY).select('name ownerId createdAt').populate('ownerId', 'name').sort({ createdAt: -1 }).limit(6),
    AdminAuditLog.find()
      .select('actorId action targetLabel previousValue newValue createdAt')
      .populate('actorId', 'name')
      .sort({ createdAt: -1 })
      .limit(8),
    dailyCounts(User, chartStart),
    dailyCounts(Workspace, chartStart, ACTIVE_WORKSPACE_QUERY),
  ])
  const recentActivity = [
    ...recentUsers.map((user) => ({
      id: `user:${user._id}`,
      type: 'USER_REGISTERED',
      title: `New account: ${user.name}`,
      detail: user.email,
      createdAt: user.createdAt,
    })),
    ...recentWorkspaces.map((workspace) => ({
      id: `workspace:${workspace._id}`,
      type: 'WORKSPACE_CREATED',
      title: `New workspace: ${workspace.name}`,
      detail: workspace.ownerId?.name ? `Owner: ${workspace.ownerId.name}` : 'Owner unavailable',
      createdAt: workspace.createdAt,
    })),
    ...recentAdminChanges.map((log) => ({
      id: `audit:${log._id}`,
      type: log.action,
      title: log.action === 'USER_ROLE_CHANGED' ? 'System role changed' : log.action === 'WORKSPACE_DELETED' ? 'Workspace deleted' : 'Subscription plan changed',
      detail: `${log.targetLabel}: ${log.previousValue} -> ${log.newValue}`,
      createdAt: log.createdAt,
    })),
  ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 8)

  return {
    users: {
      total: users,
      admins,
      free: freeUsers,
      premium: premiumUsers,
      newToday: usersToday,
      newLast7Days: usersLast7Days,
      newLast30Days: usersLast30Days,
    },
    workspaces: { total: workspaces, createdThisMonth: workspacesThisMonth, members: workspaceMembers },
    tasks: { total: tasks, completed: completedTasks, overdue: overdueTasks },
    content: { polls, activeDocuments: documents, documentStorageBytes: documentStorageBytes[0]?.totalBytes || 0, documentsExpiringSoon, messages, notifications },
    trends: {
      range: `${days}d`,
      users: getDailySeries(userGrowth, days, now),
      workspaces: getDailySeries(workspaceGrowth, days, now),
    },
    capabilities: { activeUsers: false, aiUsage: false, reports: false },
    recentActivity,
    recentUsers,
  }
}

export async function listAdminUsers(query) {
  const { page, limit, skip } = parsePagination(query)
  const filter = {}
  const search = parseSearch(query.search)
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: expression }, { email: expression }]
  }
  if (query.role) {
    if (!systemRoles.includes(query.role)) {
      const error = new Error('Invalid system role filter')
      error.statusCode = 400
      throw error
    }
    filter.systemRole = query.role
  }
  if (query.plan) {
    if (!['FREE', 'PREMIUM'].includes(query.plan)) {
      const error = new Error('Plan filter must be FREE or PREMIUM')
      error.statusCode = 400
      throw error
    }
    filter.subscriptionPlan = query.plan
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('name email avatar systemRole subscriptionPlan createdAt updatedAt').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ])
  const workspaceCounts = users.length ? await WorkspaceMember.aggregate([
    { $match: { userId: { $in: users.map(({ _id }) => _id) } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]) : []
  const countsByUser = new Map(workspaceCounts.map(({ _id, count }) => [_id.toString(), count]))
  const enrichedUsers = users.map((user) => ({
    ...user.toJSON(),
    workspaceCount: countsByUser.get(user._id.toString()) || 0,
  }))
  return { users: enrichedUsers, page, limit, total, pages: Math.ceil(total / limit) }
}

function requireReason(reason) {
  if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
    const error = new Error('A reason of 1 to 500 characters is required')
    error.statusCode = 400
    throw error
  }
  return reason.trim()
}

export async function updateSystemRole(userId, role, actorId, reason) {
  const auditReason = requireReason(reason)
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

  const user = await User.findById(userId).select('name email systemRole subscriptionPlan createdAt updatedAt')
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

  const previousRole = user.systemRole
  if (previousRole === role) return user
  user.systemRole = role
  await user.save()
  await AdminAuditLog.create({
    actorId,
    action: 'USER_ROLE_CHANGED',
    targetType: 'USER',
    targetId: user._id,
    targetLabel: user.email,
    previousValue: previousRole,
    newValue: role,
    reason: auditReason,
  })
  return user
}

export async function updateSubscriptionPlan(userId, plan, actorId, reason) {
  const auditReason = requireReason(reason)
  if (!['FREE', 'PREMIUM'].includes(plan)) {
    const error = new Error('Plan must be FREE or PREMIUM')
    error.statusCode = 400
    throw error
  }
  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }
  const user = await User.findById(userId).select('name email systemRole subscriptionPlan createdAt updatedAt')
  if (!user) {
    const error = new Error('User not found')
    error.statusCode = 404
    throw error
  }
  const previousPlan = user.subscriptionPlan
  if (previousPlan === plan) return user
  user.subscriptionPlan = plan
  await user.save()
  await AdminAuditLog.create({
    actorId,
    action: 'SUBSCRIPTION_PLAN_CHANGED',
    targetType: 'USER',
    targetId: user._id,
    targetLabel: user.email,
    previousValue: previousPlan,
    newValue: plan,
    reason: auditReason,
  })
  return user
}

function getAdminWorkspaceStatusFilter(status) {
  if (status === 'ALL') return {}
  if (status === 'ACTIVE') return ACTIVE_WORKSPACE_QUERY
  if (status === 'DELETED') return { status: 'DELETED' }
  if (status === 'PURGING') return { status: 'PURGING' }
  const error = new Error('Status must be ALL, ACTIVE, DELETED, or PURGING')
  error.statusCode = 400
  throw error
}

function adminWorkspaceStatus(workspace) {
  if (workspace.status === 'PURGING') return 'PURGING'
  if (workspace.deletedAt || workspace.status === 'DELETED') return 'DELETED'
  return 'ACTIVE'
}

export async function listAdminWorkspaces(query) {
  const { page, limit, skip } = parsePagination(query)
  const search = parseSearch(query.search)
  const status = query.status || 'ALL'
  const statusFilter = getAdminWorkspaceStatusFilter(status)
  const filter = { ...statusFilter }
  if (search) {
    const expression = new RegExp(escapeRegex(search), 'i')
    const matchingOwners = await User.find({ $or: [{ name: expression }, { email: expression }] }).select('_id')
    filter.$or = [{ name: expression }, { ownerId: { $in: matchingOwners.map(({ _id }) => _id) } }]
  }

  const [workspaces, total, activeCount, deletedCount, purgingCount] = await Promise.all([
    Workspace.find(filter)
      .select('name description type ownerId status deletedAt createdAt updatedAt')
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Workspace.countDocuments(filter),
    Workspace.countDocuments(ACTIVE_WORKSPACE_QUERY),
    Workspace.countDocuments({ status: 'DELETED' }),
    Workspace.countDocuments({ status: 'PURGING' }),
  ])

  const workspaceIds = workspaces.map(({ _id }) => _id)
  const memberCounts = workspaceIds.length
    ? await WorkspaceMember.aggregate([
      { $match: { workspaceId: { $in: workspaceIds } } },
      { $group: { _id: '$workspaceId', count: { $sum: 1 } } },
    ])
    : []
  const countsByWorkspace = new Map(memberCounts.map(({ _id, count }) => [String(_id), count]))

  return {
    workspaces: workspaces.map((workspace) => ({
      ...workspace.toJSON(),
      status: adminWorkspaceStatus(workspace),
      memberCount: countsByWorkspace.get(String(workspace._id)) || 0,
    })),
    summary: {
      total: activeCount + deletedCount + purgingCount,
      active: activeCount,
      deleted: deletedCount,
      purging: purgingCount,
    },
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  }
}

export async function getAdminWorkspace(workspaceId) {
  if (!mongoose.isValidObjectId(workspaceId)) {
    const error = new Error('Workspace not found')
    error.statusCode = 404
    throw error
  }

  const workspace = await Workspace.findById(workspaceId)
    .select('name description type ownerId status deletedAt purgeAt createdAt updatedAt')
    .populate('ownerId', 'name email')
  if (!workspace) {
    const error = new Error('Workspace not found')
    error.statusCode = 404
    throw error
  }

  const members = await WorkspaceMember.find({ workspaceId: workspace._id })
    .select('userId role joinedAt')
    .populate('userId', 'name email avatar')
    .sort({ joinedAt: 1 })

  return {
    workspace: { ...workspace.toJSON(), status: adminWorkspaceStatus(workspace) },
    members,
  }
}