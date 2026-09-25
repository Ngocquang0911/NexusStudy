import crypto from 'node:crypto'
import { User } from '../users/User.js'
import { Channel } from '../chat/Channel.js'
import { Workspace } from './Workspace.js'
import { WorkspaceMember } from './WorkspaceMember.js'

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
  const workspace = await Workspace.create({ ...payload, ownerId: userId, inviteCode: createInviteCode() })
  await WorkspaceMember.create({ workspaceId: workspace._id, userId, role: 'OWNER' })
  await Channel.create({ workspaceId: workspace._id, name: 'general', description: 'Workspace announcements and discussion', createdBy: userId })
  return workspace
}

export async function listUserWorkspaces(userId) {
  const memberships = await WorkspaceMember.find({ userId }).select('workspaceId role')
  const workspaces = await Workspace.find({ _id: { $in: memberships.map(({ workspaceId }) => workspaceId) } }).sort({ createdAt: -1 })
  return workspaces.map((workspace) => ({
    ...workspace.toJSON(),
    role: memberships.find(({ workspaceId }) => workspaceId.equals(workspace._id))?.role,
  }))
}

export async function getWorkspace(workspaceId) {
  const workspace = await Workspace.findById(workspaceId)
  if (!workspace) throw notFound('Workspace not found')
  return workspace
}

export async function updateWorkspace(workspaceId, payload) {
  const workspace = await Workspace.findByIdAndUpdate(workspaceId, payload, { new: true, runValidators: true })
  if (!workspace) throw notFound('Workspace not found')
  return workspace
}

export async function deleteWorkspace(workspaceId) {
  const workspace = await Workspace.findByIdAndDelete(workspaceId)
  if (!workspace) throw notFound('Workspace not found')
  await WorkspaceMember.deleteMany({ workspaceId })
}

export async function joinWorkspace(userId, inviteCode) {
  const workspace = await Workspace.findOne({ inviteCode: inviteCode.toUpperCase() })
  if (!workspace) throw notFound('Invalid invite code')

  const existingMember = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId })
  if (existingMember) throw conflict('User is already a workspace member')

  await WorkspaceMember.create({ workspaceId: workspace._id, userId, role: 'MEMBER' })
  return workspace
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

export async function inviteWorkspaceMember(workspaceId, email) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('_id name email')
  if (!user) throw notFound('No user found for that email')
  const existingMember = await WorkspaceMember.findOne({ workspaceId, userId: user._id })
  if (existingMember) throw conflict('User is already a workspace member')
  const workspace = await getWorkspace(workspaceId)
  await WorkspaceMember.create({ workspaceId, userId: user._id, role: 'MEMBER' })
  return { inviteCode: workspace.inviteCode, user }
}
