import crypto from 'node:crypto'
import { User } from '../users/User.js'
import { Channel } from '../chat/Channel.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from './Workspace.js'
import { WorkspaceMember } from './WorkspaceMember.js'
import { WorkspaceInvitation } from './WorkspaceInvitation.js'
import { getUserPlan, getWorkspaceEntitlements, PLAN_LIMITS } from '../plans/plan.service.js'
import { validateWorkspaceUpdate } from './workspace.validation.js'
import { Notification } from '../notifications/Notification.js'
import { createInvitationNotification } from '../notifications/notification.service.js'
import { AdminAuditLog } from '../admin/AdminAuditLog.js'
import { notifyDeletedWorkspaceMembers } from './workspace.archive.service.js'

const INVITATION_TTL_MS = 3 * 24 * 60 * 60 * 1000
const DELETED_SPACE_RETENTION_MS = 5 * 24 * 60 * 60 * 1000

async function countActiveWorkspaceMemberships(userId) {
  const memberships = await WorkspaceMember.find({ userId }).select('workspaceId')
  if (!memberships.length) return 0
  return Workspace.countDocuments({
    _id: { $in: memberships.map(({ workspaceId }) => workspaceId) },
    ...ACTIVE_WORKSPACE_QUERY,
  })
}

function createInviteCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase()
}

function conflict(message) {
  const error = new Error(message)
  error.statusCode = 409
  return error
}

function notFound(message) {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

export async function createWorkspace(userId, payload) {
  const user = await User.findById(userId).select('systemRole')
  if (user?.systemRole === 'ADMIN') {
    const error = new Error('Administrators cannot create personal workspaces. Workspaces are managed through the Admin console.')
    error.statusCode = 403
    throw error
  }
  const plan = await getUserPlan(userId)
  const membershipCount = await countActiveWorkspaceMemberships(userId)
  if (membershipCount >= PLAN_LIMITS[plan].maxWorkspaces) {
    const error = new Error(`Free plan allows up to ${PLAN_LIMITS[plan].maxWorkspaces} workspaces. Upgrade to Premium for more workspaces.`)
    error.statusCode = 403
    error.code = 'PREMIUM_REQUIRED'
    throw error
  }
  const workspace = await Workspace.create({ ...payload, ownerId: userId, inviteCode: createInviteCode() })
  await WorkspaceMember.create({ workspaceId: workspace._id, userId, role: 'OWNER' })
  await Channel.create({ workspaceId: workspace._id, name: 'general', description: 'Workspace announcements and discussion', createdBy: userId })
  return workspace
}

export async function listUserWorkspaces(userId) {
  const memberships = await WorkspaceMember.find({ userId }).select('workspaceId role')
  const workspaces = await Workspace.find({
    _id: { $in: memberships.map(({ workspaceId }) => workspaceId) },
    ...ACTIVE_WORKSPACE_QUERY,
  }).sort({ createdAt: -1 })
  const plans = await Promise.all(workspaces.map((workspace) => getWorkspaceEntitlements(workspace._id)))
  return workspaces.map((workspace, index) => ({
    ...workspace.toJSON(),
    role: memberships.find(({ workspaceId }) => workspaceId.equals(workspace._id))?.role,
    plan: plans[index].plan,
  }))
}

export async function getWorkspace(workspaceId) {
  const workspace = await Workspace.findOne({ _id: workspaceId, ...ACTIVE_WORKSPACE_QUERY })
  if (!workspace) throw notFound('Workspace not found')
  const { plan } = await getWorkspaceEntitlements(workspaceId)
  return { ...workspace.toJSON(), plan }
}

export async function updateWorkspace(workspaceId, payload) {
  const allowedUpdates = validateWorkspaceUpdate(payload)
  const workspace = await Workspace.findOneAndUpdate({ _id: workspaceId, ...ACTIVE_WORKSPACE_QUERY }, allowedUpdates, { new: true, runValidators: true })
  if (!workspace) throw notFound('Workspace not found')
  return workspace
}

export async function deleteWorkspace(workspaceId, ownerId, now = new Date()) {
  const memberSnapshot = await WorkspaceMember.find({ workspaceId }).select('userId')
  const deletedMemberIds = [...new Map(memberSnapshot.map(({ userId }) => [String(userId), userId])).values()]
  if (!deletedMemberIds.some((userId) => String(userId) === String(ownerId))) {
    const error = new Error('Workspace owner membership is missing')
    error.statusCode = 409
    throw error
  }
  const purgeAt = new Date(now.getTime() + DELETED_SPACE_RETENTION_MS)
  const workspace = await Workspace.findOneAndUpdate(
    { _id: workspaceId, ownerId, ...ACTIVE_WORKSPACE_QUERY },
    {
      $set: {
        status: 'DELETED',
        deletedAt: now,
        deletedBy: ownerId,
        purgeAt,
        deletedMemberIds,
      },
    },
    { new: true },
  )
  if (!workspace) {
    const existing = await Workspace.findById(workspaceId).select('_id ownerId deletedAt name')
    if (!existing || existing.deletedAt) throw notFound('Workspace not found')
    const error = new Error('Only the workspace owner can delete this workspace')
    error.statusCode = 403
    throw error
  }

  const cleanupWarnings = []
  const cleanupOperations = [
    ['audit log', () => AdminAuditLog.create({
      actorId: ownerId,
      action: 'WORKSPACE_DELETED',
      targetType: 'WORKSPACE',
      targetId: workspace._id,
      targetLabel: workspace.name,
      previousValue: 'ACTIVE',
      newValue: 'DELETED',
      reason: 'Workspace owner requested deletion',
    })],
    ['pending invitations', () => WorkspaceInvitation.updateMany(
      { workspaceId, status: 'PENDING' },
      { $set: { status: 'CANCELLED', cancelledAt: now } },
    )],
    ['workspace notifications', () => Notification.deleteMany({ workspaceId })],
    ['deleted Space notices', () => notifyDeletedWorkspaceMembers(workspace, now)],
  ]
  for (const [operation, cleanup] of cleanupOperations) {
    try {
      await cleanup()
    } catch (error) {
      console.error(`Workspace deletion cleanup failed: ${operation}`, {
        workspaceId: String(workspaceId),
        errorName: error.name,
        errorMessage: error.message,
      })
      cleanupWarnings.push(operation)
    }
  }
  return { workspaceId: workspace._id, deletedAt: now, purgeAt, cleanupPending: cleanupWarnings.length > 0, cleanupWarnings }
}

export async function joinWorkspace() {
  const error = new Error('Joining by workspace code is no longer supported. Accept a pending workspace invitation instead.')
  error.statusCode = 410
  error.code = 'INVITATION_REQUIRED'
  throw error
}

export async function getMembers(workspaceId) {
  return WorkspaceMember.find({ workspaceId }).populate('userId', 'name email avatar bio systemRole').sort({ joinedAt: 1 })
}

export async function updateMemberRole(workspaceId, userId, role) {
  if (!['LEADER', 'MEMBER', 'ADVISOR'].includes(role)) throw conflict('Role cannot be assigned')
  const member = await WorkspaceMember.findOneAndUpdate({ workspaceId, userId }, { role }, { new: true, runValidators: true }).populate('userId', 'name email avatar bio systemRole')
  if (!member) throw notFound('Workspace member not found')
  return member
}

export async function removeMember(workspaceId, userId) {
  const member = await WorkspaceMember.findOne({ workspaceId, userId })
  if (!member) throw notFound('Workspace member not found')
  if (member.role === 'OWNER') throw conflict('Workspace owner cannot be removed')
  await member.deleteOne()
}

export async function inviteWorkspaceMember(workspaceId, inviterId, email, now = new Date()) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!normalizedEmail) {
    const error = new Error('A valid email address is required')
    error.statusCode = 400
    throw error
  }
  await expirePendingWorkspaceInvitations(now, { workspaceId })
  const user = await User.findOne({ email: normalizedEmail }).select('_id name email')
  if (!user) throw notFound('No user found for that email')
  if (String(user._id) === String(inviterId)) throw conflict('You cannot invite yourself')
  const existingMember = await WorkspaceMember.findOne({ workspaceId, userId: user._id })
  if (existingMember) throw conflict('User is already a workspace member')
  const workspace = await Workspace.findById(workspaceId)
  if (!workspace) throw notFound('Workspace not found')
  let invitation
  try {
    invitation = await WorkspaceInvitation.create({
      workspaceId,
      inviterId,
      inviteeId: user._id,
      status: 'PENDING',
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
    })
  } catch (error) {
    if (error.code === 11000) throw conflict('A pending invitation already exists for this user')
    throw error
  }
  const inviter = await User.findById(inviterId).select('name')
  await createInvitationNotification({
    userId: user._id,
    workspaceId,
    invitationId: invitation._id,
    title: 'Workspace invitation',
    message: `${inviter?.name || 'A workspace leader'} invited you to join ${workspace.name}. Respond within 3 days.`,
  })
  return invitation
}

export async function expirePendingWorkspaceInvitations(now = new Date(), filter = {}) {
  const expiring = await WorkspaceInvitation.find({
    ...filter,
    status: 'PENDING',
    expiresAt: { $lte: now },
  }).select('_id inviteeId')
  const result = await WorkspaceInvitation.updateMany(
    { ...filter, status: 'PENDING', expiresAt: { $lte: now } },
    { $set: { status: 'EXPIRED' } },
  )
  if (expiring.length) {
    await Notification.updateMany(
      { invitationId: { $in: expiring.map(({ _id }) => _id) }, type: 'INVITATION' },
      { $set: { invitationStatus: 'EXPIRED' } },
    )
  }
  return result
}

export async function getWorkspaceInvitations(workspaceId, now = new Date()) {
  await expirePendingWorkspaceInvitations(now, { workspaceId })
  return WorkspaceInvitation.find({ workspaceId })
    .sort({ createdAt: -1 })
    .populate('inviteeId', 'name email avatar')
    .populate('inviterId', 'name email')
}

export async function getUserInvitations(userId, now = new Date()) {
  await expirePendingWorkspaceInvitations(now, { inviteeId: userId })
  const workspaces = await Workspace.find(ACTIVE_WORKSPACE_QUERY).select('_id')
  return WorkspaceInvitation.find({ inviteeId: userId, workspaceId: { $in: workspaces.map(({ _id }) => _id) } })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('workspaceId', 'name description type')
    .populate('inviterId', 'name email')
}

function invitationError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

async function getPendingInvitation(invitationId, inviteeId, now) {
  const invitation = await WorkspaceInvitation.findById(invitationId)
  if (!invitation) throw notFound('Workspace invitation not found')
  if (String(invitation.inviteeId) !== String(inviteeId)) {
    throw invitationError('Only the invited user can respond to this invitation', 403)
  }
  if (invitation.status !== 'PENDING') throw conflict(`Invitation is ${invitation.status.toLowerCase()}`)
  if (invitation.expiresAt <= now) {
    await WorkspaceInvitation.updateOne(
      { _id: invitation._id, status: 'PENDING', expiresAt: { $lte: now } },
      { $set: { status: 'EXPIRED' } },
    )
    throw conflict('Workspace invitation has expired')
  }
  return invitation
}

async function notifyInvitationResponse(invitation, type, status) {
  const workspace = await Workspace.findById(invitation.workspaceId).select('name')
  const invitee = await User.findById(invitation.inviteeId).select('name')
  await Notification.updateOne(
    { userId: invitation.inviteeId, invitationId: invitation._id, type: 'INVITATION' },
    { $set: { invitationStatus: status.toUpperCase() } },
  )
  await createInvitationNotification({
    userId: invitation.inviterId,
    workspaceId: invitation.workspaceId,
    invitationId: invitation._id,
    type,
    invitationStatus: status.toUpperCase(),
    title: `Workspace invitation ${status.toLowerCase()}`,
    message: `${invitee?.name || 'The invited user'} ${status.toLowerCase()} your invitation to ${workspace?.name || 'the workspace'}.`,
  })
}

export async function acceptWorkspaceInvitation(invitationId, inviteeId, now = new Date()) {
  const invitation = await getPendingInvitation(invitationId, inviteeId, now)
  if (!await Workspace.findOne({ _id: invitation.workspaceId, ...ACTIVE_WORKSPACE_QUERY }).select('_id')) {
    throw notFound('Workspace not found')
  }
  if (await WorkspaceMember.findOne({ workspaceId: invitation.workspaceId, userId: inviteeId })) {
    throw conflict('User is already a workspace member')
  }
  const plan = await getUserPlan(inviteeId)
  const membershipCount = await countActiveWorkspaceMemberships(inviteeId)
  if (membershipCount >= PLAN_LIMITS[plan].maxWorkspaces) {
    const error = new Error(`Free plan allows up to ${PLAN_LIMITS[plan].maxWorkspaces} workspaces. Upgrade to Premium to join more workspaces.`)
    error.statusCode = 403
    error.code = 'PREMIUM_REQUIRED'
    throw error
  }

  const claimedInvitation = await WorkspaceInvitation.findOneAndUpdate(
    { _id: invitation._id, inviteeId, status: 'PENDING', expiresAt: { $gt: now } },
    { $set: { status: 'ACCEPTED', respondedAt: now } },
    { new: true },
  )
  if (!claimedInvitation) throw conflict('Workspace invitation is no longer available')

  try {
    await WorkspaceMember.create({ workspaceId: invitation.workspaceId, userId: inviteeId, role: 'MEMBER' })
  } catch (error) {
    await WorkspaceInvitation.updateOne(
      { _id: claimedInvitation._id, status: 'ACCEPTED', respondedAt: now },
      { $set: { status: 'PENDING', respondedAt: null } },
    )
    if (error.code === 11000) throw conflict('User is already a workspace member')
    throw error
  }

  await notifyInvitationResponse(claimedInvitation, 'INVITATION_RESPONSE', 'Accepted')
  return claimedInvitation
}

export async function declineWorkspaceInvitation(invitationId, inviteeId, now = new Date()) {
  const invitation = await getPendingInvitation(invitationId, inviteeId, now)
  const declined = await WorkspaceInvitation.findOneAndUpdate(
    { _id: invitation._id, inviteeId, status: 'PENDING', expiresAt: { $gt: now } },
    { $set: { status: 'DECLINED', respondedAt: now } },
    { new: true },
  )
  if (!declined) throw conflict('Workspace invitation is no longer available')
  await notifyInvitationResponse(declined, 'INVITATION_RESPONSE', 'Declined')
  return declined
}

export async function cancelWorkspaceInvitation(workspaceId, invitationId, now = new Date()) {
  await expirePendingWorkspaceInvitations(now, { workspaceId })
  const cancelled = await WorkspaceInvitation.findOneAndUpdate(
    { _id: invitationId, workspaceId, status: 'PENDING', expiresAt: { $gt: now } },
    { $set: { status: 'CANCELLED', cancelledAt: now } },
    { new: true },
  )
  if (!cancelled) throw notFound('Pending workspace invitation not found')
  const workspace = await Workspace.findById(workspaceId).select('name')
  await createInvitationNotification({
    userId: cancelled.inviteeId,
    workspaceId,
    invitationId: cancelled._id,
    type: 'INVITATION_CANCELLED',
    invitationStatus: 'CANCELLED',
    title: 'Workspace invitation cancelled',
    message: `The invitation to ${workspace?.name || 'the workspace'} has been cancelled.`,
  })
  return cancelled
}
