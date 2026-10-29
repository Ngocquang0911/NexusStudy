import mongoose from 'mongoose'

const workspaceInvitationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    inviterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
      required: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
)

workspaceInvitationSchema.index(
  { workspaceId: 1, inviteeId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } },
)
workspaceInvitationSchema.index({ inviteeId: 1, status: 1, createdAt: -1 })
workspaceInvitationSchema.index({ workspaceId: 1, status: 1, createdAt: -1 })

export const WorkspaceInvitation = mongoose.model('WorkspaceInvitation', workspaceInvitationSchema)
