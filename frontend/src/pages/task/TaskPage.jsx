import { ArrowLeft, CheckCircle2, ListTodo, LoaderCircle, Plus, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import KanbanBoard from '../../components/task/KanbanBoard.jsx'
import TaskFilters from '../../components/task/TaskFilters.jsx'
import TaskModal from '../../components/task/TaskModal.jsx'
import useAuth from '../../hooks/useAuth.js'
import {
  createTask,
  deleteTask,
  addTaskFeedback,
  listTasks,
  updateTask,
  updateTaskReminders,
  updateTaskStatus,
} from '../../services/taskService.js'
import { getWorkspace, getWorkspaceMembers, listWorkspaces } from '../../services/workspaceService.js'
import { getTaskBoardStatus, isTaskDueSoon } from '../../utils/taskStatus.js'

export default function TaskPage() {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = params.workspaceId
  const navigate = useNavigate()
  const { user } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceId || '')
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('TODO')
  const [now, setNow] = useState(() => new Date())

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL',
    priority: 'ALL',
    assignee: 'ALL',
    preset: 'ALL',
  })

  // Load user workspaces list if standalone /tasks route
  useEffect(() => {
    if (!workspaceId) {
      listWorkspaces()
        .then(({ data }) => {
          const wsList = data.data || []
          setWorkspaces(wsList)
          if (wsList.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(wsList[0]._id)
          }
        })
        .catch(() => {})
    } else {
      setSelectedWorkspaceId(workspaceId)
    }
  }, [workspaceId])

  const activeWsId = workspaceId || selectedWorkspaceId

  // Load tasks & workspace details for active workspace
  const loadWorkspaceData = useCallback(async () => {
    if (!activeWsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [taskRes, memberRes, wsRes] = await Promise.all([
        listTasks(activeWsId),
        getWorkspaceMembers(activeWsId).catch(() => ({ data: { data: [] } })),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
      ])

      setTasks(taskRes.data.data || [])
      setMembers(memberRes.data.data || [])
      setWorkspace(wsRes.data.data || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load task board')
    } finally {
      setLoading(false)
    }
  }, [activeWsId])

  useEffect(() => {
    loadWorkspaceData()
  }, [loadWorkspaceData])

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (!taskId || !tasks.length) return
    const targetTask = tasks.find((task) => task._id === taskId)
    if (!targetTask) return
    setEditingTask(targetTask)
    setIsModalOpen(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('taskId')
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams, tasks])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const currentMember = members.find((m) => (m.userId?._id || m.userId) === user?._id)
  const userRole = currentMember?.role || 'MEMBER'
  const isLeader = ['OWNER', 'LEADER'].includes(userRole)
  const editingCreatorId = typeof editingTask?.createdBy === 'object'
    ? editingTask.createdBy?._id
    : editingTask?.createdBy
  const canManageReminders = isLeader || !editingTask || editingCreatorId === user?._id

  // Handle task modal actions
  const handleOpenCreateModal = (status = 'TODO') => {
    setEditingTask(null)
    setDefaultStatus(status)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleSaveTask = async (formPayload) => {
    setModalLoading(true)
    try {
      const { reminders, ...taskPayload } = formPayload
      let taskId
      if (editingTask) {
        await updateTask(editingTask._id, taskPayload)
        taskId = editingTask._id
      } else {
        const { data } = await createTask({ ...taskPayload, workspaceId: activeWsId })
        taskId = data.data._id
      }
      if (canManageReminders && user?.subscriptionPlan === 'PREMIUM' && taskPayload.deadline) {
        await updateTaskReminders(taskId, reminders)
      }
      await loadWorkspaceData()
      setIsModalOpen(false)
    } catch (error) {
      await loadWorkspaceData()
      throw error
    } finally {
      setModalLoading(false)
    }
  }

  const handleAddFeedback = async (taskId, payload) => {
    const { data } = await addTaskFeedback(taskId, payload)
    setEditingTask((current) => current?._id === taskId
      ? {
          ...current,
          feedback: [...(current.feedback || []), data.data.feedback],
          history: [...(current.history || []), data.data.activity],
        }
      : current)
    await loadWorkspaceData()
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(taskId)
      setTasks((prev) => prev.filter((t) => t._id !== taskId))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task')
    }
  }

  const handleStatusChange = async (taskId, newStatus, newProgress) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId
          ? {
              ...t,
              status: newStatus,
              progress:
                newProgress !== undefined
                  ? newProgress
                  : newStatus === 'DONE'
                  ? 100
                  : newStatus === 'TODO'
                  ? 0
                  : t.progress,
            }
          : t
      )
    )

    try {
      await updateTaskStatus(taskId, newStatus, newProgress)
    } catch (err) {
      // Revert if error
      loadWorkspaceData()
    }
  }

  // Filter tasks client-side
  const filteredTasks = tasks.filter((task) => {
    // Search by title
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    // Status filter
    if (filters.status !== 'ALL' && getTaskBoardStatus(task, now) !== filters.status) {
      return false
    }
    // Priority filter
    if (filters.priority !== 'ALL' && task.priority !== filters.priority) {
      return false
    }
    // Assignee filter
    if (filters.assignee === 'UNASSIGNED') {
      if (task.assignedTo && task.assignedTo.length > 0) return false
    } else if (filters.assignee !== 'ALL') {
      const isAssigned = task.assignedTo?.some((u) => (u._id || u) === filters.assignee)
      if (!isAssigned) return false
    }
    // Preset filters
    if (filters.preset === 'DUE_SOON') {
      if (!isTaskDueSoon(task, now)) return false
    }

    return true
  })

  // Calculate statistics
  const totalTasksCount = tasks.length
  const activeTasks = tasks.filter((task) => task.status !== 'CANCELLED')
  const completedTasksCount = tasks.filter((t) => t.status === 'DONE').length
  const inProgressTasksCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length
  const overallProgress = activeTasks.length
    ? Math.round((completedTasksCount / activeTasks.length) * 100)
    : 0

  return (
    <div className="task-page-container">
      {/* Workspace Header & Tabs if inside workspace context */}
      {workspaceId && workspace ? (
        <div className="workspace-detail-header-block">
          <Link className="back-link" to="/workspaces">
            <ArrowLeft size={16} /> All workspaces
          </Link>
          <section className="workspace-hero">
            <div className="workspace-hero-icon">{workspace.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <span className="eyebrow">{workspace.type}</span>
              <h1>{workspace.name}</h1>
              <p>{workspace.description || 'A focused space for your group to collaborate.'}</p>
            </div>
          </section>

          <nav className="workspace-tabs">
            <Link to={`/workspaces/${workspaceId}`}>Overview</Link>
            <Link className="active" to={`/workspaces/${workspaceId}/tasks`}>
              Tasks
            </Link>
            <Link to={`/workspaces/${workspaceId}/chat`}>Chat</Link>
            <Link to={`/workspaces/${workspaceId}/polls`}>Polls</Link>
            <Link to={`/workspaces/${workspaceId}/documents`}>Documents</Link>
            <Link to={`/workspaces/${workspaceId}/evaluations`}>Evaluation</Link>
            <Link to={`/workspaces/${workspaceId}/ai`}>AI assistant</Link>
          </nav>
        </div>
      ) : (
        <div className="page-title-row">
          <div>
            <span className="eyebrow">TASK MANAGEMENT</span>
            <h1>Kanban Task Board</h1>
            <p>Organize, track, and complete group tasks efficiently.</p>
          </div>

          <div className="page-actions-right">
            {workspaces.length > 0 && (
              <div className="workspace-select-wrapper">
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="workspace-picker-select"
                >
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      Workspace: {ws.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              className="primary-action"
              onClick={() => handleOpenCreateModal('TODO')}
              disabled={!activeWsId}
            >
              <Plus size={16} /> New Task
            </button>
          </div>
        </div>
      )}

      {/* Action bar for workspace view */}
      {workspaceId && (
        <div className="task-page-sub-header">
          <div className="section-title">
            <h2>Tasks & Roadmap</h2>
            <p>Drag and drop cards across columns to update task status.</p>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => handleOpenCreateModal('TODO')}
          >
            <Plus size={16} /> New Task
          </button>
        </div>
      )}

      {/* Stats Summary Card */}
      <div className="task-stats-summary-card">
        <div className="stat-pill">
          <span className="stat-num">{totalTasksCount}</span>
          <span className="stat-label">Total Tasks</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-blue">{inProgressTasksCount}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-green">{completedTasksCount}</span>
          <span className="stat-label">Finished</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-progress-pill">
          <div className="stat-progress-top">
            <span className="stat-label">Workspace Completion</span>
            <span className="stat-percent">{overallProgress}%</span>
          </div>
          <div className="stat-progress-bar-bg">
            <div className="stat-progress-bar-fill" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <TaskFilters
        filters={filters}
        setFilters={setFilters}
        members={members}
        currentUserId={user?._id}
      />

      {/* Main Board Content */}
      {loading ? (
        <div className="route-loading" style={{ minHeight: '300px' }}>
          <LoaderCircle className="spin" size={24} /> Loading tasks...
        </div>
      ) : error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : !activeWsId ? (
        <div className="workspace-empty surface-card">
          <ListTodo size={40} />
          <h2>No workspace selected</h2>
          <p>Please select or create a workspace to start managing tasks.</p>
        </div>
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          onEditTask={handleOpenEditModal}
          onDeleteTask={handleDeleteTask}
          onStatusChange={handleStatusChange}
          onQuickAdd={handleOpenCreateModal}
          currentUserId={user?._id}
          userRole={userRole}
          now={now}
        />
      )}

      {/* Create / Edit Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveTask}
        initialData={
          editingTask || {
            status: defaultStatus,
          }
        }
        workspaceMembers={members}
        isLeader={isLeader}
        canManageReminders={canManageReminders}
        isPremium={user?.subscriptionPlan === 'PREMIUM'}
        loading={modalLoading}
        currentUserId={user?._id}
        onAddFeedback={handleAddFeedback}
      />
    </div>
  )
}
