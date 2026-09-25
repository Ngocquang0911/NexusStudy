import MessageInput from './MessageInput.jsx'
import MessageList from './MessageList.jsx'

export default function ChatRoom({ messages = [], onSend }) {
  return <section><h1>Workspace chat</h1><MessageList messages={messages} /><MessageInput onSend={onSend} /></section>
}
