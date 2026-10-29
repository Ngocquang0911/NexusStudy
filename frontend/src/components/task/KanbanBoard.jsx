import KanbanColumn from './KanbanColumn.jsx'
import { getTaskBoardStatus, TASK_BOARD_STATUSES, TASK_STATUS_LABELS } from '../../utils/taskStatus.js'

export default function KanbanBoard({
  tasks = [],
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onQuickAdd,
  currentUserId,
  userRole,
  now,
}) {
  return (
    <div className="kanban-board-grid">
      {TASK_BOARD_STATUSES.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          title={TASK_STATUS_LABELS[status]}
          tasks={tasks.filter((task) => getTaskBoardStatus(task, now) === status)}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          onStatusChange={onStatusChange}
          onQuickAdd={onQuickAdd}
          currentUserId={currentUserId}
          userRole={userRole}
          now={now}
        />
      ))}
    </div>
  )
}
