import { Router } from 'express'
import { requireAuth } from '../../middleware/auth.middleware.js'
import { findActiveWorkspaceMember, requireWorkspaceMember } from '../../middleware/workspace.middleware.js'
import { Appointment } from './Appointment.js'
import { createAppointment, deleteAppointment, listAppointments, updateAppointment } from './appointment.service.js'

const router = Router()
router.use(requireAuth)

router.get('/workspaces/:workspaceId/appointments', requireWorkspaceMember, async (req, res, next) => {
  try { res.json({ success: true, data: await listAppointments(req.params.workspaceId) }) } catch (error) { next(error) }
})
router.post('/workspaces/:workspaceId/appointments', requireWorkspaceMember, async (req, res, next) => {
  try {
    const data = await createAppointment(req.params.workspaceId, req.auth.userId, req.body)
    res.status(201).json({ success: true, message: 'Appointment created', data })
  } catch (error) { next(error) }
})
router.put('/appointments/:id', async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, cancelledAt: null })
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' })
    const member = await findActiveWorkspaceMember(appointment.workspaceId, req.auth.userId)
    if (!member) return res.status(403).json({ success: false, message: 'Workspace membership required' })
    const data = await updateAppointment(appointment, member, req.auth.userId, req.body)
    res.json({ success: true, message: 'Appointment updated', data })
  } catch (error) { next(error) }
})
router.delete('/appointments/:id', async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, cancelledAt: null })
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' })
    const member = await findActiveWorkspaceMember(appointment.workspaceId, req.auth.userId)
    if (!member) return res.status(403).json({ success: false, message: 'Workspace membership required' })
    await deleteAppointment(appointment, member, req.auth.userId)
    res.json({ success: true, message: 'Appointment cancelled', data: null })
  } catch (error) { next(error) }
})

export default router
