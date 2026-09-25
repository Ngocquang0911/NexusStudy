import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true, min: 0, default: 0 },
    isLink: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

documentSchema.index({ workspaceId: 1, createdAt: -1 })

export const Document = mongoose.model('Document', documentSchema)
