import { CheckCircle2, Clock, LoaderCircle, Star, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { submitEvaluation } from '../../services/evaluationService.js'

const CRITERIA_DEFINITIONS = [
  { key: 'RESPONSIBILITY', label: 'Responsibility', description: 'Ownership of assigned work and reliability' },
  { key: 'TASK_COMPLETION', label: 'Task Completion', description: 'Meeting deadlines and delivering expected outcomes' },
  { key: 'COLLABORATION', label: 'Collaboration', description: 'Teamwork, openness, and helping others' },
  { key: 'ATTENDANCE', label: 'Attendance', description: 'Punctuality and active participation in meetings' },
  { key: 'WORK_QUALITY', label: 'Work Quality', description: 'Accuracy, thoroughness, and standard of work' },
  { key: 'COMMUNICATION', label: 'Communication', description: 'Clear, timely, and constructive updates' },
]

export default function EvaluationForm({
  workspaceId,
  members = [],
  currentUserId,
  myEvaluations = [],
  onSubmitted,
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [scores, setScores] = useState({
    RESPONSIBILITY: 5,
    TASK_COMPLETION: 5,
    COLLABORATION: 5,
    ATTENDANCE: 5,
    WORK_QUALITY: 5,
    COMMUNICATION: 5,
  })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Filter out current user from target member select list
  const peerMembers = members.filter((m) => {
    const uId = m.userId?._id || m.userId
    return uId !== currentUserId
  })

  // Check if target user has already been evaluated
  const isAlreadyEvaluated = (userId) => {
    return myEvaluations.some((ev) => {
      const targetId = ev.evaluatedUserId?._id || ev.evaluatedUserId
      return targetId === userId
    })
  }

  const handleScoreChange = (criterionKey, newScore) => {
    setScores((prev) => ({ ...prev, [criterionKey]: newScore }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSuccessMessage('')

    if (!selectedUserId) {
      setFormError('Please select a team member to evaluate.')
      return
    }

    if (isAlreadyEvaluated(selectedUserId)) {
      setFormError('You have already submitted an evaluation for this member in the current period.')
      return
    }

    setLoading(true)

    // Default period ends 7 days from now
    const periodEndsAt = new Date()
    periodEndsAt.setDate(periodEndsAt.getDate() + 7)

    const criteriaPayload = Object.entries(scores).map(([name, score]) => ({
      name,
      score,
    }))

    try {
      await submitEvaluation(workspaceId, {
        evaluatedUserId: selectedUserId,
        period: 'current',
        periodEndsAt: periodEndsAt.toISOString(),
        criteria: criteriaPayload,
        comment: comment.trim(),
      })

      setSuccessMessage('Evaluation submitted successfully!')
      setSelectedUserId('')
      setComment('')
      setScores({
        RESPONSIBILITY: 5,
        TASK_COMPLETION: 5,
        COLLABORATION: 5,
        ATTENDANCE: 5,
        WORK_QUALITY: 5,
        COMMUNICATION: 5,
      })

      if (onSubmitted) onSubmitted()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to submit evaluation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="evaluation-form-container surface-card">
      <div className="evaluation-form-header">
        <div>
          <span className="eyebrow">PEER REVIEW</span>
          <h2>Submit Peer Evaluation</h2>
          <p>Rate your team member's contributions objectively and constructively.</p>
        </div>
        <div className="period-badge">
          <Clock size={14} /> Current Period
        </div>
      </div>

      {successMessage && (
        <div className="inline-success" role="alert">
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}

      {formError && (
        <div className="inline-error" role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="evaluation-form">
        {/* Select Target Member */}
        <div className="form-group">
          <label htmlFor="target-member">Select Member to Evaluate *</label>
          <select
            id="target-member"
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value)
              setSuccessMessage('')
              setFormError('')
            }}
          >
            <option value="">-- Choose Team Member --</option>
            {peerMembers.map((member) => {
              const u = member.userId || member
              const name = u.name || u.email || 'Member'
              const alreadyEvaluated = isAlreadyEvaluated(u._id)
              return (
                <option key={u._id} value={u._id} disabled={alreadyEvaluated}>
                  {name} {alreadyEvaluated ? '(Already Evaluated)' : ''}
                </option>
              )
            })}
          </select>
        </div>

        {/* Criteria Rating Section */}
        <div className="criteria-rating-grid">
          {CRITERIA_DEFINITIONS.map(({ key, label, description }) => {
            const currentScore = scores[key]
            return (
              <div key={key} className="criterion-rating-card">
                <div className="criterion-info">
                  <strong>{label}</strong>
                  <small>{description}</small>
                </div>

                <div className="star-rating-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= currentScore ? 'filled' : ''}`}
                      onClick={() => handleScoreChange(key, star)}
                    >
                      <Star size={18} />
                    </button>
                  ))}
                  <span className="rating-num">{currentScore} / 5</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Comments Section */}
        <div className="form-group">
          <label htmlFor="eval-comment">Constructive Feedback / Comments</label>
          <textarea
            id="eval-comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share positive highlights or specific areas for improvement..."
          />
        </div>

        <div className="form-actions-right">
          <button
            type="submit"
            className="primary-action"
            disabled={loading || !selectedUserId}
          >
            {loading ? <LoaderCircle className="spin" size={16} /> : <UserCheck size={16} />}
            Submit Evaluation
          </button>
        </div>
      </form>

      {/* Submitted Peer Reviews Section */}
      {myEvaluations.length > 0 && (
        <div className="my-evaluations-section" style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
          <div className="section-heading" style={{ marginBottom: '12px' }}>
            <div>
              <span className="eyebrow">YOUR SUBMISSIONS</span>
              <h3>Evaluations You Have Submitted ({myEvaluations.length})</h3>
            </div>
          </div>

          <div className="my-evaluations-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myEvaluations.map((item) => {
              const targetUser = item.evaluatedUserId || {}
              const name = targetUser.name || targetUser.email || 'Team Member'
              const avgScore = item.score || 0
              return (
                <div key={item._id} className="surface-card" style={{ padding: '14px', border: '1px solid var(--line)', borderRadius: '8px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="mini-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--indigo)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{name}</strong>
                        {item.comment && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>"{item.comment}"</p>}
                      </div>
                    </div>
                    <div className="overall-score-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '16px', fontWeight: 'bold' }}>
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <strong>{avgScore.toFixed(1)}</strong>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>/ 5.0</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
