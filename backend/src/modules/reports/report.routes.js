import mongoose from 'mongoose'
import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Workspace, ACTIVE_WORKSPACE_QUERY } from '../workspaces/Workspace.js'
import { User } from '../users/User.js'
import { AdminAuditLog } from '../admin/AdminAuditLog.js'
import { deleteWorkspace } from '../workspaces/workspace.service.js'
import { purgeWorkspaceData } from '../workspaces/workspace.archive.service.js'
import { revokeWorkspaceSockets } from '../chat/chat.socket.js'
import { Report } from './Report.js'
const router = Router()
router.use(requireAuth)
router.post('/workspaces/:workspaceId/reports', requireWorkspaceMember, async (req, res, next) => {
  try {
    const { targetType, targetId, reason } = req.body || {}
    if (!['USER', 'WORKSPACE'].includes(targetType) || !mongoose.isValidObjectId(targetId) || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 2000) return res.status(400).json({ message: 'Provide a valid target and a reason of 10 to 2000 characters.' })
    if (targetType === 'WORKSPACE' && String(targetId) !== String(req.params.workspaceId)) return res.status(403).json({ message: 'You can only report the current workspace.' })
    if (targetType === 'USER') {
      if (String(targetId) === String(req.auth.userId)) return res.status(400).json({ message: 'You cannot report yourself.' })
      if (!await WorkspaceMember.exists({ workspaceId: req.params.workspaceId, userId: targetId })) return res.status(403).json({ message: 'The reported user must be a member of this workspace.' })
    }
    const report = await Report.create({ reporterId: req.auth.userId, workspaceId: req.params.workspaceId, targetType, targetId, reason: reason.trim() })
    return res.status(201).json({ success: true, data: { _id: report._id, status: report.status } })
  } catch (error) { return next(error) }
})
router.get('/admin/reports', requireAdmin, async (req, res, next) => {
  try {
    const status = req.query.status || 'OPEN'
    if (!['OPEN', 'RESOLVED', 'DISMISSED'].includes(status)) return res.status(400).json({ message: 'Invalid status' })
    const page = Number(req.query.page || 1)
    if (!Number.isInteger(page) || page < 1) return res.status(400).json({ message: 'Invalid page' })
    const [reports, total] = await Promise.all([Report.find({ status }).populate('reporterId', 'name email').populate('workspaceId', 'name').sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20).lean(), Report.countDocuments({ status })])
    const userIds = reports.filter((r) => r.targetType === 'USER').map((r) => r.targetId)
    const users = await User.find({ _id: { $in: userIds } }).select('name email isLocked').lean()
    const byId = new Map(users.map((u) => [String(u._id), u]))
    return res.json({ success: true, data: { reports: reports.map((r) => ({ ...r, target: r.targetType === 'USER' ? byId.get(String(r.targetId)) || null : r.workspaceId })), page, pages: Math.ceil(total / 20), total } })
  } catch (error) { return next(error) }
})
router.patch('/admin/reports/:id', requireAdmin, async (req, res, next) => {
  try {
    const { status, resolution } = req.body || {}
    if (!mongoose.isValidObjectId(req.params.id) || !['RESOLVED', 'DISMISSED'].includes(status) || typeof resolution !== 'string' || resolution.trim().length < 5 || resolution.trim().length > 1000) return res.status(400).json({ message: 'Provide a status and a resolution of 5 to 1000 characters.' })
    const report = await Report.findOneAndUpdate({ _id: req.params.id, status: 'OPEN' }, { status, resolution: resolution.trim(), handledBy: req.auth.userId, handledAt: new Date() }, { new: true })
    if (!report) return res.status(404).json({ message: 'Open report not found' })
    return res.json({ success: true, data: report })
  } catch (error) { return next(error) }
})
router.patch('/admin/users/:id/lock', requireAdmin, async (req, res, next) => {
  try {
    const { locked, reason } = req.body || {}
    if (!mongoose.isValidObjectId(req.params.id) || typeof locked !== 'boolean' || typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) return res.status(400).json({ message: 'A valid account, lock state and reason are required.' })
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })
    if (user.systemRole === 'ADMIN') return res.status(403).json({ message: 'Administrator accounts cannot be locked.' })
    if (user.isLocked === locked) return res.json({ success: true, data: { _id: user._id, isLocked: user.isLocked } })
    user.isLocked = locked
    if (locked) user.tokenVersion = (user.tokenVersion || 0) + 1
    await user.save()
    await AdminAuditLog.create({ actorId: req.auth.userId, action: locked ? 'USER_LOCKED' : 'USER_UNLOCKED', targetType: 'USER', targetId: user._id, targetLabel: user.email, previousValue: locked ? 'ACTIVE' : 'LOCKED', newValue: locked ? 'LOCKED' : 'ACTIVE', reason: reason.trim() })
    if (locked) req.app.get('io')?.in(`user:${user._id}`).disconnectSockets(true)
    return res.json({ success: true, data: { _id: user._id, isLocked: user.isLocked } })
  } catch (error) { return next(error) }
})
router.delete('/admin/workspaces/:id', requireAdmin, async (req, res, next) => {
  try {
    const reason = req.body?.reason
    if (!mongoose.isValidObjectId(req.params.id) || typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) return res.status(400).json({ message: 'A valid workspace and reason are required.' })
    const workspace = await Workspace.findById(req.params.id).select('_id ownerId')
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' })
    if (!workspace.ownerId || !await User.exists({ _id: workspace.ownerId })) {
      const now = new Date()
      const claimed = await Workspace.findOneAndUpdate(
        { _id: workspace._id, ownerId: workspace.ownerId || null, ...ACTIVE_WORKSPACE_QUERY },
        { $set: { status: 'PURGING', deletedAt: now, deletedBy: req.auth.userId, purgeAt: now, deletedMemberIds: [] } },
        { new: true },
      )
      if (!claimed) return res.status(409).json({ message: 'Workspace is no longer active.' })
      let cleanupPending = false
      const cleanupWarnings = []
      try { await AdminAuditLog.create({ actorId: req.auth.userId, action: 'WORKSPACE_DELETED', targetType: 'WORKSPACE', targetId: workspace._id, targetLabel: claimed.name, previousValue: 'ACTIVE', newValue: 'PURGING', reason: reason.trim() }) } catch (_error) { cleanupPending = true; cleanupWarnings.push('audit log') }
      const io = req.app.get('io')
      if (io) { try { await revokeWorkspaceSockets(io, workspace._id) } catch (_error) { cleanupPending = true; cleanupWarnings.push('realtime access revocation') } }
      try { await purgeWorkspaceData(workspace._id) } catch (error) {
        console.error('Unable to purge ownerless workspace; scheduled cleanup will retry', error)
        cleanupPending = true
        cleanupWarnings.push('permanent deletion')
      }
      return res.json({ success: true, data: { workspaceId: workspace._id, permanentlyDeleted: !cleanupWarnings.includes('permanent deletion'), cleanupPending, cleanupWarnings } })
    }
    const result = await deleteWorkspace(workspace._id, workspace.ownerId, new Date(), { actorId: req.auth.userId, adminReason: reason.trim() })
    const io = req.app.get('io')
    if (io) { try { await revokeWorkspaceSockets(io, workspace._id) } catch (_error) { result.cleanupPending = true; result.cleanupWarnings.push('realtime access revocation') } }
    return res.json({ success: true, data: result })
  } catch (error) { return next(error) }
})
export default router
