import mongoose from 'mongoose'

const reminderSchema = new mongoose.Schema(
  {
    sendAt: { type: Date, required: true },
    sentAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
  },
  { _id: true },
)

const taskFeedbackSchema = new mongoose.Schema(
  {
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const taskHistorySchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['CREATED', 'UPDATED', 'STATUS_CHANGED', 'ASSIGNEES_CHANGED', 'FEEDBACK_ADDED'], required: true },
    changes: [{
      field: { type: String, required: true },
      from: { type: String, default: '' },
      to: { type: String, default: '' },
      _id: false,
    }],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

const taskSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'CANCELLED', 'REVIEW', 'DONE'], default: 'TODO', index: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    deadline: { type: Date, default: null, index: true },
    completedAt: { type: Date, default: null },
    estimatedHours: { type: Number, min: 0, max: 10000, default: 0 },
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },
    reminders: { type: [reminderSchema], default: [] },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    attachments: [{ type: String }],
    feedback: { type: [taskFeedbackSchema], default: [] },
    history: { type: [taskHistorySchema], default: [] },
  },
  { timestamps: true },
)

taskSchema.index({ workspaceId: 1, status: 1, deadline: 1 })

taskSchema.pre('validate', function syncProgress(next) {
  if (this.status === 'DONE') this.progress = 100
  if (this.status === 'TODO') this.progress = 0
  if (this.isNew && this.status === 'DONE' && !this.completedAt) this.completedAt = new Date()
  if (!this.isNew && this.isModified('status')) {
    this.completedAt = this.status === 'DONE' ? new Date() : null
  }
  next()
})

export const Task = mongoose.model('Task', taskSchema)
