import mongoose from 'mongoose'
import { Appointment } from './Appointment.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { Notification } from '../notifications/Notification.js'

function fail(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  throw error
}

function reminderTimes(startsAt) {
  const start = new Date(startsAt).getTime()
  const now = Date.now()
  if (!Number.isFinite(start) || start <= now) fail('Appointment time must be in the future')
  const remaining = start - now
  return [24 * 60 * 60_000, 60 * 60_000, 10 * 60_000]
    .map((offset, index) => new Date(start - Math.min(offset, remaining * (0.75 - index * 0.25))))
    .sort((a, b) => a - b)
    .map((sendAt) => ({ sendAt }))
}

function isManager(member, appointment, userId) {
  return ['OWNER', 'LEADER'].includes(member.role) || appointment.createdBy.equals(userId)
}

function validatePayload(payload) {
  const title = typeof payload.title === 'string' ? payload.title.trim() : ''
  const startsAt = new Date(payload.startsAt)
  if (!title || title.length > 160) fail('Appointment title is required (up to 160 characters)')
  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) fail('Choose an appointment time in the future')
  return { title, startsAt }
}

export async function listAppointments(workspaceId) {
  return Appointment.find({ workspaceId, cancelledAt: null })
    .populate('createdBy', 'name email')
    .populate('attendeeIds', 'name email')
    .sort({ startsAt: 1 })
}

export async function createAppointment(workspaceId, userId, payload) {
  const { title, startsAt } = validatePayload(payload)
  const ids = [...new Set((payload.attendeeIds || []).map(String))]
  if (ids.some((id) => !mongoose.isValidObjectId(id))) fail('Select valid workspace members')
  const count = ids.length ? await WorkspaceMember.countDocuments({ workspaceId, userId: { $in: ids } }) : 0
  if (count !== ids.length) fail('All attendees must belong to this workspace')
  const appointment = await Appointment.create({
    workspaceId,
    createdBy: userId,
    title,
    description: String(payload.description || '').trim().slice(0, 2000),
    startsAt,
    attendeeIds: ids.length ? ids : [userId],
    reminders: reminderTimes(startsAt),
  })
  return appointment.populate('createdBy attendeeIds', 'name email')
}

export async function updateAppointment(appointment, member, userId, payload) {
  if (!isManager(member, appointment, userId)) fail('Only the creator or a workspace leader can edit this appointment', 403)
  const { title, startsAt } = validatePayload(payload)
  const ids = [...new Set((payload.attendeeIds || []).map(String))]
  if (ids.some((id) => !mongoose.isValidObjectId(id))) fail('Select valid workspace members')
  const count = ids.length ? await WorkspaceMember.countDocuments({ workspaceId: appointment.workspaceId, userId: { $in: ids } }) : 0
  if (count !== ids.length) fail('All attendees must belong to this workspace')
  appointment.title = title
  appointment.description = String(payload.description || '').trim().slice(0, 2000)
  appointment.startsAt = startsAt
  appointment.attendeeIds = ids.length ? ids : [userId]
  appointment.reminders = reminderTimes(startsAt)
  await Notification.deleteMany({ appointmentId: appointment._id, type: 'APPOINTMENT_REMINDER' })
  return (await appointment.save()).populate('createdBy attendeeIds', 'name email')
}

export async function deleteAppointment(appointment, member, userId) {
  if (!isManager(member, appointment, userId)) fail('Only the creator or a workspace leader can cancel this appointment', 403)
  appointment.cancelledAt = new Date()
  appointment.reminders = []
  await Notification.deleteMany({ appointmentId: appointment._id, type: 'APPOINTMENT_REMINDER' })
  await appointment.save()
}
