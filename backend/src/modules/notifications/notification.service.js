import { Notification } from './Notification.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from '../workspaces/Workspace.js'

function notificationError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function getVisibleWorkspaceFilter(userId, now = new Date()) {
  const workspaces = await Workspace.find(ACTIVE_WORKSPACE_QUERY).select('_id')
  const deletedSpaces = await Workspace.find({
    status: 'DELETED',
    purgeAt: { $gt: now },
    deletedMemberIds: userId,
  }).select('_id')
  return {
    $or: [
      { workspaceId: { $in: workspaces.map(({ _id }) => _id) } },
      {
        workspaceId: { $in: deletedSpaces.map(({ _id }) => _id) },
        type: 'WORKSPACE_DELETED',
      },
    ],
  }
}

export async function listNotifications(userId) {
  return Notification.find({ userId, ...await getVisibleWorkspaceFilter(userId) }).sort({ createdAt: -1 }).limit(100)
}

export async function createTaskNotification({ userId, workspaceId, taskId, activityId, type, title, message }) {
  return Notification.findOneAndUpdate(
    { userId, taskId, reminderKey: `task-activity:${activityId}` },
    {
      $setOnInsert: {
        workspaceId,
        type,
        title,
        message,
      },
    },
    { upsert: true, new: true },
  )
}

export async function createInvitationNotification({
  userId,
  workspaceId,
  invitationId,
  type = 'INVITATION',
  title,
  message,
  invitationStatus = 'PENDING',
}) {
  return Notification.findOneAndUpdate(
    { userId, reminderKey: `invitation:${invitationId}:${type}` },
    {
      $setOnInsert: {
        workspaceId,
        invitationId,
        invitationStatus,
        type,
        title,
        message,
      },
    },
    { upsert: true, new: true },
  )
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, ...await getVisibleWorkspaceFilter(userId) },
    { readAt: new Date() },
    { new: true },
  )
  if (!notification) throw notificationError('Notification not found', 404)
  return notification
}

export async function markAllNotificationsRead(userId) {
  await Notification.updateMany(
    { userId, readAt: null, ...await getVisibleWorkspaceFilter(userId) },
    { readAt: new Date() },
  )
}

export async function dismissNotification(userId, notificationId) {
  const result = await Notification.deleteOne({
    _id: notificationId,
    userId,
    ...await getVisibleWorkspaceFilter(userId),
  })
  if (!result.deletedCount) throw notificationError('Notification not found', 404)
}
