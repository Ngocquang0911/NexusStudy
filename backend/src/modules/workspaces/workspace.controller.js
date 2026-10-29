import {
  createWorkspace,
  acceptWorkspaceInvitation,
  cancelWorkspaceInvitation,
  declineWorkspaceInvitation,
  deleteWorkspace,
  getMembers,
  getWorkspace,
  getUserInvitations,
  getWorkspaceInvitations,
  inviteWorkspaceMember,
  joinWorkspace,
  listUserWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from './workspace.service.js'
import { revokeWorkspaceSockets } from '../chat/chat.socket.js'

async function handle(request, response, next, action, message, statusCode = 200) {
  try {
    const data = await action()
    response.status(statusCode).json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function create(request, response, next) {
  return handle(request, response, next, () => createWorkspace(request.auth.userId, request.body), 'Workspace created', 201)
}

export function list(request, response, next) {
  return handle(request, response, next, () => listUserWorkspaces(request.auth.userId), 'Workspaces retrieved')
}

export function getOne(request, response, next) {
  return handle(request, response, next, () => getWorkspace(request.params.id), 'Workspace retrieved')
}

export function update(request, response, next) {
  return handle(request, response, next, () => updateWorkspace(request.params.id, request.body), 'Workspace updated')
}

export function remove(request, response, next) {
  return handle(request, response, next, async () => {
    const result = await deleteWorkspace(request.params.id, request.auth.userId)
    const io = request.app.get('io')
    if (io) {
      try {
        await revokeWorkspaceSockets(io, request.params.id)
      } catch (error) {
        console.error('Workspace realtime access revocation failed', {
          workspaceId: String(request.params.id),
          errorName: error.name,
          errorMessage: error.message,
        })
        result.cleanupPending = true
        result.cleanupWarnings.push('realtime access revocation')
      }
    }
    return result
  }, 'Workspace deleted')
}

export function join(request, response, next) {
  return handle(request, response, next, () => joinWorkspace(request.auth.userId, request.body.inviteCode), 'Joined workspace')
}

export function members(request, response, next) {
  return handle(request, response, next, () => getMembers(request.params.id), 'Members retrieved')
}

export function invite(request, response, next) {
  return handle(request, response, next, () => inviteWorkspaceMember(request.params.id, request.auth.userId, request.body.email), 'Workspace invitation sent', 201)
}

export function workspaceInvitations(request, response, next) {
  return handle(request, response, next, () => getWorkspaceInvitations(request.params.id), 'Workspace invitations retrieved')
}

export function myInvitations(request, response, next) {
  return handle(request, response, next, () => getUserInvitations(request.auth.userId), 'Invitations retrieved')
}

export function acceptInvitation(request, response, next) {
  return handle(request, response, next, () => acceptWorkspaceInvitation(request.params.invitationId, request.auth.userId), 'Workspace invitation accepted')
}

export function declineInvitation(request, response, next) {
  return handle(request, response, next, () => declineWorkspaceInvitation(request.params.invitationId, request.auth.userId), 'Workspace invitation declined')
}

export function cancelInvitation(request, response, next) {
  return handle(request, response, next, () => cancelWorkspaceInvitation(request.params.id, request.params.invitationId), 'Workspace invitation cancelled')
}

export function changeMemberRole(request, response, next) {
  return handle(request, response, next, () => updateMemberRole(request.params.id, request.params.userId, request.body.role), 'Member role updated')
}

export function removeMemberFromWorkspace(request, response, next) {
  return handle(request, response, next, () => removeMember(request.params.id, request.params.userId), 'Member removed')
}
