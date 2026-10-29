import {
  Archive,
  Bell,
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Vote,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import NotificationPopover from '../common/NotificationPopover.jsx'
import BrandLogo from '../common/BrandLogo.jsx'
import useAuth from '../../hooks/useAuth.js'

const PAGE_META = {
  '/dashboard': { label: 'Dashboard', icon: LayoutDashboard },
  '/workspaces': { label: 'My Workspaces', icon: FolderKanban },
  '/tasks': { label: 'Tasks & Kanban', icon: CheckSquare },
  '/calendar': { label: 'Study Calendar', icon: CalendarDays },
  '/chat': { label: 'Group Chat', icon: MessageSquare },
  '/polls': { label: 'Polls & Decisions', icon: Vote },
  '/documents': { label: 'Shared Documents', icon: FileText },
  '/evaluations': { label: 'Evaluations', icon: Sparkles },
  '/ai': { label: 'AI Study Assistant', icon: Bot },
  '/profile': { label: 'Account Profile', icon: UserRound },
  '/admin': { label: 'Administration Console', icon: ShieldCheck },
  '/deleted-spaces': { label: 'Deleted Spaces Archive', icon: Archive },
}

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isAdmin = user?.systemRole === 'ADMIN'

  const [showNotifs, setShowNotifs] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const accountMenuRef = useRef(null)
  const quickCreateRef = useRef(null)
  const searchInputRef = useRef(null)

  // Current page breadcrumb detection
  const currentPage = useMemo(() => {
    const path = location.pathname
    // Check direct matches
    if (PAGE_META[path]) return PAGE_META[path]
    // Check nested workspace routes (e.g. /workspaces/123/tasks)
    if (path.includes('/tasks')) return PAGE_META['/tasks']
    if (path.includes('/calendar')) return PAGE_META['/calendar']
    if (path.includes('/chat')) return PAGE_META['/chat']
    if (path.includes('/polls')) return PAGE_META['/polls']
    if (path.includes('/documents')) return PAGE_META['/documents']
    if (path.includes('/evaluations')) return PAGE_META['/evaluations']
    if (path.includes('/ai')) return PAGE_META['/ai']
    if (path.startsWith('/workspaces/')) return { label: 'Workspace Overview', icon: FolderKanban }
    if (isAdmin) return { label: 'Administration', icon: ShieldCheck }
    return { label: 'Workspace', icon: LayoutDashboard }
  }, [location.pathname, isAdmin])

  // Click outside and keyboard shortcuts handler
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setShowPalette((prev) => !prev)
      } else if (event.key === 'Escape') {
        setShowAccountMenu(false)
        setShowQuickCreate(false)
        setShowPalette(false)
      }
    }

    function handleClickOutside(event) {
      if (!accountMenuRef.current?.contains(event.target)) setShowAccountMenu(false)
      if (!quickCreateRef.current?.contains(event.target)) setShowQuickCreate(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Auto focus input when command palette opens
  useEffect(() => {
    if (showPalette) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      setSearchQuery('')
    }
  }, [showPalette])

  const initials =
    user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (isAdmin ? 'AD' : 'NS')

  // User commands vs Admin commands
  const userCommands = [
    { label: 'AI Study Assistant', desc: 'Ask questions, summarize documents, create quizzes', to: '/ai', icon: Bot, tag: 'Study' },
    { label: 'Tasks & Kanban Board', desc: 'Manage assignments, sprints, and deadlines', to: '/tasks', icon: CheckSquare, tag: 'Work' },
    { label: 'Study Calendar', desc: 'Schedule group sessions & exam dates', to: '/calendar', icon: CalendarDays, tag: 'Schedule' },
    { label: 'Group Chat', desc: 'Talk with workspace members and channels', to: '/chat', icon: MessageSquare, tag: 'Chat' },
    { label: 'Polls & Voting', desc: 'Vote on meeting times and project choices', to: '/polls', icon: Vote, tag: 'Polls' },
    { label: 'Shared Documents', desc: 'Browse and download course materials', to: '/documents', icon: FileText, tag: 'Docs' },
    { label: 'Evaluations & Feedback', desc: 'Peer review and team feedback', to: '/evaluations', icon: Sparkles, tag: 'Review' },
    { label: 'Dashboard Overview', desc: 'Metrics, upcoming sessions, and tasks', to: '/dashboard', icon: LayoutDashboard, tag: 'Home' },
    { label: 'User Profile & Bio', desc: 'Manage name, username, and bio', to: '/profile', icon: UserRound, tag: 'Account' },
    { label: 'Change Password', desc: 'Security and credentials', to: '/profile?tab=PASSWORD', icon: KeyRound, tag: 'Security' },
  ]

  const adminCommands = [
    { label: 'Administration Console', desc: 'System overview, metrics, and server stats', to: '/admin', icon: ShieldCheck, tag: 'Admin' },
    { label: 'User & Role Management', desc: 'Manage system roles and upgrade subscription plans', to: '/admin', icon: Users, tag: 'Admin' },
    { label: 'Workspace Oversight', desc: 'Inspect active and soft-deleted spaces', to: '/workspaces', icon: FolderKanban, tag: 'Admin' },
    { label: 'Deleted Spaces Archive', desc: 'Manage data retention and 5-day purge schedules', to: '/deleted-spaces', icon: Archive, tag: 'Admin' },
    { label: 'Admin Account Profile', desc: 'Manage personal details and credentials', to: '/profile', icon: UserRound, tag: 'Account' },
    { label: 'Change Admin Password', desc: 'Update system security credentials', to: '/profile?tab=PASSWORD', icon: KeyRound, tag: 'Security' },
  ]

  const commandItems = isAdmin ? adminCommands : userCommands

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commandItems
    const q = searchQuery.toLowerCase()
    return commandItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)
    )
  }, [searchQuery, commandItems])

  function handleCommandSelect(to) {
    setShowPalette(false)
    navigate(to)
  }

  const PageIcon = currentPage.icon

  return (
    <>
      <header className={`topbar ${isAdmin ? 'topbar-admin' : ''}`}>
        {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
        <div className="topbar-left">
          <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation">
            <Menu size={20} />
          </button>

          <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
            <Link
              to={isAdmin ? '/admin' : '/dashboard'}
              className="breadcrumb-root"
              title={isAdmin ? 'Go to Administration Console' : 'Go to Dashboard'}
            >
              <BrandLogo markOnly className="topbar-brand-image" />
              <span className="brand-title">
                NEXUS<span className="brand-title-light">{isAdmin ? 'ADMIN' : 'STUDY'}</span>
              </span>
              {isAdmin && (
                <span className="topbar-admin-badge">
                  <ShieldCheck size={11} />
                  <span>CONSOLE</span>
                </span>
              )}
            </Link>

            <ChevronRight size={14} className="breadcrumb-sep" />

            <div className="breadcrumb-current">
              <PageIcon size={15} className="breadcrumb-current-icon" />
              <span>{currentPage.label}</span>
            </div>
          </nav>
        </div>

        {/* Center: Command Palette / Search Trigger */}
        <div className="topbar-center">
          <button
            type="button"
            className={`topbar-search-trigger ${isAdmin ? 'admin-search-trigger' : ''}`}
            onClick={() => setShowPalette(true)}
            aria-label="Search"
          >
            <Search size={15} className="search-trigger-icon" />
            <span className="search-trigger-text">
              {isAdmin ? 'Search users, roles, workspaces...' : 'Search tasks, pages, tools...'}
            </span>
            <span className="search-trigger-kbd">
              <kbd>Ctrl</kbd>
              <kbd>K</kbd>
            </span>
          </button>
        </div>

        {/* Right: Quick Actions, Live Status, Notifications, Account Menu */}
        <div className="topbar-actions">
          {/* Quick Action Button: Distinct for Admin vs User */}
          <div className="topbar-quick-create" ref={quickCreateRef}>
            <button
              type="button"
              className={`quick-create-btn ${isAdmin ? 'admin-quick-btn' : ''}`}
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              aria-label={isAdmin ? 'Admin quick actions' : 'Create new item'}
              aria-expanded={showQuickCreate}
            >
              {isAdmin ? <ShieldCheck size={15} /> : <Plus size={15} />}
              <span>{isAdmin ? 'Admin' : 'Create'}</span>
              <ChevronDown size={13} className={`create-chevron ${showQuickCreate ? 'rotate' : ''}`} />
            </button>

            {showQuickCreate && (
              <div className="quick-create-dropdown" role="menu">
                {isAdmin ? (
                  <>
                    <div className="dropdown-section-title">ADMINISTRATIVE ACTIONS</div>
                    <Link to="/admin" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <ShieldCheck size={15} className="action-icon purple" />
                      <div>
                        <strong>System Overview</strong>
                        <small>Monitor stats & performance</small>
                      </div>
                    </Link>
                    <Link to="/admin" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <Users size={15} className="action-icon blue" />
                      <div>
                        <strong>Manage Users</strong>
                        <small>Change roles & grant plans</small>
                      </div>
                    </Link>
                    <Link to="/deleted-spaces" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <Archive size={15} className="action-icon orange" />
                      <div>
                        <strong>Deleted Spaces</strong>
                        <small>Retention & purge schedules</small>
                      </div>
                    </Link>
                    <Link to="/workspaces" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <FolderKanban size={15} className="action-icon green" />
                      <div>
                        <strong>Inspect Workspaces</strong>
                        <small>Browse student study spaces</small>
                      </div>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="dropdown-section-title">QUICK ACTIONS</div>
                    <Link to="/tasks" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <CheckSquare size={15} className="action-icon purple" />
                      <div>
                        <strong>New Task</strong>
                        <small>Add task to Kanban board</small>
                      </div>
                    </Link>
                    <Link to="/calendar" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <CalendarDays size={15} className="action-icon blue" />
                      <div>
                        <strong>Study Session</strong>
                        <small>Schedule group meeting</small>
                      </div>
                    </Link>
                    <Link to="/ai" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <Bot size={15} className="action-icon orange" />
                      <div>
                        <strong>Ask AI Copilot</strong>
                        <small>Generate quiz or summary</small>
                      </div>
                    </Link>
                    <Link to="/polls" role="menuitem" onClick={() => setShowQuickCreate(false)}>
                      <Vote size={15} className="action-icon green" />
                      <div>
                        <strong>Create Poll</strong>
                        <small>Gather team consensus</small>
                      </div>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Real-time Live Status Chip */}
          <div
            className={`topbar-status-chip ${isAdmin ? 'admin-status-chip' : ''}`}
            title={isAdmin ? 'System active with administrative privileges' : 'Real-time WebSocket sync connected'}
          >
            <span className={`status-dot-pulse ${isAdmin ? 'admin-pulse' : ''}`} />
            <span className="status-text">{isAdmin ? 'System Active' : 'Live'}</span>
          </div>

          {/* Notifications */}
          <div className="topbar-notif-wrapper" style={{ position: 'relative' }}>
            <button
              className="topbar-icon notification"
              aria-label="Notifications"
              onClick={() => setShowNotifs(!showNotifs)}
            >
              <Bell size={18} />
              <i />
            </button>
            <NotificationPopover isOpen={showNotifs} onClose={() => setShowNotifs(false)} />
          </div>

          {/* User Account Trigger & Menu */}
          <div className="topbar-account" ref={accountMenuRef}>
            <button
              type="button"
              className="topbar-avatar-button"
              aria-label="Open account menu"
              aria-expanded={showAccountMenu}
              aria-haspopup="menu"
              onClick={() => setShowAccountMenu((value) => !value)}
            >
              <div className="avatar-wrapper">
                {user?.avatar ? (
                  <img className="topbar-avatar" src={user.avatar} alt="" />
                ) : (
                  <span className={`topbar-avatar ${isAdmin ? 'admin-avatar' : ''}`}>{initials}</span>
                )}
                <span className={`avatar-status-badge ${isAdmin ? 'admin-badge-dot' : ''}`} />
              </div>
              <ChevronDown size={14} className="user-chevron" />
            </button>

            {showAccountMenu && (
              <div className="account-menu" role="menu">
                <div className="account-menu-user">
                  {user?.avatar ? (
                    <img className="account-menu-avatar" src={user.avatar} alt="" />
                  ) : (
                    <span className={`account-menu-avatar ${isAdmin ? 'admin-avatar' : ''}`}>{initials}</span>
                  )}
                  <div className="account-user-info">
                    <strong>{user?.name || (isAdmin ? 'Administrator' : 'Student')}</strong>
                    {user?.username && <small className="account-username">@{user.username}</small>}
                    <small>{user?.email || 'Account'}</small>
                    <span className={`account-role-badge ${isAdmin ? 'role-badge-admin' : ''}`}>
                      {user?.systemRole || 'STUDENT'}
                    </span>
                  </div>
                </div>

                <div className="account-menu-divider" />

                {isAdmin && (
                  <Link to="/admin" role="menuitem" onClick={() => setShowAccountMenu(false)}>
                    <ShieldCheck size={16} /> Administration console
                  </Link>
                )}

                <Link to="/profile" role="menuitem" onClick={() => setShowAccountMenu(false)}>
                  <UserRound size={16} /> Personal information
                </Link>
                <Link to="/profile?tab=PASSWORD" role="menuitem" onClick={() => setShowAccountMenu(false)}>
                  <KeyRound size={16} /> Change password
                </Link>

                <div className="account-menu-divider" />

                <button type="button" role="menuitem" onClick={logout} className="logout-button">
                  <LogOut size={16} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette Modal (Ctrl + K) */}
      {showPalette && (
        <div className="command-palette-backdrop" onClick={() => setShowPalette(false)}>
          <div className="command-palette-modal" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-header">
              <Search size={18} className="palette-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="palette-search-input"
                placeholder={isAdmin ? 'Type an admin command or search...' : 'Type a command or jump to a tool...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="palette-close-btn"
                onClick={() => setShowPalette(false)}
                aria-label="Close command palette"
              >
                <X size={16} />
              </button>
            </div>

            <div className="command-palette-body">
              {filteredCommands.length > 0 ? (
                <div className="command-list">
                  <div className="command-group-label">{isAdmin ? 'ADMINISTRATIVE TOOLS' : 'NAVIGATION & TOOLS'}</div>
                  {filteredCommands.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label + item.to}
                        type="button"
                        className="command-item"
                        onClick={() => handleCommandSelect(item.to)}
                      >
                        <span className={`command-item-icon ${isAdmin ? 'admin-icon-bg' : ''}`}>
                          <Icon size={16} />
                        </span>
                        <div className="command-item-content">
                          <strong>{item.label}</strong>
                          <small>{item.desc}</small>
                        </div>
                        <span className={`command-item-tag ${isAdmin ? 'admin-tag' : ''}`}>{item.tag}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="command-empty">
                  <p>No tools or commands found matching "{searchQuery}"</p>
                </div>
              )}
            </div>

            <div className="command-palette-footer">
              <span>Press <kbd>Esc</kbd> to close</span>
              <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
              <span><kbd>↵</kbd> to select</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
