import mongoose from 'mongoose'

const pollOptionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 200 },
})

const pollVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const pollSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true, trim: true, maxlength: 500 },
    options: { type: [pollOptionSchema], validate: [(options) => options.length >= 2, 'At least two options are required'] },
    votes: { type: [pollVoteSchema], default: [] },
    expiresAt: { type: Date, required: true, index: true },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true },
)

pollSchema.index({ workspaceId: 1, createdAt: -1 })

export const Poll = mongoose.model('Poll', pollSchema)
