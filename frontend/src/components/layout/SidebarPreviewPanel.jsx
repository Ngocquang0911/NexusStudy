import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArrowRight,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  HelpCircle,
  Image,
  LayoutDashboard,
  Link2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Vote,
  X,
} from 'lucide-react'
import { listDeletedWorkspaces } from '../../services/workspaceService.js'
import { listTasks } from '../../services/taskService.js'
import { listDocuments } from '../../services/documentService.js'
import { listChannels } from '../../services/chatService.js'
import { listPolls } from '../../services/pollService.js'
import { listNotifications } from '../../services/notificationService.js'

export default function SidebarPreviewPanel({
  panelId,
  panelTop = 60,
  workspaces = [],
  currentWorkspace = null,
  onSelectWorkspace,
  onClose,
  onMouseEnter,
  onMouseLeave,
  user,
}) {
  const navigate = useNavigate()

  // Data states
  const [deletedSpaces, setDeletedSpaces] = useState([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [documents, setDocuments] = useState([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [channels, setChannels] = useState([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [polls, setPolls] = useState([])
  const [loadingPolls, setLoadingPolls] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  // Local interactive states (e.g. Starred filter in Files)
  const [fileFilter, setFileFilter] = useState('all') // 'all' | 'starred'
  const [starredDocIds, setStarredDocIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('nexus.starredDocuments') || '[]')
    } catch {
      return []
    }
  })

  const [taskFilter, setTaskFilter] = useState('all') // 'all' | 'pending'

  // Fetch deleted spaces
  useEffect(() => {
    if (panelId === 'deleted-spaces') {
      let active = true
      setLoadingDeleted(true)
      listDeletedWorkspaces()
        .then(({ data }) => {
          if (active) setDeletedSpaces(data.data || [])
        })
        .catch(() => {
          if (active) setDeletedSpaces([])
        })
        .finally(() => {
          if (active) setLoadingDeleted(false)
        })
      return () => { active = false }
    }
  }, [panelId])

  // Fetch tasks
  useEffect(() => {
    if ((panelId === 'tasks' || panelId === 'calendar') && currentWorkspace?._id) {
      let active = true
      setLoadingTasks(true)
      listTasks(currentWorkspace._id)
        .then(({ data }) => {
          if (active) setTasks(data.data || [])
        })
        .catch(() => {
          if (active) setTasks([])
        })
        .finally(() => {
          if (active) setLoadingTasks(false)
        })
      return () => { active = false }
    }
  }, [panelId, currentWorkspace?._id])

  // Fetch documents
  useEffect(() => {
    if (panelId === 'files' && currentWorkspace?._id) {
      let active = true
      setLoadingDocuments(true)
      listDocuments(currentWorkspace._id)
        .then(({ data }) => {
          if (active) setDocuments(data.data || [])
        })
        .catch(() => {
          if (active) setDocuments([])
        })
        .finally(() => {
          if (active) setLoadingDocuments(false)
        })
      return () => { active = false }
    }
  }, [panelId, currentWorkspace?._id])

  // Fetch channels / chats
  useEffect(() => {
    if (panelId === 'chat' && currentWorkspace?._id) {
      let active = true
      setLoadingChannels(true)
      listChannels(currentWorkspace._id)
        .then(({ data }) => {
          if (active) setChannels(data.data || [])
        })
        .catch(() => {
          if (active) setChannels([])
        })
        .finally(() => {
          if (active) setLoadingChannels(false)
        })
      return () => { active = false }
    }
  }, [panelId, currentWorkspace?._id])

  // Fetch polls
  useEffect(() => {
    if (panelId === 'polls' && currentWorkspace?._id) {
      let active = true
      setLoadingPolls(true)
      listPolls(currentWorkspace._id)
        .then(({ data }) => {
          if (active) setPolls(data.data || [])
        })
        .catch(() => {
          if (active) setPolls([])
        })
        .finally(() => {
          if (active) setLoadingPolls(false)
        })
      return () => { active = false }
    }
  }, [panelId, currentWorkspace?._id])

  // Fetch notifications for Activity preview
  useEffect(() => {
    if (panelId === 'activity') {
      let active = true
      setLoadingNotifications(true)
      listNotifications()
        .then(({ data }) => {
          if (active) setNotifications(data.data || [])
        })
        .catch(() => {
          if (active) setNotifications([])
        })
        .finally(() => {
          if (active) setLoadingNotifications(false)
        })
      return () => { active = false }
    }
  }, [panelId])

  function handleNavigate(to) {
    onClose?.()
    navigate(to)
  }

  function toggleStarDocument(e, docId) {
    e.stopPropagation()
    setStarredDocIds((prev) => {
      const next = prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
      try {
        localStorage.setItem('nexus.starredDocuments', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Format relative or compact date
  function formatFileDate(dateStr) {
    if (!dateStr) return 'Recently'
    const d = new Date(dateStr)
    const diffMs = Date.now() - d.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Format file size
  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Get file type badge label
  function getFileTypeBadge(doc) {
    if (doc.isLink) return 'LINK'
    if (doc.isTemplate) return 'TEMPLATE'
    if (doc.fileType) {
      if (doc.fileType.includes('pdf')) return 'PDF'
      if (doc.fileType.includes('image')) return 'IMG'
      if (doc.fileType.includes('word') || doc.fileType.includes('officedocument')) return 'DOCX'
      if (doc.fileType.includes('presentation')) return 'PPTX'
      if (doc.fileType.includes('sheet')) return 'XLSX'
      const subtype = doc.fileType.split('/')[1]
      if (subtype) return subtype.slice(0, 4).toUpperCase()
    }
    const ext = doc.fileName?.split('.').pop()
    if (ext && ext.length <= 4) return ext.toUpperCase()
    return 'FILE'
  }

  // Get file icon component
  function getFileIcon(doc) {
    if (doc.isLink) return <Link2 size={14} className="text-cyan-400 shrink-0" />
    if (doc.fileType?.includes('image')) return <Image size={14} className="text-emerald-400 shrink-0" />
    if (doc.fileType?.includes('pdf')) return <FileText size={14} className="text-rose-400 shrink-0" />
    return <FileText size={14} className="text-blue-400 shrink-0" />
  }

  // Header meta (icon + title)
  function getHeaderMeta() {
    switch (panelId) {
      case 'workspace':
        return { title: 'Current Workspace', icon: FolderKanban }
      case 'dashboard':
        return { title: 'Home', icon: LayoutDashboard }
      case 'workspaces':
        return { title: 'My Workspaces', icon: FolderKanban }
      case 'deleted-spaces':
        return { title: 'Deleted Spaces', icon: Archive }
      case 'tasks':
        return { title: 'To-dos', icon: CheckSquare }
      case 'files':
        return { title: 'Files', icon: FileText }
      case 'calendar':
        return { title: 'Calendar', icon: CalendarDays }
      case 'chat':
        return { title: 'DMs & Channels', icon: MessageSquare }
      case 'activity':
        return { title: 'Activity', icon: Bell }
      case 'polls':
        return { title: 'Polls', icon: Vote }
      case 'evaluations':
        return { title: 'Evaluations', icon: Sparkles }
      case 'ai':
        return { title: 'AI Assistant', icon: Bot }
      case 'admin-overview':
        return { title: 'System Overview', icon: ShieldCheck }
      case 'admin-users':
        return { title: 'User Management', icon: Users }
      case 'admin-workspaces':
        return { title: 'All Workspaces', icon: FolderKanban }
      default:
        return { title: 'NexusStudy', icon: Sparkles }
    }
  }

  const { title, icon: HeaderIcon } = getHeaderMeta()

  // Render minimal list based on hovered panel ID
  function renderContent() {
    switch (panelId) {
      case 'workspace':
        return (
          <>
            <div className="flyout-highlight-chip">
              <span className="flyout-status-dot green" />
              <div className="flyout-item-text">
                <strong>{currentWorkspace?.name || 'No workspace selected'}</strong>
                <small>{currentWorkspace?.role || 'Member'} · {currentWorkspace?.type || 'Study group'}</small>
              </div>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">Switch Workspace</div>
              {workspaces.length === 0 ? (
                <div className="flyout-empty">No workspaces available yet.</div>
              ) : (
                workspaces.slice(0, 5).map((ws) => (
                  <button
                    key={ws._id}
                    type="button"
                    className={`flyout-row ${ws._id === currentWorkspace?._id ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectWorkspace?.(ws)
                      onClose?.()
                    }}
                  >
                    <span className="flyout-row-initial">{ws.name.slice(0, 1).toUpperCase()}</span>
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{ws.name}</span>
                      <span className="flyout-row-sub">{ws.role || 'Member'}</span>
                    </div>
                    {ws._id === currentWorkspace?._id && <span className="flyout-badge-active">Active</span>}
                  </button>
                ))
              )}
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/workspaces')}>
              <span>View all workspaces</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'dashboard':
        return (
          <>
            <div className="flyout-context-tag">
              <span>{currentWorkspace ? currentWorkspace.name : 'Workspace Hub'}</span>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">Quick Navigation</div>
              <button type="button" className="flyout-row" onClick={() => handleNavigate('/dashboard')}>
                <LayoutDashboard size={15} className="text-purple-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Main Dashboard</span>
                  <span className="flyout-row-sub">Activity & progress snapshot</span>
                </div>
              </button>

              <button type="button" className="flyout-row" onClick={() => handleNavigate('/tasks')}>
                <CheckSquare size={15} className="text-blue-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Tasks & To-dos</span>
                  <span className="flyout-row-sub">Kanban workflow board</span>
                </div>
              </button>

              <button
                type="button"
                className="flyout-row"
                onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/documents` : '/documents')}
              >
                <FileText size={15} className="text-emerald-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Files & Resources</span>
                  <span className="flyout-row-sub">Workspace document storage</span>
                </div>
              </button>

              <button type="button" className="flyout-row" onClick={() => handleNavigate('/chat')}>
                <MessageSquare size={15} className="text-pink-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Team Chat</span>
                  <span className="flyout-row-sub">Real-time collaboration channels</span>
                </div>
              </button>
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/dashboard')}>
              <span>Open Home Dashboard</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'workspaces':
        return (
          <>
            <div className="flyout-list">
              <div className="flyout-list-label">Your Workspaces ({workspaces.length})</div>
              {workspaces.length === 0 ? (
                <div className="flyout-empty">No workspaces found.</div>
              ) : (
                workspaces.slice(0, 5).map((ws) => (
                  <button
                    key={ws._id}
                    type="button"
                    className={`flyout-row ${ws._id === currentWorkspace?._id ? 'selected' : ''}`}
                    onClick={() => {
                      onSelectWorkspace?.(ws)
                      onClose?.()
                    }}
                  >
                    <span className="flyout-row-initial">{ws.name.slice(0, 1).toUpperCase()}</span>
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{ws.name}</span>
                      <span className="flyout-row-sub">{ws.role} · {ws.type || 'Study group'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/workspaces')}>
              <span>Manage all workspaces</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'deleted-spaces':
        return (
          <>
            <div className="flyout-note-banner">
              <Archive size={14} className="text-amber-400 shrink-0" />
              <span>30-day retention archive before permanent purge.</span>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">Archived Spaces</div>
              {loadingDeleted ? (
                <div className="flyout-empty">Loading archive...</div>
              ) : deletedSpaces.length === 0 ? (
                <div className="flyout-empty">No workspaces currently in archive.</div>
              ) : (
                deletedSpaces.slice(0, 5).map((ws) => (
                  <button
                    key={ws._id}
                    type="button"
                    className="flyout-row"
                    onClick={() => handleNavigate('/deleted-spaces')}
                  >
                    <Archive size={14} className="text-red-400 shrink-0" />
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{ws.name}</span>
                      <span className="flyout-row-sub">
                        Deleted {ws.deletedAt ? new Date(ws.deletedAt).toLocaleDateString() : 'recently'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/deleted-spaces')}>
              <span>Open Deleted Spaces archive</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'tasks': {
        const filteredTasks = tasks.filter((t) => {
          if (taskFilter === 'pending') return t.status !== 'DONE'
          return true
        })

        return (
          <>
            {/* Header sub-bar with Starred / Filter toggle */}
            <div className="flyout-filter-bar">
              <button
                type="button"
                className={`flyout-filter-btn ${taskFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTaskFilter('all')}
              >
                All tasks
              </button>
              <button
                type="button"
                className={`flyout-filter-btn ${taskFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setTaskFilter('pending')}
              >
                Incomplete
              </button>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">
                {currentWorkspace ? currentWorkspace.name : 'Tasks'} ({filteredTasks.length})
              </div>
              {loadingTasks ? (
                <div className="flyout-empty">Loading tasks...</div>
              ) : filteredTasks.length === 0 ? (
                <div className="flyout-empty">
                  {currentWorkspace ? 'No tasks found.' : 'Select a workspace to view tasks.'}
                </div>
              ) : (
                filteredTasks.slice(0, 5).map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    className="flyout-row"
                    onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/tasks` : '/tasks')}
                  >
                    <span className={`flyout-status-pill ${t.status?.toLowerCase()}`} />
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{t.title}</span>
                      <span className="flyout-row-sub">
                        {t.status} {t.deadline ? `· Due ${new Date(t.deadline).toLocaleDateString()}` : ''}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              className="flyout-action-link"
              onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/tasks` : '/tasks')}
            >
              <span>Open Tasks Board</span>
              <ArrowRight size={13} />
            </button>
          </>
        )
      }

      case 'files': {
        // Starred vs All filter
        const displayedDocs = documents.filter((doc) => {
          if (fileFilter === 'starred') {
            return starredDocIds.includes(doc._id) || doc.isStarred || doc.starred
          }
          return true
        })

        return (
          <>
            {/* Starred filter switch */}
            <div className="flyout-filter-bar">
              <button
                type="button"
                className={`flyout-filter-btn ${fileFilter === 'all' ? 'active' : ''}`}
                onClick={() => setFileFilter('all')}
              >
                All files
              </button>
              <button
                type="button"
                className={`flyout-filter-btn ${fileFilter === 'starred' ? 'active' : ''}`}
                onClick={() => setFileFilter('starred')}
              >
                <Star
                  size={12}
                  className={fileFilter === 'starred' ? 'fill-amber-400 text-amber-400' : 'text-purple-300'}
                />
                <span>Starred</span>
              </button>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">
                {currentWorkspace ? currentWorkspace.name : 'Shared Documents'}
              </div>

              {loadingDocuments ? (
                <div className="flyout-empty">Loading files...</div>
              ) : displayedDocs.length === 0 ? (
                <div className="flyout-empty">
                  {fileFilter === 'starred'
                    ? 'No starred files yet. Click the star icon to save favorites here.'
                    : currentWorkspace
                    ? 'No files uploaded yet in this workspace.'
                    : 'Select a workspace to view files.'}
                </div>
              ) : (
                displayedDocs.slice(0, 6).map((doc) => {
                  const isStarred = starredDocIds.includes(doc._id) || doc.isStarred || doc.starred
                  const typeBadge = getFileTypeBadge(doc)
                  const sizeText = formatFileSize(doc.fileSize || doc.size)
                  const dateText = formatFileDate(doc.createdAt)

                  return (
                    <div
                      key={doc._id}
                      className="flyout-row flyout-file-row"
                      onClick={() => {
                        if (doc.isLink && doc.fileUrl) {
                          window.open(doc.fileUrl, '_blank', 'noopener,noreferrer')
                        } else {
                          handleNavigate(
                            currentWorkspace
                              ? `/workspaces/${currentWorkspace._id}/documents`
                              : '/documents'
                          )
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {getFileIcon(doc)}

                      <div className="flyout-item-text">
                        <div className="flyout-file-topline">
                          <span className="flyout-row-title" title={doc.fileName || doc.title}>
                            {doc.fileName || doc.originalName || doc.title || 'Document'}
                          </span>
                          {typeBadge && (
                            <span className={`flyout-tag-pill ${typeBadge.toLowerCase()}`}>
                              {typeBadge}
                            </span>
                          )}
                        </div>
                        <span className="flyout-row-sub">
                          {sizeText ? `${sizeText} · ` : ''}Updated {dateText}
                        </span>
                      </div>

                      {/* Star toggle button */}
                      <button
                        type="button"
                        className={`flyout-star-btn ${isStarred ? 'starred' : ''}`}
                        title={isStarred ? 'Unstar file' : 'Star file'}
                        onClick={(e) => toggleStarDocument(e, doc._id)}
                      >
                        <Star size={13} className={isStarred ? 'fill-amber-400 text-amber-400' : ''} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <button
              type="button"
              className="flyout-action-link"
              onClick={() =>
                handleNavigate(
                  currentWorkspace ? `/workspaces/${currentWorkspace._id}/documents` : '/documents'
                )
              }
            >
              <span>Open all files</span>
              <ArrowRight size={13} />
            </button>
          </>
        )
      }

      case 'calendar':
        return (
          <>
            <div className="flyout-date-badge">
              <Clock size={13} className="text-purple-400 shrink-0" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">Upcoming Deadlines</div>
              {tasks.filter((t) => t.deadline).length === 0 ? (
                <div className="flyout-empty">Your upcoming schedule is clear.</div>
              ) : (
                tasks
                  .filter((t) => t.deadline)
                  .slice(0, 5)
                  .map((t) => (
                    <button
                      key={t._id}
                      type="button"
                      className="flyout-row"
                      onClick={() => handleNavigate('/calendar')}
                    >
                      <Clock size={13} className="text-amber-400 shrink-0" />
                      <div className="flyout-item-text">
                        <span className="flyout-row-title">{t.title}</span>
                        <span className="flyout-row-sub">{new Date(t.deadline).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
              )}
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/calendar')}>
              <span>Open Calendar</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'chat':
        return (
          <>
            <div className="flyout-context-tag">
              <span>{currentWorkspace ? currentWorkspace.name : 'Team Chat'}</span>
            </div>

            <div className="flyout-list">
              <div className="flyout-list-label">Recent Channels & Conversations</div>
              {loadingChannels ? (
                <div className="flyout-empty">Loading conversations...</div>
              ) : channels.length === 0 ? (
                <div className="flyout-empty">
                  {currentWorkspace ? 'No channels created yet.' : 'Select a workspace to view chat channels.'}
                </div>
              ) : (
                channels.slice(0, 5).map((ch) => (
                  <button
                    key={ch._id}
                    type="button"
                    className="flyout-row"
                    onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/chat` : '/chat')}
                  >
                    <span className="text-purple-300 font-bold text-sm shrink-0">#</span>
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{ch.name}</span>
                      <span className="flyout-row-sub">{ch.description || 'Discussion channel'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              className="flyout-action-link"
              onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/chat` : '/chat')}
            >
              <span>Open Team Chat</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'activity':
        return (
          <>
            <div className="flyout-list">
              <div className="flyout-list-label">Recent Notifications</div>
              {loadingNotifications ? (
                <div className="flyout-empty">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="flyout-empty">No recent activity.</div>
              ) : (
                notifications.slice(0, 5).map((n) => (
                  <div key={n._id} className="flyout-row" role="button" tabIndex={0}>
                    <Bell size={14} className="text-purple-400 shrink-0" />
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{n.title || n.message}</span>
                      <span className="flyout-row-sub">{formatFileDate(n.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/dashboard')}>
              <span>View all activity</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'polls':
        return (
          <>
            <div className="flyout-list">
              <div className="flyout-list-label">Active Polls</div>
              {loadingPolls ? (
                <div className="flyout-empty">Loading polls...</div>
              ) : polls.length === 0 ? (
                <div className="flyout-empty">
                  {currentWorkspace ? 'No polls in this workspace yet.' : 'Select a workspace to view polls.'}
                </div>
              ) : (
                polls.slice(0, 4).map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    className="flyout-row"
                    onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/polls` : '/polls')}
                  >
                    <Vote size={14} className="text-indigo-400 shrink-0" />
                    <div className="flyout-item-text">
                      <span className="flyout-row-title">{p.question}</span>
                      <span className="flyout-row-sub">
                        {p.options?.length || 0} options · {p.closed ? 'Closed' : 'Active'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              className="flyout-action-link"
              onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/polls` : '/polls')}
            >
              <span>View all polls</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'evaluations':
        return (
          <>
            <div className="flyout-list">
              <div className="flyout-list-label">Peer Evaluation Actions</div>
              <button
                type="button"
                className="flyout-row"
                onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/evaluations` : '/evaluations')}
              >
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Submit Evaluation</span>
                  <span className="flyout-row-sub">Grade teammate contributions</span>
                </div>
              </button>
              <button
                type="button"
                className="flyout-row"
                onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/evaluations` : '/evaluations')}
              >
                <Sparkles size={15} className="text-purple-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Contribution Report</span>
                  <span className="flyout-row-sub">Performance analytics & scores</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              className="flyout-action-link"
              onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/evaluations` : '/evaluations')}
            >
              <span>Go to Evaluations</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'ai':
        return (
          <>
            <div className="flyout-list">
              <div className="flyout-list-label">AI Study Tools</div>
              <button
                type="button"
                className="flyout-row"
                onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/ai` : '/ai')}
              >
                <MessageSquare size={14} className="text-purple-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">AI Study Chat</span>
                  <span className="flyout-row-sub">Ask questions & explain concepts</span>
                </div>
              </button>
              <button
                type="button"
                className="flyout-row"
                onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/ai` : '/ai')}
              >
                <FileText size={14} className="text-blue-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Document Summarizer</span>
                  <span className="flyout-row-sub">Summarize notes & lecture slides</span>
                </div>
              </button>
              <button
                type="button"
                className="flyout-row"
                onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/ai` : '/ai')}
              >
                <HelpCircle size={14} className="text-emerald-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">Quiz Generator</span>
                  <span className="flyout-row-sub">Create self-assessment questions</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              className="flyout-action-link"
              onClick={() => handleNavigate(currentWorkspace ? `/workspaces/${currentWorkspace._id}/ai` : '/ai')}
            >
              <span>Launch AI Copilot</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      case 'admin-overview':
      case 'admin-users':
      case 'admin-workspaces':
        return (
          <>
            <div className="flyout-list">
              <div className="flyout-list-label">Administration Console</div>
              <button type="button" className="flyout-row" onClick={() => handleNavigate('/admin')}>
                <ShieldCheck size={14} className="text-indigo-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">System Overview</span>
                  <span className="flyout-row-sub">Platform metrics & audit logs</span>
                </div>
              </button>
              <button type="button" className="flyout-row" onClick={() => handleNavigate('/admin?section=users')}>
                <Users size={14} className="text-blue-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">User Management</span>
                  <span className="flyout-row-sub">User roles & plans</span>
                </div>
              </button>
              <button type="button" className="flyout-row" onClick={() => handleNavigate('/admin?section=workspaces')}>
                <FolderKanban size={14} className="text-purple-400 shrink-0" />
                <div className="flyout-item-text">
                  <span className="flyout-row-title">All Workspaces</span>
                  <span className="flyout-row-sub">Global workspace auditing</span>
                </div>
              </button>
            </div>

            <button type="button" className="flyout-action-link" onClick={() => handleNavigate('/admin')}>
              <span>Open Admin Console</span>
              <ArrowRight size={13} />
            </button>
          </>
        )

      default:
        return null
    }
  }

  if (!panelId) return null

  return (
    <div
      className="sidebar-preview-panel"
      style={{
        top: `${panelTop}px`,
        maxHeight: `calc(100vh - ${panelTop + 16}px)`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="region"
      aria-label={`${title} preview`}
    >
      <div className="flyout-header">
        <div className="flyout-header-title">
          <HeaderIcon size={15} className="text-purple-300 shrink-0" />
          <span>{title}</span>
        </div>
        <button
          type="button"
          className="flyout-close-btn"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flyout-body">{renderContent()}</div>
    </div>
  )
}
