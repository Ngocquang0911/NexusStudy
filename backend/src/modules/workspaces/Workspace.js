import mongoose from 'mongoose'

export const ACTIVE_WORKSPACE_QUERY = {
  deletedAt: null,
  status: { $in: ['ACTIVE', null] },
}

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['COURSE', 'PROJECT', 'THESIS', 'STUDY_GROUP', 'CLUB'], required: true },
    avatar: { type: String, default: '' },
    inviteCode: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'DELETED', 'PURGING'], default: 'ACTIVE', index: true },
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    purgeAt: { type: Date, default: null, index: true },
    deletedMemberIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deletionNoticesSentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, result) {
        delete result.inviteCode
        return result
      },
    },
  },
)

workspaceSchema.index({ status: 1, purgeAt: 1 })
workspaceSchema.index({ deletedMemberIds: 1, status: 1, purgeAt: 1 })

export const Workspace = mongoose.model('Workspace', workspaceSchema)
