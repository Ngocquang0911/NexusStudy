import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkspaceInvitation', default: null, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    reminderKey: { type: String, required: true },
    type: { type: String, required: true, default: 'TASK_DEADLINE' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    readAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
    emailLockedAt: { type: Date, default: null },
    emailAttempts: { type: Number, default: 0 },
    emailError: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true },
)

notificationSchema.index({ userId: 1, taskId: 1, reminderKey: 1 }, { unique: true })
notificationSchema.index({ userId: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
