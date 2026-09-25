import TaskCard from './TaskCard.jsx'

const columns = ['TODO', 'DOING', 'DONE']
export default function KanbanBoard({ tasks = [], onSelectTask }) {
  return <section className="kanban-board">{columns.map((column) => <div key={column}><h2>{column}</h2>{tasks.filter((task) => task.status === column).map((task) => <TaskCard key={task.id} task={task} onSelect={onSelectTask} />)}</div>)}</section>
}
