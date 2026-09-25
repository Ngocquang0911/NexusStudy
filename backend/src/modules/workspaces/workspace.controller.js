import {
  createWorkspace,
  deleteWorkspace,
  getMembers,
  getWorkspace,
  inviteWorkspaceMember,
  joinWorkspace,
  listUserWorkspaces,
  removeMember,
  updateMemberRole,
  updateWorkspace,
} from './workspace.service.js'

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
  return handle(request, response, next, () => deleteWorkspace(request.params.id), 'Workspace deleted')
}

export function join(request, response, next) {
  return handle(request, response, next, () => joinWorkspace(request.auth.userId, request.body.inviteCode), 'Joined workspace')
}

export function members(request, response, next) {
  return handle(request, response, next, () => getMembers(request.params.id), 'Members retrieved')
}

export function invite(request, response, next) {
  return handle(request, response, next, () => inviteWorkspaceMember(request.params.id, request.body.email), 'Workspace invite prepared')
}

export function changeMemberRole(request, response, next) {
  return handle(request, response, next, () => updateMemberRole(request.params.id, request.params.userId, request.body.role), 'Member role updated')
}

export function removeMemberFromWorkspace(request, response, next) {
  return handle(request, response, next, () => removeMember(request.params.id, request.params.userId), 'Member removed')
}
