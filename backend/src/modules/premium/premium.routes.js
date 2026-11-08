import { Router } from 'express'
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { SePayPgClient } from 'sepay-pg-node'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { env } from '../../config/env.js'
import { User } from '../users/User.js'
import { PremiumRequest } from './PremiumRequest.js'

export const PREMIUM_PRICES = Object.freeze({ MONTHLY: 39000, SIX_MONTHS: 150000, YEARLY: 289000 })
const router = Router()
function extendPlan(baseDate, plan) {
  const months = { MONTHLY: 1, SIX_MONTHS: 6, YEARLY: 12 }[plan]
  const day = baseDate.getUTCDate()
  const result = new Date(baseDate)
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  result.setUTCDate(Math.min(day, new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()))
  return result
}
router.post('/premium/payment/webhook', async (req, res) => {
  const expected = Buffer.from(env.sepayIpnSecret)
  const received = Buffer.from(req.get('X-Secret-Key') || '')
  if (!expected.length || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.status(401).json({ success: false })
  const { notification_type: type, order: payment, transaction } = req.body || {}
  if (type !== 'ORDER_PAID') return res.status(200).json({ success: true })
  if (!payment?.order_invoice_number || payment.order_status !== 'CAPTURED' || payment.order_currency !== 'VND' || transaction?.transaction_status !== 'APPROVED' || transaction?.transaction_currency !== 'VND' || !transaction?.transaction_id) return res.status(400).json({ success: false })
  let session
  try {
    session = await mongoose.startSession()
    await session.withTransaction(async () => {
      const order = await PremiumRequest.findOne({ transactionRef: payment.order_invoice_number, provider: 'SEPAY' }).session(session)
      if (!order || Number(payment.order_amount) !== order.priceVnd || Number(transaction.transaction_amount) !== order.priceVnd) throw new Error('Invalid order')
      if (order.status === 'PAID') {
        if (order.gatewayTransactionNo !== transaction.transaction_id) throw new Error('Duplicate payment')
        return
      }
      if (!['PENDING_PAYMENT', 'FAILED'].includes(order.status)) throw new Error('Order unavailable')
      const user = await User.findById(order.userId).session(session)
      if (!user || user.systemRole === 'ADMIN') throw new Error('User unavailable')
      const now = new Date()
      const base = user.subscriptionPlan === 'PREMIUM' && user.subscriptionExpiresAt > now ? user.subscriptionExpiresAt : now
      user.subscriptionPlan = 'PREMIUM'
      user.subscriptionExpiresAt = extendPlan(base, order.plan)
      order.status = 'PAID'
      order.paidAt = now
      order.gatewayTransactionNo = transaction.transaction_id
      await user.save({ session })
      await order.save({ session })
    })
    return res.status(200).json({ success: true })
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to process payment' }) }
  finally { if (session) await session.endSession() }
})
router.use(requireAuth)
router.get('/premium/request', async (req, res, next) => {
  try { const request = await PremiumRequest.findOne({ userId: req.auth.userId }).sort({ createdAt: -1 }); res.json({ success: true, data: request }) } catch (err) { next(err) }
})
router.post('/premium/payment', async (req, res, next) => {
  try {
    const plan = req.body?.plan
    if (!Object.hasOwn(PREMIUM_PRICES, plan)) return res.status(400).json({ success: false, message: 'Invalid plan' })
    if (!env.sepayMerchantId || !env.sepaySecretKey || !env.sepayIpnSecret || !['sandbox', 'production'].includes(env.sepayEnv)) return res.status(503).json({ success: false, message: 'SePay is not configured on the server.' })
    const user = await User.findById(req.auth.userId).select('systemRole')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.systemRole === 'ADMIN') return res.status(400).json({ success: false, message: 'Admin accounts cannot purchase Premium.' })
    const now = new Date()
    await PremiumRequest.updateMany({ userId: user._id, status: 'PENDING_PAYMENT', expiresAt: { $lte: now } }, { $set: { status: 'FAILED' } })
    let order = await PremiumRequest.findOne({ userId: user._id, status: 'PENDING_PAYMENT' })
    if (order && order.provider !== 'SEPAY') return res.status(409).json({ success: false, message: 'An earlier payment is still pending; wait until it expires.' })
    if (!order) order = await PremiumRequest.create({ userId: user._id, plan, priceVnd: PREMIUM_PRICES[plan], status: 'PENDING_PAYMENT', provider: 'SEPAY', transactionRef: `NS${crypto.randomBytes(12).toString('hex')}`, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) })
    const client = new SePayPgClient({ env: env.sepayEnv, merchant_id: env.sepayMerchantId, secret_key: env.sepaySecretKey })
    const fields = client.checkout.initOneTimePaymentFields({ payment_method: 'BANK_TRANSFER', order_invoice_number: order.transactionRef, order_amount: order.priceVnd, currency: 'VND', order_description: `NEXUS Premium ${order.plan}`, success_url: `${env.clientUrl}/premium?payment=returned`, error_url: `${env.clientUrl}/premium?payment=error`, cancel_url: `${env.clientUrl}/premium?payment=cancelled` })
    return res.status(200).json({ success: true, data: { checkoutUrl: client.checkout.initCheckoutUrl(), fields } })
  } catch (err) { if (err.code === 11000) return res.status(409).json({ success: false, message: 'You already have an active payment.' }); return next(err) }
})
router.post('/premium/request', (_req, res) => res.status(410).json({ success: false, message: 'Start a SePay payment instead.' }))
router.get('/admin/premium-requests', requireAdmin, async (_req, res, next) => {
  try { const requests = await PremiumRequest.find({ status: 'PENDING' }).populate('userId', 'name email subscriptionPlan').sort({ createdAt: 1 }).limit(200); res.json({ success: true, data: requests }) } catch (err) { next(err) }
})
router.patch('/admin/premium-requests/:id/review', requireAdmin, async (req, res, next) => {
  try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request id' }); const request = await PremiumRequest.findOneAndUpdate({ _id: req.params.id, status: 'PENDING' }, { status: 'REVIEWED', reviewedAt: new Date(), reviewedBy: req.auth.userId }, { new: true }); if (!request) return res.status(404).json({ success: false, message: 'Pending request not found' }); return res.json({ success: true, data: request }) } catch (err) { next(err) }
})
export default router
