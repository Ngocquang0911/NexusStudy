import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true },
)

channelSchema.index({ workspaceId: 1, name: 1 }, { unique: true })

export const Channel = mongoose.model('Channel', channelSchema)
