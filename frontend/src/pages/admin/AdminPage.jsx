import { useDeferredValue, useEffect, useState } from 'react'
import { Activity, Building2, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, HardDrive, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { formatDate } from '../../utils/formatDate.js'
import { getAdminOverview, getAdminWorkspace, listAdminUsers, listAdminWorkspaces, updateAdminUserPlan, updateAdminUserRole } from '../../services/adminService.js'
import './AdminPage.css'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'workspaces', label: 'All workspaces' },
]

function errorMessage(error) {
  return error.response?.data?.message || 'Unable to load admin data. Please try again.'
}

function Stat({ label, value, icon: Icon, tone }) {
  return (
    <article className="admin-stat">
      <span className={`admin-stat-icon ${tone}`}><Icon size={18} /></span>
      <span className="admin-stat-label">{label}</span>
      <strong>{Number(value || 0).toLocaleString()}</strong>
    </article>
  )
}

function formatBytes(value = 0) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unitIndex = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  return `${(value / (1024 ** unitIndex)).toFixed(unitIndex > 1 ? 1 : 0)} ${units[unitIndex]}`
}

function TrendChart({ title, points = [] }) {
  const maximum = Math.max(1, ...points.map(({ count }) => count))
  const hasData = points.some(({ count }) => count > 0)
  return (
    <section className="admin-panel admin-chart-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Daily totals from database records.</p>
        </div>
      </div>
      {hasData ? (
        <div className="admin-chart" role="img" aria-label={`${title} bar chart`}>
          {points.map(({ date, count }) => (
            <span
              className="admin-chart-bar"
              key={date}
              title={`${date}: ${count}`}
              style={{ height: `${Math.max(count ? 6 : 0, count / maximum * 100)}%` }}
            />
          ))}
        </div>
      ) : (
        <p className="admin-empty">No records in this period.</p>
      )}
      <div className="admin-chart-range">
        <span>{points[0]?.date || ''}</span>
        <span>{points.at(-1)?.date || ''}</span>
      </div>
    </section>
  )
}

function Pagination({ page, pages, onChange }) {
  return (
    <div className="admin-pagination">
      <span>Page {page} of {Math.max(1, pages)}</span>
      <div>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  )
}

function workspaceStatusLabel(status) {
  return status === 'PURGING' ? 'Purging' : status === 'DELETED' ? 'Deleted / archived' : 'Active'
}

function WorkspaceDetailsDialog({ workspaceId, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getAdminWorkspace(workspaceId)
      .then(({ data }) => { if (active) setDetails(data.data) })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [workspaceId])

  return (
    <div
      className="admin-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="admin-workspace-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-workspace-title">
        <header className="admin-workspace-dialog-heading">
          <div>
            <span className="eyebrow">SYSTEM GOVERNANCE</span>
            <h2 id="admin-workspace-title">Workspace oversight details</h2>
          </div>
          <button type="button" className="admin-dialog-close" onClick={onClose} aria-label="Close workspace details">
            <X size={18} />
          </button>
        </header>
        {loading ? (
          <p className="admin-empty" role="status">Loading workspace details...</p>
        ) : error ? (
          <p className="admin-alert" role="alert">{error}</p>
        ) : details && (
          <>
            <dl className="admin-workspace-facts">
              <div><dt>Workspace Name</dt><dd>{details.workspace.name}</dd></div>
              <div><dt>Owner</dt><dd>{details.workspace.ownerId?.name || 'Unknown'}{details.workspace.ownerId?.email && <small>{details.workspace.ownerId.email}</small>}</dd></div>
              <div><dt>Status</dt><dd><span className={`admin-status-badge ${details.workspace.status?.toLowerCase()}`}>{workspaceStatusLabel(details.workspace.status)}</span></dd></div>
              <div><dt>Type</dt><dd>{(details.workspace.type || 'UNKNOWN').replaceAll('_', ' ')}</dd></div>
              <div><dt>Created at</dt><dd>{formatDate(details.workspace.createdAt)}</dd></div>
              {details.workspace.deletedAt && <div><dt>Deleted at</dt><dd>{formatDate(details.workspace.deletedAt)}</dd></div>}
              {details.workspace.purgeAt && <div><dt>Permanent Purge</dt><dd>{formatDate(details.workspace.purgeAt)}</dd></div>}
              <div className="wide"><dt>Description</dt><dd>{details.workspace.description || 'No description provided'}</dd></div>
            </dl>
            <div className="admin-workspace-members">
              <h3>Workspace Members <span>({details.members?.length || 0})</span></h3>
              {details.members?.length ? (
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Member Account</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.members.map((member) => (
                        <tr key={member._id || member.userId?._id}>
                          <td className="admin-user-name">
                            <span className="admin-user-cell">
                              {member.userId?.avatar ? (
                                <img src={member.userId.avatar} alt="" />
                              ) : (
                                <span aria-hidden="true">{member.userId?.name?.charAt(0).toUpperCase() || 'U'}</span>
                              )}
                              {member.userId?.name || 'Unavailable account'}
                            </span>
                            <small className="admin-room-description">{member.userId?.email || ''}</small>
                          </td>
                          <td>
                            <span className={`admin-role-badge ${member.role?.toLowerCase()}`}>{member.role}</span>
                          </td>
                          <td>{formatDate(member.joinedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="admin-empty">No current members recorded.</p>
              )}
            </div>
            <p className="admin-readonly-note">
              Administrative oversight is read-only. Inspecting a workspace does not enroll the Admin as a member or alter member permissions.
            </p>
          </>
        )}
      </section>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedSection = searchParams.get('section')
  const section = sections.some(({ id }) => id === requestedSection) ? requestedSection : 'overview'
  const [overview, setOverview] = useState(null)
  const [rows, setRows] = useState([])
  const [workspaceSummary, setWorkspaceSummary] = useState(null)
  const [workspaceStatus, setWorkspaceStatus] = useState('ALL')
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [rowsSection, setRowsSection] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [roleFilter, setRoleFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [range, setRange] = useState('30d')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [savingUser, setSavingUser] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const request = section === 'overview'
      ? getAdminOverview(range).then(({ data }) => { if (active) setOverview(data.data) })
      : section === 'users'
        ? listAdminUsers({ search: deferredSearch, role: roleFilter, plan: planFilter, page }).then(({ data }) => {
          if (active) { setRows(data.data.users); setRowsSection('users'); setPages(data.data.pages) }
        })
        : listAdminWorkspaces(
            workspaceStatus && workspaceStatus !== 'ALL'
              ? { search: deferredSearch, status: workspaceStatus, page }
              : { search: deferredSearch, page }
          ).then(({ data }) => {
            if (active) {
              setRows(data.data.workspaces || [])
              setWorkspaceSummary(data.data.summary || null)
              setRowsSection('workspaces')
              setPages(data.data.pages || 1)
            }
          })

    request.catch((requestError) => {
      if (!active) return
      setError(errorMessage(requestError))
      if (section !== 'overview') {
        setRows([])
        setWorkspaceSummary(null)
        setRowsSection(section)
        setPages(1)
      }
    })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [section, deferredSearch, roleFilter, planFilter, workspaceStatus, page, refresh, range])
  const directoryLoading = loading || (section !== 'overview' && rowsSection !== section)

  function changeSection(nextSection) {
    setSearchParams(nextSection === 'overview' ? {} : { section: nextSection })
    setSearch('')
    setRoleFilter('')
    setPlanFilter('')
    setPage(1)
    setNotice('')
    if (nextSection === 'workspaces') setWorkspaceStatus('ALL')
  }

  async function changeRole(targetUser, systemRole) {
    if (!window.confirm(`Change ${targetUser.name}'s system role to ${systemRole}?`)) return
    const reason = window.prompt('Reason for this role change (required):')?.trim()
    if (!reason) return
    setSavingUser(targetUser._id)
    setNotice('')
    setError('')
    try {
      const { data } = await updateAdminUserRole(targetUser._id, systemRole, reason)
      setRows((current) => current.map((row) => row._id === targetUser._id ? data.data : row))
      setNotice(`Role updated for ${targetUser.name}.`)
    } catch (requestError) {
      setError(errorMessage(requestError))
      setRefresh((value) => value + 1)
    } finally {
      setSavingUser('')
    }
  }

  async function changePlan(targetUser, subscriptionPlan) {
    if (!window.confirm(`Change ${targetUser.name}'s plan to ${subscriptionPlan}?`)) return
    const reason = window.prompt('Reason for this plan change (required):')?.trim()
    if (!reason) return
    setSavingUser(targetUser._id)
    setNotice('')
    setError('')
    try {
      const { data } = await updateAdminUserPlan(targetUser._id, subscriptionPlan, reason)
      setRows((current) => current.map((row) => row._id === targetUser._id ? data.data : row))
      setNotice(`Plan updated for ${targetUser.name}.`)
    } catch (requestError) {
      setError(errorMessage(requestError))
      setRefresh((value) => value + 1)
    } finally {
      setSavingUser('')
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-heading">
        <div>
          <span className="eyebrow">SYSTEM CONTROL</span>
          <h1>Administration</h1>
          <p>System oversight, user management, and workspace governance.</p>
        </div>
        <button
          className="admin-refresh"
          type="button"
          onClick={() => setRefresh((value) => value + 1)}
          aria-label="Refresh admin data"
          title="Refresh"
        >
          <RefreshCw size={17} />
        </button>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        {sections.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={section === id ? 'active' : ''}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => changeSection(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="admin-alert" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status">{notice}</p>}

      {section === 'overview' && (
        <>
          <div className="admin-overview-toolbar">
            <label htmlFor="admin-range">Trend period</label>
            <select id="admin-range" value={range} onChange={(event) => setRange(event.target.value)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          {overview ? (
            <>
              <div className="admin-summary-grid">
                <Stat label="Registered users" value={overview.users?.total} icon={Users} tone="coral" />
                <Stat label="Premium users" value={overview.users?.premium} icon={ShieldCheck} tone="green" />
                <Stat label="Total workspaces" value={overview.workspaces?.total} icon={Building2} tone="blue" />
                <Stat label="Overdue tasks" value={overview.tasks?.overdue} icon={Clock3} tone="gold" />
              </div>
              <div className="admin-capabilities">
                {[
                  ['Active users', overview.capabilities?.activeUsers],
                  ['AI usage', overview.capabilities?.aiUsage],
                  ['Moderation reports', overview.capabilities?.reports],
                ].filter(([, available]) => !available).map(([label]) => (
                  <span key={label}>{label}: not tracked yet</span>
                ))}
              </div>
              <div className="admin-metric-groups">
                <details className="admin-metric-group">
                  <summary>
                    <span><strong>Accounts & subscriptions</strong><small>Registration, roles, and Free/Premium totals</small></span>
                    <span className="admin-group-count">{Number(overview.users?.newToday || 0).toLocaleString()} new today</span>
                  </summary>
                  <div className="admin-stats-grid">
                    <Stat label="New users today" value={overview.users?.newToday} icon={Activity} tone="green" />
                    <Stat label="New users in 7 days" value={overview.users?.newLast7Days} icon={Activity} tone="blue" />
                    <Stat label="New users in 30 days" value={overview.users?.newLast30Days} icon={Activity} tone="gold" />
                    <Stat label="Administrators" value={overview.users?.admins} icon={ShieldCheck} tone="green" />
                    <Stat label="Free users" value={overview.users?.free} icon={Users} tone="gold" />
                  </div>
                </details>
                <details className="admin-metric-group">
                  <summary>
                    <span><strong>Workspaces oversight</strong><small>Workspace creation and membership</small></span>
                    <span className="admin-group-count">{Number(overview.workspaces?.createdThisMonth || 0).toLocaleString()} this month</span>
                  </summary>
                  <div className="admin-stats-grid">
                    <Stat label="Total workspaces" value={overview.workspaces?.total} icon={Building2} tone="blue" />
                    <Stat label="Created this month" value={overview.workspaces?.createdThisMonth} icon={Activity} tone="gold" />
                    <Stat label="Workspace memberships" value={overview.workspaces?.members} icon={Users} tone="green" />
                  </div>
                </details>
                <details className="admin-metric-group">
                  <summary>
                    <span><strong>Tasks & storage</strong><small>Task status, retained files, and notifications</small></span>
                    <span className="admin-group-count">{Number(overview.tasks?.total || 0).toLocaleString()} tasks</span>
                  </summary>
                  <div className="admin-stats-grid">
                    <Stat label="Total tasks" value={overview.tasks?.total} icon={Activity} tone="blue" />
                    <Stat label="Completed tasks" value={overview.tasks?.completed} icon={CheckCircle2} tone="green" />
                    <Stat label="Overdue tasks" value={overview.tasks?.overdue} icon={Clock3} tone="coral" />
                    <article className="admin-stat">
                      <span className="admin-stat-icon gold"><HardDrive size={18} /></span>
                      <span className="admin-stat-label">Stored files</span>
                      <strong>{formatBytes(overview.content?.documentStorageBytes)}</strong>
                    </article>
                    <Stat label="Files expiring in 7 days" value={overview.content?.documentsExpiringSoon} icon={Clock3} tone="gold" />
                    <Stat label="Notifications" value={overview.content?.notifications} icon={Activity} tone="blue" />
                  </div>
                </details>
                <details className="admin-metric-group">
                  <summary>
                    <span><strong>Growth trends</strong><small>Daily account and workspace creation</small></span>
                    <span className="admin-group-count">{range.replace('d', ' days')}</span>
                  </summary>
                  <div className="admin-trends-grid">
                    <TrendChart title="Account growth" points={overview.trends?.users} />
                    <TrendChart title="Workspace growth" points={overview.trends?.workspaces} />
                  </div>
                </details>
              </div>
              <div className="admin-metric-groups">
                {overview?.recentActivity?.length > 0 && (
                  <details className="admin-metric-group">
                    <summary>
                      <span><strong>Recent system activity</strong><small>Account, workspace, and admin events; private message content is excluded</small></span>
                      <span className="admin-group-count">{overview.recentActivity.length} recent events</span>
                    </summary>
                    <ul className="admin-activity-list">
                      {overview.recentActivity.map((item) => (
                        <li key={item.id}>
                          <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                          <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <details className="admin-metric-group">
                  <summary>
                    <span><strong>Recently registered</strong><small>Latest accounts created on NEXUS STUDY</small></span>
                    <span className="admin-group-count">{overview.recentUsers?.length || 0} accounts</span>
                  </summary>
                  {loading ? (
                    <p className="admin-empty">Loading recent users...</p>
                  ) : (
                    <div className="admin-table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr><th>Name</th><th>Email</th><th>System role</th><th>Joined</th></tr>
                        </thead>
                        <tbody>
                          {(overview.recentUsers || []).map((item) => (
                            <tr key={item._id}>
                              <td className="admin-user-name">{item.name}</td>
                              <td>{item.email}</td>
                              <td><span className={`admin-role-badge ${item.systemRole.toLowerCase()}`}>{item.systemRole}</span></td>
                              <td>{formatDate(item.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!overview.recentUsers?.length && <p className="admin-empty">No users registered yet.</p>}
                    </div>
                  )}
                  <div className="admin-recent-users-action">
                    <button type="button" onClick={() => changeSection('users')}>
                      View all users <ChevronRight size={15} />
                    </button>
                  </div>
                </details>
              </div>
            </>
          ) : (
            <p className="admin-empty" role="status">
              {loading ? 'Loading admin dashboard...' : 'Dashboard data is not available.'}
            </p>
          )}
        </>
      )}

      {section === 'users' && (
        <section className="admin-panel admin-directory">
          <div className="admin-panel-heading">
            <div>
              <h2>User accounts</h2>
              <p>Manage system roles and manually assign Free or Premium plans.</p>
            </div>
          </div>
          <div className="admin-toolbar">
            <label className="admin-search">
              <Search size={17} />
              <input
                aria-label="Search users"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                placeholder="Search name or email"
              />
            </label>
            <select
              aria-label="Filter by system role"
              value={roleFilter}
              onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }}
            >
              <option value="">All roles</option>
              <option value="STUDENT">Student</option>
              <option value="LECTURER">Lecturer</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              aria-label="Filter by subscription plan"
              value={planFilter}
              onChange={(event) => { setPlanFilter(event.target.value); setPage(1) }}
            >
              <option value="">All plans</option>
              <option value="FREE">Free</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </div>
          {directoryLoading ? (
            <p className="admin-empty" role="status">Loading users...</p>
          ) : error ? (
            <p className="admin-empty">Unable to load users. Please retry.</p>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>ID</th>
                    <th>Joined</th>
                    <th>Workspaces</th>
                    <th>System role</th>
                    <th>Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr key={item._id}>
                      <td className="admin-user-name">
                        <span className="admin-user-cell">
                          {item.avatar ? (
                            <img src={item.avatar} alt="" />
                          ) : (
                            <span aria-hidden="true">{item.name.charAt(0).toUpperCase()}</span>
                          )}
                          {item.name}
                          {item._id === user?._id && <small className="admin-you">You</small>}
                        </span>
                        <small className="admin-room-description">{item.email}</small>
                      </td>
                      <td title={item._id}>{item._id.slice(-8)}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{item.workspaceCount ?? 0}</td>
                      <td>
                        <select
                          aria-label={`Role for ${item.name}`}
                          value={item.systemRole}
                          disabled={savingUser === item._id || item._id === user?._id}
                          onChange={(event) => changeRole(item, event.target.value)}
                        >
                          <option value="STUDENT">Student</option>
                          <option value="LECTURER">Lecturer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`Plan for ${item.name}`}
                          value={item.subscriptionPlan || 'FREE'}
                          disabled={savingUser === item._id}
                          onChange={(event) => changePlan(item, event.target.value)}
                        >
                          <option value="FREE">Free</option>
                          <option value="PREMIUM">Premium</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <p className="admin-empty">No users match this search.</p>}
            </div>
          )}
          {!directoryLoading && pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
        </section>
      )}

      {section === 'workspaces' && (
        <section className="admin-workspaces">
          <header className="admin-panel admin-panel-heading">
            <div>
              <h2>All workspaces</h2>
              <p>System-wide, read-only oversight of workspaces created by users.</p>
            </div>
          </header>
          <div className="admin-summary-grid">
            <Stat label="Total workspaces" value={workspaceSummary?.total} icon={Building2} tone="blue" />
            <Stat label="Active workspaces" value={workspaceSummary?.active} icon={Activity} tone="green" />
            <Stat label="Deleted / archived" value={workspaceSummary?.deleted} icon={HardDrive} tone="gold" />
            <Stat label="Purging" value={workspaceSummary?.purging} icon={Clock3} tone="coral" />
          </div>
          <section className="admin-panel admin-directory">
            <div className="admin-toolbar">
              <label className="admin-search">
                <Search size={17} />
                <input
                  aria-label="Search workspaces or owners"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                  placeholder="Search workspace or owner"
                />
              </label>
              <select
                aria-label="Filter workspaces by status"
                value={workspaceStatus}
                onChange={(event) => { setWorkspaceStatus(event.target.value); setPage(1) }}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DELETED">Deleted / archived</option>
                <option value="PURGING">Purging</option>
              </select>
            </div>
            {directoryLoading ? (
              <p className="admin-empty" role="status">Loading workspaces...</p>
            ) : error ? (
              <p className="admin-empty" role="alert">{error}</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Workspace</th>
                      <th>Owner</th>
                      <th>Members</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item._id}>
                        <td className="admin-user-name">
                          {item.name || 'Untitled workspace'}
                          <small className="admin-room-description">
                            {(item.type || 'UNKNOWN').replaceAll('_', ' ')}
                          </small>
                        </td>
                        <td>
                          {item.ownerId?.name || 'Unknown'}
                          <small className="admin-room-description">{item.ownerId?.email || ''}</small>
                        </td>
                        <td>{item.memberCount ?? 0}</td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          <span className={`admin-status-badge ${item.status?.toLowerCase()}`}>
                            {workspaceStatusLabel(item.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-workspace-details-button"
                            onClick={() => setSelectedWorkspaceId(item._id)}
                            aria-label={`View details for ${item.name}`}
                          >
                            <Eye size={15} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <p className="admin-empty">
                    {search || workspaceStatus !== 'ALL'
                      ? 'No workspaces match these filters.'
                      : 'No workspaces have been created.'}
                  </p>
                )}
              </div>
            )}
            {!directoryLoading && pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
          </section>
        </section>
      )}

      {selectedWorkspaceId && (
        <WorkspaceDetailsDialog
          workspaceId={selectedWorkspaceId}
          onClose={() => setSelectedWorkspaceId('')}
        />
      )}
    </section>
  )
}