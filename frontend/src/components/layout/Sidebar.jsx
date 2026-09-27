import { NavLink } from 'react-router-dom'
import { Bot, CalendarDays, CheckSquare, FolderKanban, LayoutDashboard, MessageSquare, ShieldCheck, Sparkles, Vote, X } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'

const links = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'My workspaces', to: '/workspaces', icon: FolderKanban },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare },
  { label: 'Calendar', to: '/calendar', icon: CalendarDays },
  { label: 'Chat', to: '/chat', icon: MessageSquare },
  { label: 'Polls', to: '/polls', icon: Vote },
  { label: 'Evaluations', to: '/evaluations', icon: Sparkles },
  { label: 'AI assistant', to: '/ai', icon: Bot },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const navigationLinks = user?.systemRole === 'ADMIN'
    ? [{ label: 'Administration', to: '/admin', icon: ShieldCheck }]
    : links
  function handleLogout() { logout(); onClose?.() }
  return <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
    <div className="sidebar-head"><div className="brand-mark">N</div><div><strong>NEXUS</strong><span>STUDY</span></div><button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button></div>
    <div className="workspace-chip"><span className="workspace-dot" /><div><small>Current workspace</small><strong>HCI · Team 04</strong></div></div>
    <nav className="sidebar-nav" aria-label="Main navigation">{navigationLinks.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
    <div className="sidebar-footer"><NavLink to="/profile" onClick={onClose} className="profile-link"><span className="profile-avatar">{user?.name?.slice(0, 2).toUpperCase() || 'MT'}</span><span><strong>{user?.name || 'Student'}</strong><small>{user?.systemRole || 'Student account'}</small></span></NavLink><button className="logout-link" onClick={handleLogout}>Log out</button></div>
  </aside>
}
