import { Archive, Bell, Check, Clock, MessageSquare, ShieldAlert, UserPlus, Vote, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService.js'
import { acceptInvitation, declineInvitation } from '../../services/workspaceService.js'

function relativeTime(value) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (elapsedMinutes < 1) return 'Just now'
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h ago`
  return `${Math.floor(elapsedHours / 24)}d ago`
}

export default function NotificationPopover({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setLoading(true)
    setError('')
    listNotifications()
      .then(({ data }) => { if (active) setNotifications(data.data || []) })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load notifications.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isOpen])

  if (!isOpen) return null

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((current) => current.map((notification) => ({ ...notification, readAt: new Date().toISOString() })))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update notifications.')
    }
  }

  async function handleMarkRead(notification) {
    if (notification.readAt) return
    try {
      const { data } = await markNotificationRead(notification._id)
      setNotifications((current) => current.map((item) => item._id === notification._id ? data.data : item))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update notification.')
    }
  }

  async function handleDismiss(notificationId) {
    try {
      await dismissNotification(notificationId)
      setNotifications((current) => current.filter((notification) => notification._id !== notificationId))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to dismiss notification.')
    }
  }

  async function respondToInvitation(notification, action) {
    try {
      if (action === 'accept') await acceptInvitation(notification.invitationId)
      else await declineInvitation(notification.invitationId)
      const status = action === 'accept' ? 'ACCEPTED' : 'DECLINED'
      setNotifications((current) => current.map((item) => (
        item._id === notification._id
          ? { ...item, invitationStatus: status, readAt: item.readAt || new Date().toISOString() }
          : item
      )))
      if (action === 'accept') {
        navigate('/workspaces')
        onClose()
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${action} invitation.`)
    }
  }

  async function openNotification(notification) {
    await handleMarkRead(notification)
    if (notification.type === 'WORKSPACE_DELETED') {
      navigate('/deleted-spaces')
      onClose()
      return
    }
    if (notification.workspaceId && notification.taskId) {
      navigate(`/workspaces/${notification.workspaceId}/tasks?taskId=${notification.taskId}`)
      onClose()
    }
  }

  function getIcon(type) {
    switch (type) {
      case 'TASK_ASSIGNED':
      case 'TASK_DEADLINE':
        return <Clock size={15} className="notif-icon task" />
      case 'NEW_MESSAGE':
      case 'TASK_FEEDBACK':
        return <MessageSquare size={15} className="notif-icon chat" />
      case 'POLL_CREATED':
      case 'POLL_ENDING':
        return <Vote size={15} className="notif-icon poll" />
      case 'INVITATION':
        return <UserPlus size={15} className="notif-icon invite" />
      case 'WORKSPACE_DELETED':
        return <Archive size={15} className="notif-icon default" />
      case 'EVALUATION_AVAILABLE':
        return <ShieldAlert size={15} className="notif-icon eval" />
      default:
        return <Bell size={15} className="notif-icon default" />
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length

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

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="notif-list">
        {loading ? (
          <div className="empty-notif"><p>Loading notifications...</p></div>
        ) : notifications.length === 0 ? (
          <div className="empty-notif"><Bell size={24} /><p>No notifications</p></div>
        ) : notifications.map((notification) => (
          <div
            key={notification._id}
            className={`notif-item ${!notification.readAt ? 'unread' : ''}`}
            role={notification.type === 'WORKSPACE_DELETED' || (notification.workspaceId && notification.taskId) ? 'button' : undefined}
            tabIndex={notification.type === 'WORKSPACE_DELETED' || (notification.workspaceId && notification.taskId) ? 0 : undefined}
            onClick={() => openNotification(notification)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                openNotification(notification)
              }
            }}
          >
            <div className="notif-icon-col">{getIcon(notification.type)}</div>
            <div className="notif-content-col">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <small>{relativeTime(notification.createdAt)}</small>
              {notification.type === 'INVITATION' && notification.invitationId && notification.invitationStatus === 'PENDING' && (
                <span className="invitation-actions">
                  <button type="button" className="primary-action" onClick={(event) => { event.stopPropagation(); respondToInvitation(notification, 'accept') }}>
                    <Check size={12} /> Accept
                  </button>
                  <button type="button" className="secondary-action" onClick={(event) => { event.stopPropagation(); respondToInvitation(notification, 'decline') }}>
                    <X size={12} /> Decline
                  </button>
                </span>
              )}
              {notification.invitationStatus && notification.invitationStatus !== 'PENDING' && (
                <small>Invitation {notification.invitationStatus.toLowerCase()}</small>
              )}
            </div>
            <button
              type="button"
              className="dismiss-notif-btn"
              onClick={(event) => { event.stopPropagation(); handleDismiss(notification._id) }}
              title="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
