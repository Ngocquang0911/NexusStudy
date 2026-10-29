import { Calendar, Clock, MoreVertical, Pencil, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '../../utils/formatDate.js'
import { TASK_STATUSES } from '../../utils/constants.js'
import { getTaskBoardStatus, isTaskDueSoon, TASK_STATUS_LABELS } from '../../utils/taskStatus.js'

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, currentUserId, userRole, now }) {
  const [showMenu, setShowMenu] = useState(false)

  const isLeader = ['OWNER', 'LEADER'].includes(userRole)
  const isAssignee = task.assignedTo?.some((user) => (user._id || user) === currentUserId)
  const canEdit = isLeader || isAssignee
  const canDelete = isLeader

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'LOW':
        return <span className="priority-tag low">LOW</span>
      case 'MEDIUM':
        return <span className="priority-tag medium">MEDIUM</span>
      case 'HIGH':
        return <span className="priority-tag high">HIGH</span>
      case 'URGENT':
        return <span className="priority-tag urgent">URGENT</span>
      default:
        return <span className="priority-tag low">{priority}</span>
    }

  }

  const boardStatus = getTaskBoardStatus(task, now)
  const isOverdue = boardStatus === 'OVERDUE'
  const isDueSoon = isTaskDueSoon(task, now)

  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task._id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className={`task-card ${boardStatus.toLowerCase()}`}
      draggable
      onDragStart={handleDragStart}
    >
      <div className="task-card-header">
        <div className="task-badges">
          {getPriorityBadge(task.priority)}
          <span className={`status-badge ${boardStatus.toLowerCase()}`}>
            {TASK_STATUS_LABELS[boardStatus] || boardStatus}
          </span>
        </div>
        <div className="task-menu-wrapper">
          <button
            type="button"
            className="task-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Task options"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <div className="task-menu-dropdown" onMouseLeave={() => setShowMenu(false)}>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    onEdit(task)
                  }}
                >
                  <Pencil size={14} /> Edit Task
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setShowMenu(false)
                    onDelete(task._id)
                  }}
                >
                  <Trash2 size={14} /> Delete Task
                </button>
              )}
              <div className="menu-divider" />
              <div className="menu-label">Move status:</div>
              {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    setShowMenu(false)
                    const progress = status === 'DONE'
                      ? 100
                      : status === 'TODO'
                        ? 0
                        : status === 'IN_PROGRESS'
                          ? Math.max(task.progress, 25)
                          : task.progress
                    onStatusChange(task._id, status, progress)
                  }}
                >
                  Move to {TASK_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <h4 className="task-card-title">{task.title}</h4>
      {task.description && <p className="task-card-desc">{task.description}</p>}

      {/* Progress Bar */}
      <div className="task-progress-section">
        <div className="task-progress-info">
          <small>Progress</small>
          <span>{task.progress}%</span>
        </div>
        <div className="task-progress-bar-bg">
          <div
            className={`task-progress-bar-fill ${boardStatus.toLowerCase()}`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Footer: Deadline & Assignees */}
      <div className="task-card-footer">
        <div className={`task-deadline ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}`}>
          {isOverdue ? <Clock size={14} /> : <Calendar size={14} />}
          <span>{task.deadline ? formatDate(task.deadline) : 'No deadline'}</span>
        </div>

        <div className="task-assignees">
          {task.assignedTo && task.assignedTo.length > 0 ? (
            task.assignedTo.map((user) => {
              const name = user.name || user.email || 'User'
              const initial = name.charAt(0).toUpperCase()
              return (
                <div
                  key={user._id || user}
                  className="assignee-avatar"
                  title={name}
                >
                  {initial}
                </div>
              )
            })
          ) : (
            <span className="unassigned-badge" title="Unassigned">
              <User size={12} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
