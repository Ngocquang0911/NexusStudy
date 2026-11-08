import { Router } from 'express'
import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { env } from '../../config/env.js'
import { User } from '../users/User.js'
import { PremiumRequest } from './PremiumRequest.js'

export const PREMIUM_PRICES = Object.freeze({ MONTHLY: 39000, SIX_MONTHS: 150000, YEARLY: 289000 })
const router = Router()

function createPaymentSignature({ amount, orderCode, description, returnUrl, cancelUrl }) {
  const data = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`
  return crypto.createHmac('sha256', env.payosChecksumKey).update(data).digest('hex')
}

function webhookSignature(data) {
  const values = Object.keys(data).sort().map((key) => {
    let value = data[key]
    if (Array.isArray(value)) value = JSON.stringify(value.map((item) => item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map((nestedKey) => [nestedKey, item[nestedKey]])) : item))
    if (value === null || value === undefined || value === 'null' || value === 'undefined') value = ''
    return `${key}=${value}`
  })
  return crypto.createHmac('sha256', env.payosChecksumKey).update(values.join('&')).digest('hex')
}

function isValidWebhookSignature(data, signature) {
  if (!env.payosChecksumKey || !/^[a-f0-9]{64}$/i.test(signature || '')) return false
  const expected = Buffer.from(webhookSignature(data), 'hex')
  const received = Buffer.from(signature, 'hex')
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

function extendPlan(baseDate, plan) {
  const months = { MONTHLY: 1, SIX_MONTHS: 6, YEARLY: 12 }[plan]
  const day = baseDate.getUTCDate()
  const extended = new Date(baseDate)
  extended.setUTCDate(1)
  extended.setUTCMonth(extended.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(extended.getUTCFullYear(), extended.getUTCMonth() + 1, 0)).getUTCDate()
  extended.setUTCDate(Math.min(day, lastDay))
  return extended
}

async function activatePaidOrder(order, transactionReference) {
  if (order.status === 'PAID') return
  const user = await User.findById(order.userId)
  if (!user || user.systemRole === 'ADMIN') throw new Error('Premium payment account is unavailable')
  const now = new Date()
  const claimed = await PremiumRequest.findOneAndUpdate(
    { _id: order._id, status: 'PENDING_PAYMENT', expiresAt: { $gt: now } },
    { $set: { status: 'PAID', paidAt: now, gatewayTransactionNo: transactionReference || null } },
    { new: true },
  )
  if (!claimed) {
    const latest = await PremiumRequest.findById(order._id).select('status')
    if (latest?.status === 'PAID') return
    throw new Error('Premium payment order is expired or already processed')
  }
  const base = user.subscriptionPlan === 'PREMIUM' && user.subscriptionExpiresAt > now ? user.subscriptionExpiresAt : now
  user.subscriptionPlan = 'PREMIUM'
  user.subscriptionExpiresAt = extendPlan(base, order.plan)
  await user.save()
}

// PayOS calls this public endpoint; the HMAC signature and amount are verified before activation.
router.post('/premium/payment/webhook', async (req, res) => {
  const { data, signature } = req.body || {}
  if (!data || !isValidWebhookSignature(data, signature)) return res.status(400).json({ success: false, message: 'Invalid PayOS webhook signature' })
  try {
    const order = await PremiumRequest.findOne({ transactionRef: String(data.orderCode) })
    if (!order) return res.status(200).json({ success: true, message: 'Order not found; event ignored' })
    if (Number(data.amount) !== order.priceVnd) return res.status(400).json({ success: false, message: 'Payment amount does not match the order' })
    if (data.code === '00' && data.currency !== 'VND' && data.currency !== undefined) return res.status(400).json({ success: false, message: 'Payment currency does not match the order' })
    if (data.code !== '00') {
      if (order.status === 'PENDING_PAYMENT') {
        order.status = 'CANCELLED'
        await order.save()
      }
      return res.status(200).json({ success: true, message: 'Payment was not completed' })
    }
    await activatePaidOrder(order, data.reference)
    return res.status(200).json({ success: true, message: 'Payment confirmed' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Unable to process payment webhook' })
  }
})

router.use(requireAuth)
router.get('/premium/request', async (req, res, next) => {
  try { const request = await PremiumRequest.findOne({ userId: req.auth.userId }).sort({ createdAt: -1 }); res.json({ success: true, data: request }) } catch (err) { next(err) }
})

router.post('/premium/payment', async (req, res, next) => {
  let order
  try {
    const plan = req.body?.plan
    if (!Object.hasOwn(PREMIUM_PRICES, plan)) return res.status(400).json({ success: false, message: 'Invalid plan' })
    if (!env.payosClientId || !env.payosApiKey || !env.payosChecksumKey) return res.status(503).json({ success: false, message: 'PayOS is not configured. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, and PAYOS_CHECKSUM_KEY.' })
    const user = await User.findById(req.auth.userId).select('subscriptionPlan subscriptionExpiresAt systemRole')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.systemRole === 'ADMIN') return res.status(400).json({ success: false, message: 'Admin accounts cannot purchase Premium.' })
    const now = new Date()
    await PremiumRequest.updateMany({ userId: user._id, status: 'PENDING_PAYMENT', expiresAt: { $lte: now } }, { $set: { status: 'FAILED' } })
    const orderCode = crypto.randomInt(100_000_000, 2_147_483_647)
    const transactionRef = String(orderCode)
    const description = `Premium ${orderCode}`
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    const returnUrl = `${env.clientUrl}/premium?payment=returned&orderCode=${orderCode}`
    const cancelUrl = `${env.clientUrl}/premium?payment=cancelled&orderCode=${orderCode}`
    order = await PremiumRequest.create({ userId: user._id, plan, priceVnd: PREMIUM_PRICES[plan], status: 'PENDING_PAYMENT', transactionRef, expiresAt })
    const payload = {
      orderCode, amount: order.priceVnd, description, returnUrl, cancelUrl,
      expiredAt: Math.floor(expiresAt.getTime() / 1000),
      items: [{ name: `NEXUS Premium ${plan}`, quantity: 1, price: order.priceVnd }],
    }
    payload.signature = createPaymentSignature({ amount: payload.amount, orderCode, description, returnUrl, cancelUrl })
    const response = await fetch(`${env.payosApiUrl}/v2/payment-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client-id': env.payosClientId, 'x-api-key': env.payosApiKey },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!response.ok || result.code !== '00' || !result.data?.checkoutUrl) {
      order.status = 'FAILED'
      await order.save()
      return res.status(502).json({ success: false, message: result.desc || 'PayOS could not create a payment link.' })
    }
    order.paymentUrl = result.data.checkoutUrl
    order.paymentLinkId = result.data.paymentLinkId || null
    await order.save()
    return res.status(201).json({ success: true, data: { orderId: order._id, paymentUrl: order.paymentUrl, expiresAt: order.expiresAt } })
  } catch (err) {
    if (order && order.status === 'PENDING_PAYMENT') {
      order.status = 'FAILED'
      await order.save().catch(() => {})
    }
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'You already have an active Premium payment.' })
    if (err instanceof TypeError) return res.status(502).json({ success: false, message: 'Unable to connect to PayOS. Check the backend network and PayOS settings.' })
    return next(err)
  }
})

router.post('/premium/request', (_req, res) => {
  return res.status(410).json({ success: false, message: 'Manual Premium requests are no longer accepted. Start a PayOS payment instead.' })
})
router.get('/admin/premium-requests', requireAdmin, async (_req, res, next) => {
  try { const requests = await PremiumRequest.find({ status: 'PENDING' }).populate('userId', 'name email subscriptionPlan').sort({ createdAt: 1 }).limit(200); res.json({ success: true, data: requests }) } catch (err) { next(err) }
})
router.patch('/admin/premium-requests/:id/review', requireAdmin, async (req, res, next) => {
  try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request id' }); const request = await PremiumRequest.findOneAndUpdate({ _id: req.params.id, status: 'PENDING' }, { status: 'REVIEWED', reviewedAt: new Date(), reviewedBy: req.auth.userId }, { new: true }); if (!request) return res.status(404).json({ success: false, message: 'Pending request not found' }); return res.json({ success: true, data: request }) } catch (err) { next(err) }
})
export default router
