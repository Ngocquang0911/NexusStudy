import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import { Notification } from '../notifications/Notification.js'
import { User } from '../users/User.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Task } from './Task.js'
import { addTaskFeedback, updateTask, updateTaskReminders } from './task.service.js'

test('task feedback records activity and notifies only its selected recipient', async (context) => {
  const actorId = new mongoose.Types.ObjectId()
  const recipientId = new mongoose.Types.ObjectId()
  const workspaceId = new mongoose.Types.ObjectId()
  const task = new Task({
    workspaceId,
    title: 'Prepare the presentation',
    createdBy: actorId,
    assignedTo: [recipientId],
  })
  context.mock.method(task, 'save', async function saveTask() { return this })
  context.mock.method(WorkspaceMember, 'findOne', async () => ({ userId: recipientId }))

  let notification
  context.mock.method(Notification, 'findOneAndUpdate', async (...args) => {
    notification = args
    return {}
  })

  const result = await addTaskFeedback(task, actorId, {
    recipientId: recipientId.toString(),
    message: 'Please add the source references.',
  })

  assert.equal(result.feedback.message, 'Please add the source references.')
  assert.equal(result.feedback.recipientId.toString(), recipientId.toString())
  assert.equal(task.history[0].action, 'FEEDBACK_ADDED')
  assert.equal(notification[0].userId.toString(), recipientId.toString())
  assert.equal(notification[1].$setOnInsert.type, 'TASK_FEEDBACK')
})

test('task feedback cannot target an unrelated workspace member', async (context) => {
  const task = new Task({
    workspaceId: new mongoose.Types.ObjectId(),
    title: 'Prepare the presentation',
    createdBy: new mongoose.Types.ObjectId(),
    assignedTo: [new mongoose.Types.ObjectId()],
  })
  const authorId = new mongoose.Types.ObjectId()
  const unrelatedMemberId = new mongoose.Types.ObjectId()

  await assert.rejects(
    addTaskFeedback(task, authorId, {
      recipientId: unrelatedMemberId.toString(),
      message: 'Feedback',
    }),
    { statusCode: 400, message: 'Feedback recipient must be the task creator or an assignee' },
  )
  assert.equal(task.feedback.length, 0)
})

test('task updates ignore protected fields and record status changes', async (context) => {
  const actorId = new mongoose.Types.ObjectId()
  const task = new Task({
    workspaceId: new mongoose.Types.ObjectId(),
    title: 'Write project outline',
    createdBy: actorId,
    assignedTo: [],
    status: 'TODO',
  })
  context.mock.method(task, 'save', async function saveTask() { return this })

  await updateTask(task, actorId, { role: 'OWNER' }, {
    status: 'IN_PROGRESS',
    ownerId: new mongoose.Types.ObjectId(),
    workspaceId: new mongoose.Types.ObjectId(),
  })

  assert.equal(task.status, 'IN_PROGRESS')
  assert.equal(task.ownerId, undefined)
  assert.equal(task.history[0].action, 'STATUS_CHANGED')
  assert.deepEqual(task.history[0].changes.map(({ field }) => field), ['status'])
})

test('only the creator or a workspace leader can change custom task reminders', async () => {
  const task = new Task({
    workspaceId: new mongoose.Types.ObjectId(),
    title: 'Prepare group slides',
    createdBy: new mongoose.Types.ObjectId(),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  await assert.rejects(
    updateTaskReminders(task, new mongoose.Types.ObjectId(), { role: 'MEMBER' }, []),
    { statusCode: 403, message: 'Only a workspace leader or the task creator can manage reminders' },
  )
})

test('a Premium task creator can set a custom reminder schedule', async (context) => {
  const creatorId = new mongoose.Types.ObjectId()
  const task = new Task({
    workspaceId: new mongoose.Types.ObjectId(),
    title: 'Prepare group slides',
    createdBy: creatorId,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  const sendAt = new Date(Date.now() + 60 * 60 * 1000)
  context.mock.method(User, 'findById', () => ({
    select: async () => ({ subscriptionPlan: 'PREMIUM' }),
  }))
  context.mock.method(task, 'save', async function saveTask() { return this })

  await updateTaskReminders(task, creatorId, { role: 'MEMBER' }, [sendAt])

  assert.equal(task.reminders.length, 1)
  assert.equal(task.reminders[0].sendAt.getTime(), sendAt.getTime())
})
