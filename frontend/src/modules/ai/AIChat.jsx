export default function AIChat({ messages = [], onAsk }) {
  function handleSubmit(event) { event.preventDefault(); const question = new FormData(event.currentTarget).get('question'); if (question?.trim()) onAsk?.(question.trim()); event.currentTarget.reset() }
  return <section><h1>Study assistant</h1>{messages.map((message, index) => <p key={index}><strong>{message.role}:</strong> {message.content}</p>)}<form onSubmit={handleSubmit}><input name="question" placeholder="Ask about workspace documents..." required /><button type="submit">Ask</button></form></section>
}
