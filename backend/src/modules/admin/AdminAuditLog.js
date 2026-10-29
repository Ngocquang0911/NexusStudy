import mongoose from 'mongoose'

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, enum: ['USER_ROLE_CHANGED', 'SUBSCRIPTION_PLAN_CHANGED', 'WORKSPACE_DELETED'], index: true },
    targetType: { type: String, required: true, enum: ['USER', 'WORKSPACE'] },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    targetLabel: { type: String, required: true, maxlength: 200 },
    previousValue: { type: String, required: true, maxlength: 100 },
    newValue: { type: String, required: true, maxlength: 100 },
    reason: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

adminAuditLogSchema.index({ createdAt: -1 })

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema)
