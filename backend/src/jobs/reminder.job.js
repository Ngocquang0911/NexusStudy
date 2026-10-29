import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document } from '../modules/documents/Document.js'
import { isSmtpConfigured, sendDeadlineReminder } from '../modules/notifications/email.service.js'
import { Notification } from '../modules/notifications/Notification.js'
import { Poll } from '../modules/polls/Poll.js'
import { getUserPlan, PLAN_LIMITS } from '../modules/plans/plan.service.js'
import { Task } from '../modules/tasks/Task.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from '../modules/workspaces/Workspace.js'
import { runDeletedWorkspaceRetentionJobs } from '../modules/workspaces/workspace.archive.service.js'
import { expirePendingWorkspaceInvitations } from '../modules/workspaces/workspace.service.js'

const STALE_LOCK_MS = 10 * 60 * 1000
let running = false

export async function closeExpiredPolls(now = new Date()) {
  const activeWorkspaceIds = await Workspace.find(ACTIVE_WORKSPACE_QUERY).distinct('_id')
  return Poll.updateMany(
    { workspaceId: { $in: activeWorkspaceIds }, isClosed: false, expiresAt: { $lte: now } },
    { $set: { isClosed: true } },
  )
}

async function removeExpiredDocuments(now) {
  const archiveWorkspaceIds = await Workspace.find({
    status: 'DELETED',
    purgeAt: { $gt: now },
  }).distinct('_id')
  const outsideArchive = { workspaceId: { $nin: archiveWorkspaceIds } }
  const legacyDocuments = await Document.find({ expiresAt: null, ...outsideArchive }).limit(100)
  for (const document of legacyDocuments) {
    const plan = await getUserPlan(document.uploadedBy)
    document.expiresAt = new Date(document.createdAt.getTime() + PLAN_LIMITS[plan].documentRetentionDays * 24 * 60 * 60 * 1000)
    await document.save()
  }
  const expired = await Document.find({ expiresAt: { $lte: now }, isLink: false, ...outsideArchive }).limit(100)
  for (const document of expired) {
    const filePath = fileURLToPath(new URL(`../../uploads/${path.basename(document.fileUrl)}`, import.meta.url))
    try {
      await unlink(filePath)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    await document.deleteOne()
  }
  await Document.deleteMany({ expiresAt: { $lte: now }, isLink: true, ...outsideArchive })
}

async function deliverDueReminders(now) {
  const staleLock = new Date(now.getTime() - STALE_LOCK_MS)
  const activeWorkspaceIds = await Workspace.find(ACTIVE_WORKSPACE_QUERY).distinct('_id')
  const dueTasks = await Task.find({
    workspaceId: { $in: activeWorkspaceIds },
    status: { $nin: ['DONE', 'CANCELLED'] },
    deadline: { $ne: null },
    reminders: { $elemMatch: { sendAt: { $lte: now }, sentAt: null } },
  }).limit(100).populate('assignedTo', 'name email').populate('createdBy', 'name email')

  for (const task of dueTasks) {
    for (const reminder of task.reminders) {
      if (reminder.sendAt > now || reminder.sentAt) continue
      const claimed = await Task.findOneAndUpdate(
        {
          _id: task._id,
          status: { $nin: ['DONE', 'CANCELLED'] },
          reminders: {
            $elemMatch: {
              _id: reminder._id,
              sendAt: { $lte: now },
              sentAt: null,
              $or: [{ lockedAt: null }, { lockedAt: { $lt: staleLock } }],
            },
          },
        },
        { $set: { 'reminders.$[item].lockedAt': now } },
        {
          new: true,
          arrayFilters: [
            {
              'item._id': reminder._id,
              'item.sentAt': null,
              'item.sendAt': { $lte: now },
              $or: [{ 'item.lockedAt': null }, { 'item.lockedAt': { $lt: staleLock } }],
            },
          ],
        },
      )
      if (!claimed) continue

      try {
        const recipients = task.assignedTo.length ? task.assignedTo : [task.createdBy]
        for (const recipient of recipients) {
          if (!recipient?.email) continue
          await Notification.findOneAndUpdate(
            { userId: recipient._id, taskId: task._id, reminderKey: reminder._id.toString() },
            {
              $setOnInsert: {
                workspaceId: task.workspaceId,
                type: 'TASK_DEADLINE',
                title: 'Task deadline reminder',
                message: `"${task.title}" is due ${new Date(task.deadline).toLocaleString()}.`,
              },
            },
            { upsert: true, new: true },
          )
        }
        await Task.updateOne(
          { _id: task._id, 'reminders._id': reminder._id },
          { $set: { 'reminders.$.sentAt': now, 'reminders.$.lockedAt': null } },
        )
      } catch (error) {
        await Task.updateOne(
          { _id: task._id, 'reminders._id': reminder._id },
          { $set: { 'reminders.$.lockedAt': null } },
        )
        throw error
      }
    }
  }
}

async function deliverPendingNotificationEmails(now) {
  if (!isSmtpConfigured()) return
  const staleLock = new Date(now.getTime() - STALE_LOCK_MS)
  const activeWorkspaceIds = await Workspace.find(ACTIVE_WORKSPACE_QUERY).distinct('_id')
  const pending = await Notification.find({
    workspaceId: { $in: activeWorkspaceIds },
    type: 'TASK_DEADLINE',
    emailSentAt: null,
    $or: [{ emailLockedAt: null }, { emailLockedAt: { $lt: staleLock } }],
  })
    .sort({ createdAt: 1 })
    .limit(100)

  for (const candidate of pending) {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: candidate._id,
        type: 'TASK_DEADLINE',
        emailSentAt: null,
        $or: [{ emailLockedAt: null }, { emailLockedAt: { $lt: staleLock } }],
      },
      {
        $set: { emailLockedAt: now, emailError: '' },
        $inc: { emailAttempts: 1 },
      },
      { new: true },
    )
      .populate('userId', 'email')
      .populate('taskId', 'title deadline status')
      .populate('workspaceId', 'name')
    if (!notification) continue

    if (!notification.userId?.email || !notification.taskId
      || ['DONE', 'CANCELLED'].includes(notification.taskId.status)
      || notification.taskId.deadline <= now) {
      await Notification.updateOne(
        { _id: notification._id, emailSentAt: null },
        { $set: { emailSentAt: now, emailLockedAt: null } },
      )
      continue
    }

    try {
      await sendDeadlineReminder({
        to: notification.userId.email,
        taskTitle: notification.taskId.title,
        workspaceName: notification.workspaceId?.name || 'your workspace',
        deadline: notification.taskId.deadline,
      })
    } catch (error) {
      await Notification.updateOne(
        { _id: notification._id, emailSentAt: null },
        { $set: { emailLockedAt: null, emailError: 'SMTP delivery failed' } },
      )
      throw error
    }
    await Notification.updateOne(
      { _id: notification._id, emailSentAt: null },
      { $set: { emailSentAt: now, emailLockedAt: null, emailError: '' } },
    )
  }
}

export async function runReminderJobs() {
  if (running) return
  running = true
  try {
    const now = new Date()
    await runDeletedWorkspaceRetentionJobs(now)
    await expirePendingWorkspaceInvitations(now)
    await closeExpiredPolls(now)
    await removeExpiredDocuments(now)
    await deliverDueReminders(now)
    await deliverPendingNotificationEmails(now)
  } catch (error) {
    console.error('Scheduled retention or reminder job failed', error)
  } finally {
    running = false
  }
}

export function startReminderJobs() {
  const timer = setInterval(() => { void runReminderJobs() }, 60_000)
  timer.unref()
  void runReminderJobs()
  return timer
}
