import { User } from '../users/User.js'
import { ACTIVE_WORKSPACE_QUERY, Workspace } from '../workspaces/Workspace.js'

export const PLAN_LIMITS = {
  FREE: {
    maxWorkspaces: 3,
    maxPinnedMessages: 4,
    documentRetentionDays: 90,
    maxRemindersPerTask: 3,
  },
  PREMIUM: {
    maxWorkspaces: Infinity,
    maxPinnedMessages: 50,
    documentRetentionDays: 365,
    maxRemindersPerTask: Infinity,
  },
}

export async function getUserPlan(userId) {
  const user = await User.findById(userId).select('subscriptionPlan')
  return user?.subscriptionPlan || 'FREE'
}

export async function getWorkspacePlan(workspaceId) {
  const workspace = await Workspace.findOne({ _id: workspaceId, ...ACTIVE_WORKSPACE_QUERY }).select('ownerId')
  if (!workspace) return 'FREE'
  return getUserPlan(workspace.ownerId)
}

export async function getWorkspaceEntitlements(workspaceId) {
  const plan = await getWorkspacePlan(workspaceId)
  return { plan, limits: PLAN_LIMITS[plan] }
}

export async function assertPremiumUser(userId, message = 'This feature requires a Premium plan') {
  if (await getUserPlan(userId) !== 'PREMIUM') {
    const error = new Error(message)
    error.statusCode = 403
    error.code = 'PREMIUM_REQUIRED'
    throw error
  }
}

export async function assertPremiumWorkspace(workspaceId, message = 'This feature requires the workspace owner to have a Premium plan') {
  if (await getWorkspacePlan(workspaceId) !== 'PREMIUM') {
    const error = new Error(message)
    error.statusCode = 403
    error.code = 'PREMIUM_REQUIRED'
    throw error
  }
}
