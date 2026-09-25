import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['TODO', 'IN_PROGRESS', 'DONE'], default: 'TODO', index: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    deadline: { type: Date, default: null, index: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    attachments: [{ type: String }],
  },
  { timestamps: true },
)

taskSchema.index({ workspaceId: 1, status: 1, deadline: 1 })

taskSchema.pre('validate', function syncProgress(next) {
  if (this.status === 'DONE') this.progress = 100
  if (this.status === 'TODO') this.progress = 0
  next()
})

export const Task = mongoose.model('Task', taskSchema)
