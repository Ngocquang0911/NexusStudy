import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    directKey: { type: String },
    isPrivate: { type: Boolean, default: false },
    allowedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
)

channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true })
channelSchema.index({ workspaceId: 1, directKey: 1 }, { unique: true, partialFilterExpression: { directKey: { $type: 'string' } } })

export const Channel = mongoose.model('Channel', channelSchema)
