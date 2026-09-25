export default function QuizGenerator({ onGenerate }) {
  function handleSubmit(event) { event.preventDefault(); onGenerate?.(Object.fromEntries(new FormData(event.currentTarget))) }
  return <form onSubmit={handleSubmit}><h1>Generate a quiz</h1><label>Source document<input name="documentId" required /></label><button type="submit">Generate draft</button></form>
}
