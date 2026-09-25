import { Bell, Check, Clock, MessageSquare, ShieldAlert, UserPlus, Vote, X } from 'lucide-react'
import { useState } from 'react'

const MOCK_INITIAL_NOTIFICATIONS = [
  {
    id: '1',
    type: 'TASK_ASSIGNED',
    title: 'Task Assigned',
    message: 'You were assigned to "Design Wireframes & UX Mockups"',
    time: '10m ago',
    read: false,
  },
  {
    id: '2',
    type: 'TASK_DEADLINE',
    title: 'Deadline Approaching',
    message: 'Backend REST API integration due in 24 hours',
    time: '1h ago',
    read: false,
  },
  {
    id: '3',
    type: 'NEW_MESSAGE',
    title: 'New Message in # general',
    message: 'Alex posted: "Updated database schema migration ready for review"',
    time: '2h ago',
    read: false,
  },
  {
    id: '4',
    type: 'POLL_CREATED',
    title: 'New Poll Created',
    message: 'Vote on "Presentation Date Selection" in Thesis Project',
    time: '5h ago',
    read: true,
  },
  {
    id: '5',
    type: 'EVALUATION_AVAILABLE',
    title: 'Peer Evaluation Open',
    message: 'Current sprint peer evaluation period is now open',
    time: '1d ago',
    read: true,
  },
]

export default function NotificationPopover({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(MOCK_INITIAL_NOTIFICATIONS)

  if (!isOpen) return null

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleRemove = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const getIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_DEADLINE':
        return <Clock size={15} className="notif-icon task" />
      case 'NEW_MESSAGE':
        return <MessageSquare size={15} className="notif-icon chat" />
      case 'POLL_CREATED':
      case 'POLL_ENDING':
        return <Vote size={15} className="notif-icon poll" />
      case 'INVITATION':
        return <UserPlus size={15} className="notif-icon invite" />
      case 'EVALUATION_AVAILABLE':
        return <ShieldAlert size={15} className="notif-icon eval" />
      default:
        return <Bell size={15} className="notif-icon default" />
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="notification-popover-menu" onMouseLeave={onClose}>
      <div className="notif-header">
        <div>
          <strong>Notifications</strong>
          {unreadCount > 0 && <span className="notif-count-badge">{unreadCount} new</span>}
        </div>
        {unreadCount > 0 && (
          <button type="button" className="mark-read-btn" onClick={handleMarkAllRead}>
            <Check size={12} /> Mark all read
          </button>
        )}
      </div>

      <div className="notif-list">
        {notifications.length === 0 ? (
          <div className="empty-notif">
            <Bell size={24} />
            <p>No new notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
              <div className="notif-icon-col">{getIcon(n.type)}</div>
              <div className="notif-content-col">
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <small>{n.time}</small>
              </div>
              <button
                type="button"
                className="dismiss-notif-btn"
                onClick={() => handleRemove(n.id)}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
