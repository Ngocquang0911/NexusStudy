import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { User } from '../users/User.js'
import { PremiumRequest } from './PremiumRequest.js'

export const PREMIUM_PRICES = Object.freeze({ MONTHLY: 39000, SIX_MONTHS: 150000, YEARLY: 289000 })
const router = Router()
router.use(requireAuth)
router.get('/premium/request', async (req, res, next) => {
  try { const request = await PremiumRequest.findOne({ userId: req.auth.userId }).sort({ createdAt: -1 }); res.json({ success: true, data: request }) } catch (err) { next(err) }
})
router.post('/premium/request', async (req, res, next) => {
  try {
    const plan = req.body?.plan
    if (!Object.hasOwn(PREMIUM_PRICES, plan)) return res.status(400).json({ success: false, message: 'Invalid plan' })
    const user = await User.findById(req.auth.userId).select('subscriptionPlan systemRole')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.systemRole === 'ADMIN' || user.subscriptionPlan === 'PREMIUM') return res.status(400).json({ success: false, message: 'This account cannot submit a new Premium request.' })
    const request = await PremiumRequest.create({ userId: user._id, plan, priceVnd: PREMIUM_PRICES[plan] })
    return res.status(201).json({ success: true, data: request })
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'You already have a pending request.' })
    return next(err)
  }
})
router.get('/admin/premium-requests', requireAdmin, async (_req, res, next) => {
  try { const requests = await PremiumRequest.find({ status: 'PENDING' }).populate('userId', 'name email subscriptionPlan').sort({ createdAt: 1 }).limit(200); res.json({ success: true, data: requests }) } catch (err) { next(err) }
})
router.patch('/admin/premium-requests/:id/review', requireAdmin, async (req, res, next) => {
  try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid request id' }); const request = await PremiumRequest.findOneAndUpdate({ _id: req.params.id, status: 'PENDING' }, { status: 'REVIEWED', reviewedAt: new Date(), reviewedBy: req.auth.userId }, { new: true }); if (!request) return res.status(404).json({ success: false, message: 'Pending request not found' }); return res.json({ success: true, data: request }) } catch (err) { next(err) }
})
export default router
