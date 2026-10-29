import { Evaluation } from './Evaluation.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'
import { assertPremiumUser } from '../plans/plan.service.js'
import { Task } from '../tasks/Task.js'
import { Notification } from '../notifications/Notification.js'

function evaluationError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const allowedCriteria = new Set(['RESPONSIBILITY', 'TASK_COMPLETION', 'COLLABORATION', 'ATTENDANCE', 'WORK_QUALITY', 'COMMUNICATION'])

function normalizeCriteria(criteria) {
  if (!Array.isArray(criteria) || !criteria.length) throw evaluationError('At least one criterion is required', 400)
  const normalized = criteria.map((criterion) => ({ name: criterion.name, score: Number(criterion.score) }))
  if (normalized.some(({ name, score }) => !allowedCriteria.has(name) || !Number.isInteger(score) || score < 1 || score > 5)) {
    throw evaluationError('Each criterion must use a valid name and a score from 1 to 5', 400)
  }
  if (new Set(normalized.map(({ name }) => name)).size !== normalized.length) throw evaluationError('Criteria cannot be duplicated', 400)
  return normalized
}

function average(scores) {
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100
}

function ensurePeriodEnded(evaluations) {
  const periodEndsAt = evaluations[0]?.periodEndsAt
  if (periodEndsAt && periodEndsAt > new Date()) throw evaluationError('Evaluation results are private until the period ends', 403)
}

function currentEvaluationPeriod(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return {
    period: `${year}-${String(month + 1).padStart(2, '0')}`,
    periodEndsAt: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
  }
}

function completedEvaluationPeriod(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() - 1
  const periodDate = new Date(Date.UTC(year, month, 1))
  const periodYear = periodDate.getUTCFullYear()
  const periodMonth = periodDate.getUTCMonth()
  return {
    period: `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}`,
    periodStartsAt: new Date(Date.UTC(periodYear, periodMonth, 1)),
    periodEndsAt: new Date(Date.UTC(periodYear, periodMonth + 1, 0, 23, 59, 59, 999)),
  }
}

async function ensureWorkspaceMember(workspaceId, userId) {
  const member = await WorkspaceMember.findOne({ workspaceId, userId })
  if (!member) throw evaluationError('Evaluated user must belong to the workspace', 400)
}

export async function createEvaluation(workspaceId, evaluatorId, payload) {
  if (evaluatorId.toString() === payload.evaluatedUserId?.toString()) throw evaluationError('Self-evaluation is not enabled', 400)
  await ensureWorkspaceMember(workspaceId, payload.evaluatedUserId)
  const { period, periodEndsAt } = currentEvaluationPeriod()
  const criteria = normalizeCriteria(payload.criteria)
  try {
    const evaluation = await Evaluation.create({
      workspaceId,
      evaluatorId,
      evaluatedUserId: payload.evaluatedUserId,
      period,
      periodEndsAt,
      criteria,
      comment: payload.comment || '',
      score: average(criteria.map(({ score }) => score)),
    })
    await Notification.findOneAndUpdate(
      { userId: payload.evaluatedUserId, reminderKey: `evaluation:${evaluation._id}` },
      {
        $setOnInsert: {
          workspaceId,
          taskId: null,
          type: 'EVALUATION_AVAILABLE',
          title: 'New peer feedback received',
          message: 'A teammate submitted feedback for you. Results will be available after the evaluation period ends.',
        },
      },
      { upsert: true, new: true },
    )
    return evaluation
  } catch (error) {
    if (error.code === 11000) throw evaluationError('You have already evaluated this member for this period', 409)
    throw error
  }
}

export async function listEvaluations(workspaceId, userId, member) {
  if (!['OWNER', 'LEADER'].includes(member.role)) throw evaluationError('Only workspace leaders can view evaluation data', 403)
  await assertPremiumUser(userId, 'Contribution reports require a Premium plan')
  const { period } = completedEvaluationPeriod()
  return Evaluation.find({ workspaceId, period }).populate('evaluatorId', 'name email').populate('evaluatedUserId', 'name email').sort({ createdAt: -1 })
}

export async function listMyEvaluations(workspaceId, evaluatorId) {
  const { period } = currentEvaluationPeriod()
  return Evaluation.find({ workspaceId, evaluatorId, period }).populate('evaluatedUserId', 'name email').sort({ createdAt: -1 })
}

export async function getReport(workspaceId, userId, member) {
  if (!['OWNER', 'LEADER'].includes(member.role)) throw evaluationError('Only workspace leaders can view evaluation reports', 403)
  await assertPremiumUser(userId, 'Contribution reports require a Premium plan')
  const { period, periodStartsAt, periodEndsAt } = completedEvaluationPeriod()
  const evaluations = await Evaluation.find({ workspaceId, period }).populate('evaluatedUserId', 'name email')
  if (periodEndsAt > new Date()) ensurePeriodEnded(evaluations)
  const tasks = await Task.find({
    workspaceId,
    $or: [
      { createdAt: { $gte: periodStartsAt, $lte: periodEndsAt } },
      { deadline: { $gte: periodStartsAt, $lte: periodEndsAt } },
      { completedAt: { $gte: periodStartsAt, $lte: periodEndsAt } },
    ],
  }).select('title status deadline completedAt assignedTo').populate('assignedTo', 'name email')
  const tasksByMember = new Map()
  for (const task of tasks) {
    const deadline = task.deadline ? new Date(task.deadline) : null
    const completedAt = task.completedAt ? new Date(task.completedAt) : null
    let outcome = 'PENDING'
    if (task.status === 'CANCELLED') outcome = 'CANCELLED'
    else if (task.status === 'DONE') outcome = !deadline || (completedAt && completedAt <= deadline) ? 'ON_TIME' : 'OVERDUE'
    else if (deadline && deadline < new Date()) outcome = 'OVERDUE'

    for (const assignee of (task.assignedTo || []).filter(Boolean)) {
      const memberId = assignee._id.toString()
      const memberTasks = tasksByMember.get(memberId) || []
      memberTasks.push({
        title: task.title,
        status: task.status,
        deadline,
        completedAt,
        outcome,
      })
      tasksByMember.set(memberId, memberTasks)
    }
  }

  const grouped = new Map()
  const workspaceMembers = await WorkspaceMember.find({ workspaceId }).populate('userId', 'name email')
  for (const workspaceMember of workspaceMembers) {
    if (!workspaceMember.userId) continue
    const memberId = workspaceMember.userId._id.toString()
    grouped.set(memberId, { user: workspaceMember.userId, scores: [], criteria: {}, evaluationCount: 0 })
  }

  for (const evaluation of evaluations) {
    if (!evaluation.evaluatedUserId) continue
    const userId = evaluation.evaluatedUserId._id.toString()
    if (!grouped.has(userId)) continue
    const result = grouped.get(userId)
    result.scores.push(evaluation.score)
    result.evaluationCount += 1
    for (const criterion of evaluation.criteria) {
      result.criteria[criterion.name] ||= []
      result.criteria[criterion.name].push(criterion.score)
    }
  }

  return {
    evaluationCount: evaluations.length,
    members: [...grouped.entries()].map(([userId, result]) => ({
      user: result.user,
      averageScore: result.scores.length ? average(result.scores) : null,
      contributionScore: result.scores.length ? Math.round((average(result.scores) / 5) * 100) : null,
      evaluationCount: result.evaluationCount,
      scoreByCriterion: Object.fromEntries(Object.entries(result.criteria).map(([name, scores]) => [name, average(scores)])),
      taskOutcomes: tasksByMember.get(userId) || [],
    })),
    period,
    periodEndsAt,
  }
}
