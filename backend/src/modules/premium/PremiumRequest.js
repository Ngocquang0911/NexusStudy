import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['MONTHLY', 'SIX_MONTHS', 'YEARLY'], required: true },
  priceVnd: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REVIEWED'], default: 'PENDING' },
  transactionRef: { type: String, default: undefined },
  provider: { type: String, default: null },
  paymentUrl: { type: String, default: null },
  paymentLinkId: { type: String, default: null },
  paidAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  gatewayTransactionNo: { type: String, default: null },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })
schema.index({ userId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'PENDING_PAYMENT'] } } })
schema.index({ transactionRef: 1 }, { unique: true, sparse: true })
schema.index({ gatewayTransactionNo: 1 }, { unique: true, partialFilterExpression: { gatewayTransactionNo: { $type: 'string' } } })
export const PremiumRequest = mongoose.model('PremiumRequest', schema)
