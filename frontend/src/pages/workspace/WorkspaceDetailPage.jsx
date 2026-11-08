import { readWorkspaceHeader } from '../../utils/workspaceHeaderCache.js'
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Flag, FileText, LoaderCircle, MessageSquare, Settings2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReportDialog from '../../components/workspace/ReportDialog.jsx'
import WorkspaceMembers from '../../components/workspace/WorkspaceMembers.jsx'
import WorkspaceSettingsDialog from '../../components/workspace/WorkspaceSettingsDialog.jsx'
import { getWorkspace, getWorkspaceInvitations, getWorkspaceMembers } from '../../services/workspaceService.js'
import { listTasks } from '../../services/taskService.js'
import { formatDate } from '../../utils/formatDate.js'
import useAuth from '../../hooks/useAuth.js'
import { getTaskBoardStatus, TASK_STATUS_LABELS } from '../../utils/taskStatus.js'

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState(() => readWorkspaceHeader(workspaceId))
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportTarget, setReportTarget] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const loadMembers = useCallback(() => Promise.all([
    getWorkspaceMembers(workspaceId),
    getWorkspaceInvitations(workspaceId),
  ]).then(([memberResponse, invitationResponse]) => {
    setMembers(memberResponse.data.data || [])
    setInvitations(invitationResponse.data.data || [])
  }), [workspaceId])
  useEffect(() => { let active = true; Promise.all([getWorkspace(workspaceId), getWorkspaceMembers(workspaceId), getWorkspaceInvitations(workspaceId), listTasks(workspaceId)]).then(([workspaceResponse, memberResponse, invitationResponse, taskResponse]) => { if (!active) return; setWorkspace(workspaceResponse.data.data); setMembers(memberResponse.data.data || []); setInvitations(invitationResponse.data.data || []); setTasks(taskResponse.data.data || []) }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load workspace') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [workspaceId])
  if (loading && !workspace) return <div className="route-loading"><LoaderCircle className="spin" size={22} /> Loading workspace...</div>
  if (error || !workspace) return <div className="inline-error" role="alert">{error || 'Workspace not found'}</div>
  const completed = tasks.filter((task) => task.status === 'DONE').length
  const activeTaskCount = tasks.filter((task) => task.status !== 'CANCELLED').length
  const progress = activeTaskCount ? Math.round((completed / activeTaskCount) * 100) : 0
  const role = members.find((member) => member.userId?._id === user?._id)?.role || 'MEMBER'
  return (
    <div className="workspace-detail">
      <Link className="back-link" to="/workspaces"><ArrowLeft size={16} /> All workspaces</Link>
      <section className="workspace-hero">
        <div className="workspace-hero-icon">{workspace.avatar ? <img src={workspace.avatar} alt="" /> : workspace.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <span className="eyebrow">{(workspace.type || 'WORKSPACE').replaceAll('_', ' ')}</span>
          <h1>{workspace.name}</h1>
          <p>{workspace.description || 'A focused space for your group to collaborate.'}</p>
        </div>
        <button type="button" className="workspace-report-trigger" onClick={() => setReportTarget({ type: 'WORKSPACE', id: workspaceId, name: workspace.name })} aria-label="Report workspace" title="Report workspace"><Flag size={17} /></button>
        {role === 'OWNER' && (
          <button className="icon-action workspace-settings-trigger" aria-label="Workspace settings" title="Workspace settings" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={18} />
          </button>
        )}
      </section>
      <nav className="workspace-tabs">
        <Link className="active" to={`/workspaces/${workspaceId}`}>Overview</Link>
        <Link to={`/workspaces/${workspaceId}/tasks`}>Tasks</Link>
        <Link to={`/workspaces/${workspaceId}/chat`}>Chat</Link>
        <Link to={`/workspaces/${workspaceId}/polls`}>Polls</Link>
        <Link to={`/workspaces/${workspaceId}/documents`}>Documents</Link>
        <Link to={`/workspaces/${workspaceId}/evaluations`}>Evaluation</Link>
        <Link to={`/workspaces/${workspaceId}/ai`}>AI assistant</Link>
      </nav>
      {loading ? <div className="route-loading" role="status">Loading workspace details...</div> : <><div className="workspace-overview-grid">
        <section className="surface-card workspace-summary">
          <div className="section-heading">
            <div><span className="eyebrow">PROJECT PULSE</span><h2>Workspace overview</h2></div>
          </div>
          <div className="workspace-metrics">
            <div><span className="overview-metric-icon"><Users size={17} /></span><span><strong>{members.length}</strong><small>Members</small></span></div>
            <div><span className="overview-metric-icon blue"><CalendarDays size={17} /></span><span><strong>{tasks.length}</strong><small>Total tasks</small></span></div>
            <div><span className="overview-metric-icon green"><CheckCircle2 size={17} /></span><span><strong>{progress}%</strong><small>Task progress</small></span></div>
          </div>
          <div className="recent-task-list">
            <div className="overview-task-heading"><h3>Recent tasks</h3><Link to={`/workspaces/${workspaceId}/tasks`}>View board <ArrowRight size={14} /></Link></div>
            {tasks.slice(0, 5).map((task) => {
              const boardStatus = getTaskBoardStatus(task)
              return (
                <div className="recent-task" key={task._id}>
                  <span className={`status-dot ${boardStatus.toLowerCase()}`} />
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.deadline ? formatDate(task.deadline) : 'No deadline'}</small>
                  </span>
                  <span className="role-tag">{TASK_STATUS_LABELS[boardStatus]}</span>
                </div>
              )
            })}
            {!tasks.length && <div className="overview-empty-tasks"><span><CheckCircle2 size={20} /></span><div><strong>Start with your first task</strong><p>Give your team a clear next step and track it together.</p></div><Link to={`/workspaces/${workspaceId}/tasks`}>Open task board <ArrowRight size={14} /></Link></div>}
          </div>
        </section>
        <section className="surface-card workspace-links">
          <span className="eyebrow">QUICK ACCESS</span>
          <h2>Keep momentum</h2>
          <button onClick={() => navigate(`/workspaces/${workspaceId}/chat`)}>
            <MessageSquare size={16} /><span><strong>Open group chat</strong><small>Catch up on decisions</small></span>
          </button>
          <button onClick={() => navigate(`/workspaces/${workspaceId}/tasks`)}>
            <CalendarDays size={16} /><span><strong>Review tasks</strong><small>See what needs attention</small></span>
          </button>
          <button onClick={() => navigate(`/workspaces/${workspaceId}/documents`)}>
            <FileText size={16} /><span><strong>Shared documents</strong><small>Find your team resources</small></span>
          </button>
        </section>
      </div>
      <div className="surface-card workspace-members-card"><WorkspaceMembers workspaceId={workspaceId} members={members} invitations={invitations} role={role} onChanged={loadMembers} currentUserId={user?._id} onReport={(person) => setReportTarget({ type: 'USER', id: person._id, name: person.name || 'Member' })} /></div>
      </>}
      {reportTarget && <ReportDialog workspaceId={workspaceId} targetType={reportTarget.type} targetId={reportTarget.id} targetName={reportTarget.name} onClose={() => setReportTarget(null)} />}
      {settingsOpen && (
        <WorkspaceSettingsDialog
          workspace={workspace}
          onUpdated={(updated) => setWorkspace((current) => ({ ...current, ...updated }))}
          onClose={() => setSettingsOpen(false)}
          onDeleted={(result) => navigate('/workspaces', {
            replace: true,
            state: {
              notice: result?.cleanupPending
                ? `“${workspace.name}” was deleted. Eligible members can download documents until ${new Date(result.purgeAt).toLocaleString()}; cleanup needs attention: ${result.cleanupWarnings.join(', ')}.`
                : `“${workspace.name}” was deleted. Eligible members can access permitted documents until ${new Date(result.purgeAt).toLocaleString()}.`,
              cleanupPending: Boolean(result?.cleanupPending),
            },
          })}
        />
      )}
    </div>
  )
}
