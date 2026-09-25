import KanbanColumn from './KanbanColumn.jsx'

export default function KanbanBoard({
  tasks = [],
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onQuickAdd,
  currentUserId,
  userRole,
}) {
  const todoTasks = tasks.filter((t) => t.status === 'TODO')
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS')
  const doneTasks = tasks.filter((t) => t.status === 'DONE')

  return (
    <div className="kanban-board-grid">
      <KanbanColumn
        status="TODO"
        title="To Do"
        tasks={todoTasks}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onStatusChange={onStatusChange}
        onQuickAdd={onQuickAdd}
        currentUserId={currentUserId}
        userRole={userRole}
      />
      <KanbanColumn
        status="IN_PROGRESS"
        title="In Progress"
        tasks={inProgressTasks}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onStatusChange={onStatusChange}
        onQuickAdd={onQuickAdd}
        currentUserId={currentUserId}
        userRole={userRole}
      />
      <KanbanColumn
        status="DONE"
        title="Done"
        tasks={doneTasks}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
        onStatusChange={onStatusChange}
        onQuickAdd={onQuickAdd}
        currentUserId={currentUserId}
        userRole={userRole}
      />
    </div>
  )
}
