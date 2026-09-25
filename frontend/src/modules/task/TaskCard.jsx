export default function TaskCard({ task, onSelect }) {
  return <article onClick={() => onSelect?.(task)}><strong>{task.title}</strong><span>{task.status}</span><small>{task.dueDate || 'No deadline'}</small></article>
}
