import { Bell, Menu, Search } from 'lucide-react'
import { useState } from 'react'
import NotificationPopover from '../common/NotificationPopover.jsx'
import useAuth from '../../hooks/useAuth.js'

export default function Topbar({ onMenu }) {
  const { user } = useAuth()
  const [showNotifs, setShowNotifs] = useState(false)

  const initials =
    user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NS'

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation">
        <Menu size={20} />
      </button>

      <div className="topbar-context">
        <span>Workspace</span>
        <b>/</b>
        <strong>NEXUS STUDY</strong>
      </div>

      <div className="topbar-actions">
        <button className="topbar-icon" aria-label="Search">
          <Search size={18} />
        </button>

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

        <span className="topbar-avatar">{initials}</span>
      </div>
    </header>
  )
}
