import { Plus } from 'lucide-react'
import { useState } from 'react'
import TaskCard from './TaskCard.jsx'

export default function KanbanColumn({
  status,
  title,
  tasks = [],
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onQuickAdd,
  currentUserId,
  userRole,
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('taskId')
    if (taskId) {
      let defaultProgress = 0
      if (status === 'IN_PROGRESS') defaultProgress = 50
      if (status === 'DONE') defaultProgress = 100
      onStatusChange(taskId, status, defaultProgress)
    }
  }

  return (
    <div
      className={`kanban-column ${status.toLowerCase()} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="kanban-column-header">
        <div className="column-title-group">
          <span className={`status-indicator-dot ${status.toLowerCase()}`} />
          <h3>{title}</h3>
          <span className="task-count-pill">{tasks.length}</span>
        </div>
        <button
          type="button"
          className="quick-add-icon-btn"
          onClick={() => onQuickAdd(status)}
          title={`Add ${title} task`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="kanban-column-body">
        {tasks.map((task) => (
          <TaskCard
            key={task._id}
            task={task}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onStatusChange={onStatusChange}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        ))}

        {tasks.length === 0 && (
          <div className="column-empty-placeholder">
            <p>No tasks in {title}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        className="column-quick-add-btn"
        onClick={() => onQuickAdd(status)}
      >
        <Plus size={16} /> Add Task
      </button>
    </div>
  )
}
