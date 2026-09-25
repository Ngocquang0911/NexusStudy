import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [{ type: String }],
    isPinned: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

messageSchema.index({ channelId: 1, createdAt: -1 })
messageSchema.index({ content: 'text' })

export const Message = mongoose.model('Message', messageSchema)
