export default function TaskForm({ onSubmit }) {
  function handleSubmit(event) { event.preventDefault(); onSubmit?.(Object.fromEntries(new FormData(event.currentTarget))); event.currentTarget.reset() }
  return <form onSubmit={handleSubmit}><label>Task title<input name="title" required /></label><label>Due date<input name="dueDate" type="date" /></label><button type="submit">Create task</button></form>
}
