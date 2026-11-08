import mongoose from 'mongoose'

const reminderSchema = new mongoose.Schema({
  sendAt: { type: Date, required: true },
  sentAt: { type: Date, default: null },
  lockedAt: { type: Date, default: null },
})

const appointmentSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, default: '', maxlength: 2000 },
  startsAt: { type: Date, required: true, index: true },
  attendeeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reminders: { type: [reminderSchema], default: [] },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true })

appointmentSchema.index({ workspaceId: 1, startsAt: 1 })

export const Appointment = mongoose.model('Appointment', appointmentSchema)
