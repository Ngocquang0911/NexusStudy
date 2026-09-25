export default function EvaluationForm({ criteria = [], onSubmit }) {
  function handleSubmit(event) { event.preventDefault(); onSubmit?.(Object.fromEntries(new FormData(event.currentTarget))) }
  return <form onSubmit={handleSubmit}><h1>Peer evaluation</h1>{criteria.map((criterion) => <label key={criterion.id}>{criterion.label}<input name={criterion.id} type="number" min="1" max="5" required /></label>)}<button type="submit">Submit evaluation</button></form>
}
