import mongoose from 'mongoose'

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 1000 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['COURSE', 'PROJECT', 'THESIS', 'STUDY_GROUP', 'CLUB'], required: true },
    avatar: { type: String, default: '' },
    inviteCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
)

export const Workspace = mongoose.model('Workspace', workspaceSchema)
