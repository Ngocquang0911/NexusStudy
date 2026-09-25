import { ArrowLeft, CalendarDays, LoaderCircle, MessageSquare, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import WorkspaceMembers from '../../components/workspace/WorkspaceMembers.jsx'
import { getWorkspace, getWorkspaceMembers } from '../../services/workspaceService.js'
import { listTasks } from '../../services/taskService.js'
import { formatDate } from '../../utils/formatDate.js'
import useAuth from '../../hooks/useAuth.js'

export default function WorkspaceDetailPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadMembers = useCallback(() => getWorkspaceMembers(workspaceId).then(({ data }) => setMembers(data.data || [])), [workspaceId])
  useEffect(() => { let active = true; Promise.all([getWorkspace(workspaceId), getWorkspaceMembers(workspaceId), listTasks(workspaceId)]).then(([workspaceResponse, memberResponse, taskResponse]) => { if (!active) return; setWorkspace(workspaceResponse.data.data); setMembers(memberResponse.data.data || []); setTasks(taskResponse.data.data || []) }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load workspace') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [workspaceId])
  if (loading) return <div className="route-loading"><LoaderCircle className="spin" size={22} /> Loading workspace...</div>
  if (error || !workspace) return <div className="inline-error" role="alert">{error || 'Workspace not found'}</div>
  const completed = tasks.filter((task) => task.status === 'DONE').length
  const role = members.find((member) => member.userId?._id === user?._id)?.role || 'MEMBER'
  return <div className="workspace-detail"><Link className="back-link" to="/workspaces"><ArrowLeft size={16} /> All workspaces</Link><section className="workspace-hero"><div className="workspace-hero-icon">{workspace.name.slice(0, 1).toUpperCase()}</div><div><span className="eyebrow">{workspace.type}</span><h1>{workspace.name}</h1><p>{workspace.description || 'A focused space for your group to collaborate.'}</p></div><button className="icon-action" aria-label="Workspace settings"><Settings2 size={18} /></button></section><nav className="workspace-tabs"><Link className="active" to={`/workspaces/${workspaceId}`}>Overview</Link><Link to={`/workspaces/${workspaceId}/tasks`}>Tasks</Link><Link to={`/workspaces/${workspaceId}/chat`}>Chat</Link><Link to={`/workspaces/${workspaceId}/polls`}>Polls</Link><Link to={`/workspaces/${workspaceId}/documents`}>Documents</Link><Link to={`/workspaces/${workspaceId}/evaluations`}>Evaluation</Link><Link to={`/workspaces/${workspaceId}/ai`}>AI assistant</Link></nav><div className="workspace-overview-grid"><section className="surface-card workspace-summary"><div className="section-heading"><div><span className="eyebrow">PROJECT PULSE</span><h2>Workspace overview</h2></div></div><div className="workspace-metrics"><div><strong>{members.length}</strong><small>Members</small></div><div><strong>{tasks.length}</strong><small>Total tasks</small></div><div><strong>{tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%</strong><small>Task progress</small></div></div><div className="recent-task-list"><h3>Recent tasks</h3>{tasks.slice(0, 5).map((task) => <div className="recent-task" key={task._id}><span className={`status-dot ${task.status.toLowerCase()}`} /><span><strong>{task.title}</strong><small>{task.deadline ? formatDate(task.deadline) : 'No deadline'}</small></span><span className="role-tag">{task.status.replace('_', ' ')}</span></div>)}{!tasks.length && <p className="muted-copy">No tasks have been created yet.</p>}</div></section><section className="surface-card workspace-links"><span className="eyebrow">QUICK ACCESS</span><h2>Keep momentum</h2><button onClick={() => navigate(`/workspaces/${workspaceId}/chat`)}><MessageSquare size={16} /><span><strong>Open group chat</strong><small>Catch up on decisions</small></span></button><button onClick={() => navigate(`/workspaces/${workspaceId}/tasks`)}><CalendarDays size={16} /><span><strong>Review tasks</strong><small>See what needs attention</small></span></button></section></div><div className="surface-card"><WorkspaceMembers workspaceId={workspaceId} members={members} role={role} onChanged={loadMembers} /></div></div>
}
