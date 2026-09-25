export default function MessageList({ messages = [] }) {
  return <div>{messages.map((message) => <article key={message.id}><strong>{message.authorName}</strong><p>{message.body}</p></article>)}</div>
}
