import { ChevronDown, MessageSquare, Pin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import MessageItem from './MessageItem.jsx'

export default function MessageList({
  messages = [],
  pinnedMessages = [],
  typingUsers = [],
  currentUserId,
  isLeader = false,
  onPin,
  onEdit,
  onDelete,
}) {
  const scrollRef = useRef(null)
  const [showPinnedBanner, setShowPinnedBanner] = useState(true)

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, typingUsers])

  // Group messages chronologically
  const sortedMessages = [...messages].reverse()

  return (
    <div className="message-list-container">
      {/* Pinned Messages Header Banner */}
      {pinnedMessages.length > 0 && showPinnedBanner && (
        <div className="pinned-messages-banner">
          <div className="pinned-banner-content">
            <Pin size={14} className="pin-icon" />
            <div className="pinned-text">
              <strong>{pinnedMessages.length} Pinned Message{pinnedMessages.length > 1 ? 's' : ''}:</strong>
              <span>"{pinnedMessages[0]?.content}"</span>
            </div>
          </div>
          <button
            type="button"
            className="dismiss-pinned-btn"
            onClick={() => setShowPinnedBanner(false)}
            title="Hide banner"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div className="message-scroll-area" ref={scrollRef}>
        {sortedMessages.length === 0 ? (
          <div className="empty-messages-placeholder">
            <MessageSquare size={36} />
            <h3>No messages yet</h3>
            <p>Be the first to start the conversation in this channel!</p>
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <MessageItem
              key={msg._id}
              message={msg}
              currentUserId={currentUserId}
              isLeader={isLeader}
              onPin={onPin}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}

        {/* Real-time Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator-row">
            <div className="typing-dots">
              <span />
              <span />
              <span />
            </div>
            <small>
              {typingUsers.length === 1
                ? 'Someone is typing...'
                : `${typingUsers.length} people are typing...`}
            </small>
          </div>
        )}
      </div>
    </div>
  )
}
