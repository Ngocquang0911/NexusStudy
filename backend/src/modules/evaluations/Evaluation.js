import mongoose from 'mongoose'

const criterionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ['RESPONSIBILITY', 'TASK_COMPLETION', 'COLLABORATION', 'ATTENDANCE', 'WORK_QUALITY', 'COMMUNICATION'],
      required: true,
    },
    score: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false },
)

const evaluationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    evaluatedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: { type: String, required: true, default: 'current' },
    periodEndsAt: { type: Date, required: true },
    criteria: { type: [criterionSchema], required: true, validate: [(criteria) => criteria.length > 0, 'At least one criterion is required'] },
    comment: { type: String, default: '', maxlength: 2000 },
    score: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

evaluationSchema.index({ workspaceId: 1, evaluatorId: 1, evaluatedUserId: 1, period: 1 }, { unique: true })
evaluationSchema.index({ workspaceId: 1, period: 1 })

export const Evaluation = mongoose.model('Evaluation', evaluationSchema)
