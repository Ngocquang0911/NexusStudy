import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, CheckCircle2, FolderKanban, LoaderCircle, Plus, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { listTasks } from '../../services/taskService.js'
import { listWorkspaces } from '../../services/workspaceService.js'
import { formatDate } from '../../utils/formatDate.js'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      try {
        const workspaceResponse = await listWorkspaces()
        const workspaceData = workspaceResponse.data.data || []
        const taskResponses = await Promise.all(workspaceData.map((workspace) => listTasks(workspace._id)))
        if (!active) return
        setWorkspaces(workspaceData)
        setTasks(taskResponses.flatMap((response, index) => (response.data.data || []).map((task) => ({ ...task, workspace: workspaceData[index] }))))
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load your dashboard')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadDashboard()
    return () => { active = false }
  }, [])

  const openTasks = tasks.filter((task) => task.status !== 'DONE')
  const upcomingTasks = openTasks.filter((task) => task.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4)
  const completed = tasks.filter((task) => task.status === 'DONE').length
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0

  if (loading) return <div className="route-loading"><LoaderCircle className="spin" size={22} /> Loading your dashboard...</div>
  if (error) return <section className="dashboard-page"><div className="inline-error" role="alert">{error}</div></section>

  return <div className="dashboard-page"><section className="welcome-row"><div><span className="eyebrow">THURSDAY, SEPTEMBER 24, 2026</span><h1>Good morning, {user?.name?.split(' ')[0] || 'student'}.</h1><p>Your workspace for clearer collaboration starts here.</p></div><button className="primary-action" onClick={() => navigate('/workspaces')}><Plus size={17} /> Create workspace</button></section><section className="stats-row"><Stat label="Active workspaces" value={workspaces.length} icon={FolderKanban} tone="indigo" detail={workspaces.length ? 'Across your study groups' : 'Create your first workspace'} /><Stat label="Open tasks" value={openTasks.length} icon={CheckCircle2} tone="blue" detail={`${completed} completed in total`} /><Stat label="Upcoming deadlines" value={upcomingTasks.length} icon={CalendarDays} tone="amber" detail={upcomingTasks[0] ? formatDate(upcomingTasks[0].deadline) : 'No deadlines yet'} /></section>{workspaces.length === 0 ? <EmptyDashboard onCreate={() => navigate('/workspaces')} /> : <section className="dashboard-lower"><article className="surface-card setup-card"><div className="card-heading"><div><span className="eyebrow">YOUR WORKSPACES</span><h2>Keep your groups moving</h2></div><span className="progress-badge">{progress}% task progress</span></div><div className="workspace-list">{workspaces.slice(0, 4).map((workspace) => <button className="workspace-row" key={workspace._id} onClick={() => navigate(`/workspaces/${workspace._id}`)}><span className="workspace-initial">{workspace.name.slice(0, 1).toUpperCase()}</span><span><strong>{workspace.name}</strong><small>{workspace.type} · {workspace.role}</small></span><ArrowUpRight size={16} /></button>)}</div></article><article className="surface-card deadline-card"><div className="card-heading"><div><span className="eyebrow">UP NEXT</span><h2>Deadlines</h2></div><CalendarDays size={20} /></div>{upcomingTasks.length ? upcomingTasks.map((task) => <div className="deadline-row" key={task._id}><span className="deadline-dot" /><span><strong>{task.title}</strong><small>{task.workspace.name} · {formatDate(task.deadline)}</small></span></div>) : <div className="empty-card-content"><CalendarDays size={22} /><p>Your schedule is clear.</p></div>}</article></section>}</div>
}

function Stat({ label, value, icon: Icon, tone, detail }) { return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
function EmptyDashboard({ onCreate }) { return <section className="dashboard-lower"><article className="surface-card setup-card"><div className="card-heading"><div><span className="eyebrow">GET STARTED</span><h2>Build your first study workspace</h2></div><Sparkles className="card-spark" size={21} /></div><p>Bring tasks, group conversations, deadlines, and study materials into one focused place.</p><button className="primary-action" onClick={onCreate}><Plus size={16} /> Create workspace</button></article><article className="surface-card empty-card"><CalendarDays size={22} /><h2>Your schedule is clear</h2><p>Upcoming tasks and deadlines will appear here once your workspace is connected.</p></article></section> }
