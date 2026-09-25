import { Award, BarChart3, CheckCircle, ShieldAlert, Star, Users } from 'lucide-react'

const CRITERIA_LABELS = {
  RESPONSIBILITY: 'Responsibility',
  TASK_COMPLETION: 'Task Completion',
  COLLABORATION: 'Collaboration',
  ATTENDANCE: 'Attendance',
  WORK_QUALITY: 'Work Quality',
  COMMUNICATION: 'Communication',
}

export default function ContributionReport({ reportData, isPrivate = false, isLeader = false }) {
  if (isPrivate) {
    return (
      <div className="workspace-empty surface-card">
        <ShieldAlert size={40} className="text-amber" />
        <h2>Evaluation Results Private</h2>
        <p>Results will be calculated and unlocked once the current evaluation period ends.</p>
      </div>
    )
  }

  const members = reportData?.members || []
  const totalEvaluationsCount = reportData?.evaluationCount || 0

  if (members.length === 0) {
    return (
      <div className="workspace-empty surface-card">
        <BarChart3 size={40} />
        <h2>No Contribution Data Yet</h2>
        <p>Submit peer evaluations to generate the contribution performance report.</p>
      </div>
    )
  }

  return (
    <div className="contribution-report-container">
      {/* Report Header Metrics */}
      <div className="task-stats-summary-card margin-bottom-lg">
        <div className="stat-pill">
          <span className="stat-num">{members.length}</span>
          <span className="stat-label">Evaluated Members</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-blue">{totalEvaluationsCount}</span>
          <span className="stat-label">Total Submissions</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-green">
            {Math.round(members.reduce((sum, m) => sum + (m.averageScore || 0), 0) / members.length * 10) / 10} / 5.0
          </span>
          <span className="stat-label">Average Group Rating</span>
        </div>
      </div>

      {/* Member Performance Cards */}
      <div className="report-members-grid">
        {members.map((item) => {
          const u = item.user || {}
          const name = u.name || u.email || 'Team Member'
          const avgScore = item.averageScore || 0
          const contribScore = item.contributionScore || 0
          const criterionScores = item.scoreByCriterion || {}

          return (
            <div key={u._id} className="report-member-card surface-card">
              <div className="member-card-header">
                <div className="member-info-row">
                  <div className="member-avatar large">{name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h3>{name}</h3>
                    <small>{item.evaluationCount} evaluation{item.evaluationCount !== 1 ? 's' : ''} received</small>
                  </div>
                </div>

                <div className="overall-score-badge">
                  <Star size={16} className="star-icon-filled" />
                  <strong>{avgScore.toFixed(1)}</strong>
                  <span>/ 5.0</span>
                </div>
              </div>

              {/* Contribution Percentage Progress */}
              <div className="contribution-progress-block">
                <div className="progress-label-row">
                  <span>Overall Contribution Score</span>
                  <strong>{contribScore}%</strong>
                </div>
                <div className="stat-progress-bar-bg">
                  <div className="stat-progress-bar-fill" style={{ width: `${contribScore}%` }} />
                </div>
              </div>

              {/* Criteria Scores Breakdown */}
              <div className="criteria-breakdown-list">
                <h4>Criteria Performance</h4>
                <div className="criteria-items-grid">
                  {Object.entries(CRITERIA_LABELS).map(([key, label]) => {
                    const score = criterionScores[key] || 0
                    const percent = (score / 5) * 100
                    return (
                      <div key={key} className="criterion-breakdown-item">
                        <div className="criterion-label-row">
                          <span>{label}</span>
                          <strong>{score > 0 ? score.toFixed(1) : 'N/A'}</strong>
                        </div>
                        <div className="mini-progress-bg">
                          <div className="mini-progress-fill" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
