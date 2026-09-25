export default function CreatePoll({ onSubmit }) {
  function handleSubmit(event) { event.preventDefault(); onSubmit?.(Object.fromEntries(new FormData(event.currentTarget))); event.currentTarget.reset() }
  return <form onSubmit={handleSubmit}><label>Question<input name="question" required /></label><label>Closing time<input name="closesAt" type="datetime-local" /></label><button type="submit">Create poll</button></form>
}
