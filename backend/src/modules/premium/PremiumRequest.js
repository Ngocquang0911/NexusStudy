import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['MONTHLY', 'SIX_MONTHS', 'YEARLY'], required: true },
  priceVnd: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'REVIEWED'], default: 'PENDING' },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })
schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } })
export const PremiumRequest = mongoose.model('PremiumRequest', schema)
