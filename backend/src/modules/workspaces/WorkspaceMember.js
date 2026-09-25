import mongoose from 'mongoose'

const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['OWNER', 'LEADER', 'MEMBER', 'ADVISOR'], default: 'MEMBER' },
  },
  { timestamps: { createdAt: 'joinedAt', updatedAt: false } },
)

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true })

export const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema)
