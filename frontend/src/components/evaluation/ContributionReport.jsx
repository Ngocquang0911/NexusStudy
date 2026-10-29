import { BarChart3, Download, ShieldAlert, Star } from 'lucide-react'

const CRITERIA_LABELS = {
  RESPONSIBILITY: 'Responsibility',
  TASK_COMPLETION: 'Task Completion',
  COLLABORATION: 'Collaboration',
  ATTENDANCE: 'Attendance',
  WORK_QUALITY: 'Work Quality',
  COMMUNICATION: 'Communication',
}

function csvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function downloadCsv(members, period) {
  const rows = [['Member', 'Average score', 'Contribution score', 'Task', 'Task status', 'Outcome', 'Deadline', 'Completed at']]
  for (const member of members) {
    const name = member.user?.name || member.user?.email || 'Team Member'
    const tasks = member.taskOutcomes || []
    if (!tasks.length) {
      rows.push([
        name,
        member.averageScore ?? 'N/A',
        member.contributionScore == null ? 'N/A' : `${member.contributionScore}%`,
        '', '', '', '', '',
      ])
      continue
    }
    for (const task of tasks) {
      rows.push([
        name,
        member.averageScore,
        member.contributionScore == null ? 'N/A' : `${member.contributionScore}%`,
        task.title,
        task.status,
        task.outcome,
        task.deadline ? new Date(task.deadline).toLocaleString() : '',
        task.completedAt ? new Date(task.completedAt).toLocaleString() : '',
      ])
    }
  }
  const contents = `\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `nexus-study-contribution-${period || 'report'}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export default function ContributionReport({ reportData, isPrivate = false, isLeader = false, privateMessage = '' }) {
  if (isPrivate) {
    return (
      <div className="workspace-empty surface-card">
        <ShieldAlert size={40} className="text-amber" />
        <h2>Contribution Report Unavailable</h2>
        <p>{privateMessage || 'Results will be available after the evaluation period ends. Contribution reports require a Premium plan and workspace leader access.'}</p>
      </div>
    )
  }

  const members = reportData?.members || []
  const ratedMembers = members.filter((member) => member.averageScore != null)
  const totalEvaluationsCount = reportData?.evaluationCount || 0
  const period = reportData?.period

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
      {isLeader && (
        <div className="report-actions">
          <span className="muted-hint">Report period: {period || 'completed period'}</span>
          <button type="button" className="secondary-action" onClick={() => downloadCsv(members, period)}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      )}
      {/* Report Header Metrics */}
      <div className="task-stats-summary-card margin-bottom-lg">
        <div className="stat-pill">
          <span className="stat-num">{members.length}</span>
          <span className="stat-label">Workspace Members</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-blue">{totalEvaluationsCount}</span>
          <span className="stat-label">Total Submissions</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-green">
            {ratedMembers.length
              ? `${Math.round(ratedMembers.reduce((sum, member) => sum + member.averageScore, 0) / ratedMembers.length * 10) / 10} / 5.0`
              : 'N/A'}
          </span>
          <span className="stat-label">Average Group Rating</span>
        </div>
      </div>

      {/* Member Performance Cards */}
      <div className="report-members-grid">
        {members.map((item) => {
          const u = item.user || {}
          const name = u.name || u.email || 'Team Member'
          const avgScore = item.averageScore
          const contribScore = item.contributionScore
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
                  <strong>{avgScore == null ? 'N/A' : avgScore.toFixed(1)}</strong>
                  <span>/ 5.0</span>
                </div>
              </div>

              {/* Contribution Percentage Progress */}
              <div className="contribution-progress-block">
                <div className="progress-label-row">
                  <span>Overall Contribution Score</span>
                  <strong>{contribScore == null ? 'N/A' : `${contribScore}%`}</strong>
                </div>
                <div className="stat-progress-bar-bg">
                  <div className="stat-progress-bar-fill" style={{ width: `${contribScore || 0}%` }} />
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
              <div className="criteria-breakdown-list">
                <h4>Task outcomes</h4>
                {item.taskOutcomes?.length ? (
                  <ul className="task-outcome-list">
                    {item.taskOutcomes.map((task, index) => (
                      <li key={`${task.title}-${index}`}>
                        <span>{task.title}</span>
                        <strong className={`task-outcome task-outcome-${task.outcome?.toLowerCase()}`}>
                          {task.outcome?.replaceAll('_', ' ') || task.status}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : <small className="muted-hint">No assigned tasks to report.</small>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
