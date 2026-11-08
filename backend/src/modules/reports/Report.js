import mongoose from 'mongoose'
const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  targetType: { type: String, enum: ['USER', 'WORKSPACE'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  status: { type: String, enum: ['OPEN', 'RESOLVED', 'DISMISSED'], default: 'OPEN', index: true },
  resolution: { type: String, maxlength: 1000, default: '' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  handledAt: { type: Date, default: null },
}, { timestamps: true })
reportSchema.index({ status: 1, createdAt: -1 })
export const Report = mongoose.model('Report', reportSchema)
