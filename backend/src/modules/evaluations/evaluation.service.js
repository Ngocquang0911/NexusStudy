import { Evaluation } from './Evaluation.js'
import { WorkspaceMember } from '../workspaces/WorkspaceMember.js'

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

async function ensureWorkspaceMember(workspaceId, userId) {
  const member = await WorkspaceMember.findOne({ workspaceId, userId })
  if (!member) throw evaluationError('Evaluated user must belong to the workspace', 400)
}

export async function createEvaluation(workspaceId, evaluatorId, payload) {
  if (evaluatorId.toString() === payload.evaluatedUserId?.toString()) throw evaluationError('Self-evaluation is not enabled', 400)
  await ensureWorkspaceMember(workspaceId, payload.evaluatedUserId)
  const periodEndsAt = new Date(payload.periodEndsAt)
  if (Number.isNaN(periodEndsAt.getTime())) throw evaluationError('A valid periodEndsAt is required', 400)
  const criteria = normalizeCriteria(payload.criteria)
  try {
    return await Evaluation.create({
      workspaceId,
      evaluatorId,
      evaluatedUserId: payload.evaluatedUserId,
      period: payload.period || 'current',
      periodEndsAt,
      criteria,
      comment: payload.comment || '',
      score: average(criteria.map(({ score }) => score)),
    })
  } catch (error) {
    if (error.code === 11000) throw evaluationError('You have already evaluated this member for this period', 409)
    throw error
  }
}

export async function listEvaluations(workspaceId, member) {
  const evaluations = await Evaluation.find({ workspaceId }).populate('evaluatorId', 'name email').populate('evaluatedUserId', 'name email').sort({ createdAt: -1 })
  if (!evaluations.length) return []
  if (!['OWNER', 'LEADER'].includes(member.role)) throw evaluationError('Only workspace leaders can view evaluation data', 403)
  return evaluations
}

export async function listMyEvaluations(workspaceId, evaluatorId) {
  return Evaluation.find({ workspaceId, evaluatorId }).populate('evaluatedUserId', 'name email').sort({ createdAt: -1 })
}

export async function getReport(workspaceId) {
  const evaluations = await Evaluation.find({ workspaceId }).populate('evaluatedUserId', 'name email')
  if (!evaluations.length) return { members: [], evaluationCount: 0 }

  const grouped = new Map()
  for (const evaluation of evaluations) {
    const userId = evaluation.evaluatedUserId._id.toString()
    if (!grouped.has(userId)) grouped.set(userId, { user: evaluation.evaluatedUserId, scores: [], criteria: {}, evaluationCount: 0 })
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
    members: [...grouped.values()].map((result) => ({
      user: result.user,
      averageScore: average(result.scores),
      contributionScore: Math.round((average(result.scores) / 5) * 100),
      evaluationCount: result.evaluationCount,
      scoreByCriterion: Object.fromEntries(Object.entries(result.criteria).map(([name, scores]) => [name, average(scores)])),
    })),
  }
}
