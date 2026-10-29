import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  Bot,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Vote,
  X,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { listWorkspaces } from '../../services/workspaceService.js'
import SidebarPreviewPanel from './SidebarPreviewPanel.jsx'

const SELECTED_WORKSPACE_KEY = 'nexus.selectedWorkspaceId'

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = user?.systemRole === 'ADMIN'

  // Workspaces state for rail workspace tile & preview flyout
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem(SELECTED_WORKSPACE_KEY) || ''
  )

  // Hover flyout panel state, Y position, and debounce timer
  const [activeFlyout, setActiveFlyout] = useState(null)
  const [panelTop, setPanelTop] = useState(60)
  const flyoutTimerRef = useRef(null)

  const routeWorkspaceId = location.pathname.match(/^\/workspaces\/([^/]+)/)?.[1]

  useEffect(() => {
    let active = true
    listWorkspaces()
      .then(({ data }) => {
        if (active) setWorkspaces(data.data || [])
      })
      .catch(() => {
        if (active) setWorkspaces([])
      })
    return () => {
      active = false
    }
  }, [location.pathname])

  const currentWorkspace = useMemo(() => {
    const preferredId = routeWorkspaceId || selectedWorkspaceId
    return workspaces.find((w) => w._id === preferredId) || workspaces[0] || null
  }, [routeWorkspaceId, selectedWorkspaceId, workspaces])

  useEffect(() => {
    if (currentWorkspace?._id) {
      setSelectedWorkspaceId(currentWorkspace._id)
      localStorage.setItem(SELECTED_WORKSPACE_KEY, currentWorkspace._id)
    }
  }, [currentWorkspace])

  function selectWorkspace(workspace) {
    setSelectedWorkspaceId(workspace._id)
    localStorage.setItem(SELECTED_WORKSPACE_KEY, workspace._id)
    setActiveFlyout(null)
    if (location.pathname !== `/workspaces/${workspace._id}`) {
      navigate(`/workspaces/${workspace._id}`)
    }
  }

  // Hover handlers with debounce & dynamic anchor positioning
  function handleFlyoutOpen(panelId, event) {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current)
      flyoutTimerRef.current = null
    }
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect()
      // Dynamic positioning anchored to hovered icon, smoothly clamped to viewport
      const calculatedTop = Math.max(16, Math.min(rect.top - 10, Math.max(16, window.innerHeight - 380)))
      setPanelTop(calculatedTop)
    }
    setActiveFlyout(panelId)
  }

  function handleFlyoutClose() {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current)
    }
    flyoutTimerRef.current = setTimeout(() => {
      setActiveFlyout(null)
    }, 180) // 180ms debounce window matching 150-200ms requirement
  }

  function handleFlyoutCancelClose() {
    if (flyoutTimerRef.current) {
      clearTimeout(flyoutTimerRef.current)
      flyoutTimerRef.current = null
    }
  }

  function handleLogout() {
    logout()
    onClose?.()
  }

  // User initials for avatar
  const userInitials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'U'

  // Admin query param tracker
  const activeAdminSection = new URLSearchParams(location.search).get('section') || 'overview'

  // Regular user nav items
  const userGeneralLinks = [
    { id: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { id: 'workspaces', label: 'My workspaces', to: '/workspaces', icon: FolderKanban },
    { id: 'deleted-spaces', label: 'Deleted Spaces', to: '/deleted-spaces', icon: Archive },
  ]

  const userStudyTools = [
    { id: 'tasks', label: 'Tasks', to: '/tasks', icon: CheckSquare },
    { id: 'files', label: 'Files', to: '/documents', icon: FileText },
    { id: 'calendar', label: 'Calendar', to: '/calendar', icon: CalendarDays },
    { id: 'chat', label: 'Chat', to: '/chat', icon: MessageSquare },
    { id: 'polls', label: 'Polls', to: '/polls', icon: Vote },
    { id: 'evaluations', label: 'Evaluations', to: '/evaluations', icon: Sparkles },
    { id: 'ai', label: 'AI assistant', to: '/ai', icon: Bot },
  ]

  // Admin nav items
  const adminLinks = [
    { id: 'admin-overview', label: 'System Overview', slug: 'overview', to: '/admin', icon: ShieldCheck },
    { id: 'admin-users', label: 'User Management', slug: 'users', to: '/admin?section=users', icon: Users },
    { id: 'admin-workspaces', label: 'All Workspaces', slug: 'workspaces', to: '/admin?section=workspaces', icon: FolderKanban },
    { id: 'deleted-spaces', label: 'Deleted Spaces Archive', slug: 'deleted-spaces', to: '/deleted-spaces', icon: Archive },
  ]

  const currentWorkspaceInitial = currentWorkspace?.name
    ? currentWorkspace.name.trim().slice(0, 1).toUpperCase()
    : 'N'

  return (
    <aside
      className={`app-sidebar ${isAdmin ? 'admin-sidebar' : ''} ${open ? 'is-open' : ''}`}
      aria-label="Application Sidebar"
    >
      {/* 1. Collapsed 68px Icon Rail */}
      <div className="sidebar-rail">
        {/* Top: Current Workspace / Console tile */}
        <div className="rail-top">
          {isAdmin ? (
            <button
              type="button"
              className="rail-workspace-tile admin-tile"
              aria-label="System Administration Console"
              title="System Administration Console"
              onMouseEnter={(e) => handleFlyoutOpen('admin-overview', e)}
              onMouseLeave={handleFlyoutClose}
              onClick={() => {
                setActiveFlyout(null)
                onClose?.()
                navigate('/admin')
              }}
            >
              <ShieldCheck size={20} className="text-white" />
            </button>
          ) : (
            <button
              type="button"
              className="rail-workspace-tile"
              aria-label="Current workspace"
              title={`Workspace: ${currentWorkspace?.name || 'No workspace yet'}`}
              onMouseEnter={(e) => handleFlyoutOpen('workspace', e)}
              onMouseLeave={handleFlyoutClose}
              onClick={() => {
                setActiveFlyout(null)
                onClose?.()
                if (currentWorkspace?._id) {
                  navigate(`/workspaces/${currentWorkspace._id}`)
                } else {
                  navigate('/workspaces')
                }
              }}
            >
              <span className="rail-workspace-initial">{currentWorkspaceInitial}</span>
              <span className="rail-workspace-dot" />
            </button>
          )}

          {open && (
            <button
              type="button"
              className="rail-close-btn"
              onClick={onClose}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Center: Scrollable Icon Navigation */}
        <nav className="rail-nav" aria-label="Main navigation">
          {isAdmin ? (
            adminLinks.map(({ id, label, slug, to, icon: Icon }) => {
              const isActive =
                (to === '/admin' && location.pathname === '/admin' && activeAdminSection === slug) ||
                (to.includes('section=') && location.pathname === '/admin' && activeAdminSection === slug) ||
                (to === '/deleted-spaces' && location.pathname === '/deleted-spaces')

              return (
                <NavLink
                  key={slug}
                  to={to}
                  className={`rail-link ${isActive ? 'active' : ''}`}
                  aria-label={label}
                  title={label}
                  onMouseEnter={(e) => handleFlyoutOpen(id, e)}
                  onMouseLeave={handleFlyoutClose}
                  onClick={() => {
                    setActiveFlyout(null)
                    onClose?.()
                  }}
                >
                  {isActive && <span className="rail-active-indicator" />}
                  <Icon size={19} className="rail-icon" />
                  <span className="sr-only">{label}</span>
                </NavLink>
              )
            })
          ) : (
            <>
              {/* General Group */}
              {userGeneralLinks.map(({ id, label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
                  aria-label={label}
                  title={label}
                  onMouseEnter={(e) => handleFlyoutOpen(id, e)}
                  onMouseLeave={handleFlyoutClose}
                  onClick={() => {
                    setActiveFlyout(null)
                    onClose?.()
                  }}
                >
                  <Icon size={19} className="rail-icon" />
                  <span className="sr-only">{label}</span>
                </NavLink>
              ))}

              <div className="rail-divider" />

              {/* Study Tools Group */}
              {userStudyTools.map(({ id, label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
                  aria-label={label}
                  title={label}
                  onMouseEnter={(e) => handleFlyoutOpen(id, e)}
                  onMouseLeave={handleFlyoutClose}
                  onClick={() => {
                    setActiveFlyout(null)
                    onClose?.()
                  }}
                >
                  <Icon size={19} className="rail-icon" />
                  <span className="sr-only">{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Bottom: Profile Avatar & Logout */}
        <div className="rail-bottom">
          <NavLink
            to="/profile"
            className="rail-user-avatar"
            title={`View profile (${user?.name || 'User'})`}
            aria-label="View Profile"
            onClick={() => {
              setActiveFlyout(null)
              onClose?.()
            }}
          >
            <span className={`rail-avatar-box ${isAdmin ? 'admin-avatar' : ''}`}>
              {userInitials}
            </span>
            <span className="rail-avatar-dot" />
          </NavLink>

          <button
            type="button"
            className="rail-logout-btn"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* 2. Flyout Preview Panel on Hover */}
      <SidebarPreviewPanel
        panelId={activeFlyout}
        panelTop={panelTop}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={selectWorkspace}
        onClose={() => setActiveFlyout(null)}
        onMouseEnter={handleFlyoutCancelClose}
        onMouseLeave={handleFlyoutClose}
        user={user}
      />
    </aside>
  )
}
