import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, FolderKanban, LoaderCircle, Plus, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { listTasks } from '../../services/taskService.js'
import { listWorkspaces } from '../../services/workspaceService.js'
import { formatDate } from '../../utils/formatDate.js'
import { getTaskBoardStatus } from '../../utils/taskStatus.js'

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

  const openTasks = tasks.filter((task) => !['DONE', 'CANCELLED'].includes(task.status))
  const upcomingTasks = openTasks.filter((task) => task.deadline && getTaskBoardStatus(task) !== 'OVERDUE').sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  const overdueTasks = openTasks.filter((task) => getTaskBoardStatus(task) === 'OVERDUE')
  const completed = tasks.filter((task) => task.status === 'DONE').length
  const activeTaskCount = tasks.filter((task) => task.status !== 'CANCELLED').length
  const progress = activeTaskCount ? Math.round((completed / activeTaskCount) * 100) : 0
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now)

  if (loading) return <div className="route-loading"><LoaderCircle className="spin" size={22} /> Loading your dashboard...</div>
  if (error) return <section className="dashboard-page"><div className="inline-error" role="alert">{error}</div></section>

  return (
    <div className="dashboard-page dashboard-home">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-date"><CalendarDays size={14} /> {today}</span>
          <h1>{greeting}, {user?.name?.split(' ')[0] || 'student'} <span>✦</span></h1>
          <p>Everything you need to keep your study plans moving, all in one place.</p>
          <button className="dashboard-hero-button" onClick={() => navigate('/workspaces')}><Plus size={17} /> Explore workspaces <ArrowRight size={16} /></button>
        </div>
        <div className="dashboard-hero-aside">
          <span>YOUR PROGRESS</span>
          <div className="dashboard-progress-ring" style={{ '--progress': `${progress}%` }}><strong>{progress}%</strong><small>completed</small></div>
          <p>{completed} of {activeTaskCount} tasks completed</p>
        </div>
      </section>

      <section className="dashboard-metrics" aria-label="Your study overview">
        <Stat label="Workspaces" value={workspaces.length} icon={FolderKanban} tone="indigo" detail="Your study spaces" />
        <Stat label="Open tasks" value={openTasks.length} icon={ClipboardList} tone="blue" detail={overdueTasks.length ? `${overdueTasks.length} overdue` : 'Ready to make progress'} />
        <Stat label="Upcoming deadlines" value={upcomingTasks.length} icon={CalendarDays} tone="amber" detail={upcomingTasks[0] ? `Next: ${formatDate(upcomingTasks[0].deadline)}` : 'No deadlines yet'} />
        <Stat label="Completed" value={completed} icon={CheckCircle2} tone="green" detail="Tasks finished so far" />
      </section>

      <div className="dashboard-content-grid">
        <section className="dashboard-panel dashboard-workspaces">
          <header className="dashboard-panel-header"><div><span className="dashboard-kicker">YOUR SPACE</span><h2>Pick up where you left off</h2><p>Your groups and projects, together.</p></div><button onClick={() => navigate('/workspaces')}>View all <ArrowRight size={15} /></button></header>
          {workspaces.length ? <div className="dashboard-workspace-list">{workspaces.slice(0, 4).map((workspace, index) => <button className="dashboard-workspace-item" key={workspace._id} onClick={() => navigate(`/workspaces/${workspace._id}`)}><span className={`dashboard-workspace-avatar color-${index % 4}`}>{workspace.avatar ? <img src={workspace.avatar} alt="" /> : workspace.name?.charAt(0).toUpperCase() || 'W'}</span><span className="dashboard-workspace-info"><strong>{workspace.name}</strong><small>{(workspace.type || 'Workspace').replaceAll('_', ' ')} · {workspace.role || 'MEMBER'}</small></span><ArrowUpRight size={17} /></button>)}</div> : <div className="dashboard-empty"><FolderKanban size={24} /><strong>Your first workspace starts here</strong><p>Create a space to bring your group together.</p><button onClick={() => navigate('/workspaces')}>Explore workspaces <ArrowRight size={14} /></button></div>}
        </section>
        <section className="dashboard-panel dashboard-deadlines">
          <header className="dashboard-panel-header"><div><span className="dashboard-kicker">PLAN AHEAD</span><h2>Coming up</h2><p>Your next deadlines at a glance.</p></div><span className="dashboard-header-icon"><CalendarDays size={18} /></span></header>
          {upcomingTasks.length ? <div className="dashboard-deadline-list">{upcomingTasks.slice(0, 4).map((task) => <button className="dashboard-deadline-item" key={`${task.workspace._id}-${task._id}`} onClick={() => navigate(`/workspaces/${task.workspace._id}/tasks`)}><span className="dashboard-deadline-dot" /><span><strong>{task.title}</strong><small>{task.workspace.name}</small></span><time>{formatDate(task.deadline)}</time><ArrowUpRight size={15} /></button>)}</div> : <div className="dashboard-empty"><CalendarDays size={24} /><strong>No upcoming deadlines</strong><p>Tasks with a deadline will appear here.</p></div>}
          {overdueTasks.length > 0 && <button className="dashboard-overdue" onClick={() => navigate('/tasks')}>{overdueTasks.length} overdue {overdueTasks.length === 1 ? 'task' : 'tasks'} need attention <ArrowRight size={15} /></button>}
        </section>
      </div>
      <section className="dashboard-shortcuts"><div><span className="dashboard-kicker">QUICK ACCESS</span><h2>Where to next?</h2></div><div className="dashboard-shortcut-links"><button onClick={() => navigate('/tasks')}><ClipboardList size={18} /><span><strong>Tasks</strong><small>See your work</small></span><ArrowUpRight size={16} /></button><button onClick={() => navigate('/calendar')}><CalendarDays size={18} /><span><strong>Calendar</strong><small>Plan your time</small></span><ArrowUpRight size={16} /></button><button onClick={() => navigate('/ai')}><Sparkles size={18} /><span><strong>AI assistant</strong><small>Get study support</small></span><ArrowUpRight size={16} /></button></div></section>
    </div>
  )
}

function Stat({ label, value, icon: Icon, tone, detail }) {
  return <article className="dashboard-metric"><span className={`dashboard-metric-icon ${tone}`}><Icon size={19} /></span><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>
}
