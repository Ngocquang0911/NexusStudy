import { getAdminOverview, getAdminWorkspace, listAdminUsers, listAdminWorkspaces, updateSubscriptionPlan, updateSystemRole } from './admin.service.js'

async function handle(request, response, next, action, message) {
  try {
    const data = await action()
    response.json({ success: true, message, data })
  } catch (error) {
    next(error)
  }
}

export function overview(request, response, next) {
  return handle(request, response, next, () => getAdminOverview(request.query.range), 'Admin overview retrieved')
}

export function users(request, response, next) {
  return handle(request, response, next, () => listAdminUsers(request.query), 'Users retrieved')
}

export function changeUserRole(request, response, next) {
  return handle(
    request,
    response,
    next,
    () => updateSystemRole(request.params.userId, request.body.systemRole, request.auth.userId, request.body.reason),
    'User role updated',
  )
}

export function changeSubscriptionPlan(request, response, next) {
  return handle(
    request,
    response,
    next,
    () => updateSubscriptionPlan(request.params.userId, request.body.subscriptionPlan, request.auth.userId, request.body.reason),
    'Subscription plan updated',
  )
}

export function workspaces(request, response, next) {
  return handle(request, response, next, () => listAdminWorkspaces(request.query), 'Workspaces retrieved')
}

export function workspaceDetails(request, response, next) {
  return handle(request, response, next, () => getAdminWorkspace(request.params.workspaceId), 'Workspace details retrieved')
}