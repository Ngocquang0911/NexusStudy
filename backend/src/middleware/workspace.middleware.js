import { WorkspaceMember } from '../modules/workspaces/WorkspaceMember.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from '../modules/workspaces/Workspace.js'

function getWorkspaceId(request) {
  return request.params.workspaceId || request.params.id || request.body.workspaceId
}

function deny(message) {
  const error = new Error(message)
  error.statusCode = 403
  return error
}

export async function findActiveWorkspaceMember(workspaceId, userId) {
  const workspace = await Workspace.findOne({ _id: workspaceId, ...ACTIVE_WORKSPACE_QUERY }).select('_id')
  if (!workspace) {
    const error = new Error('Workspace not found')
    error.statusCode = 404
    throw error
  }
  return WorkspaceMember.findOne({ workspaceId, userId })
}

export async function requireWorkspaceMember(request, _response, next) {
  try {
    const workspaceId = getWorkspaceId(request)
    const member = await findActiveWorkspaceMember(workspaceId, request.auth.userId)
    if (!member) return next(deny('Workspace membership required'))
    request.workspaceMember = member
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireWorkspaceLeader(request, _response, next) {
  if (!['OWNER', 'LEADER'].includes(request.workspaceMember?.role)) {
    return next(deny('Workspace leader permission required'))
  }
  return next()
}

export function requireWorkspaceOwner(request, _response, next) {
  if (request.workspaceMember?.role !== 'OWNER') {
    return next(deny('Workspace owner permission required'))
  }
  return next()
}
