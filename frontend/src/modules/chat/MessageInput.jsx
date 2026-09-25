export default function MessageInput({ onSend }) {
  function handleSubmit(event) { event.preventDefault(); const body = new FormData(event.currentTarget).get('body'); if (body?.trim()) onSend?.(body.trim()); event.currentTarget.reset() }
  return <form onSubmit={handleSubmit}><input name="body" placeholder="Write a message..." required /><button type="submit">Send</button></form>
}
