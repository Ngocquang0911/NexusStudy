import { Paperclip, Send, X } from 'lucide-react'
import { useRef, useState } from 'react'

export default function MessageInput({ onSendMessage, onTyping, onStopTyping, disabled = false }) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState([])
  const [attachmentInput, setAttachmentInput] = useState('')
  const [showAttachModal, setShowAttachModal] = useState(false)
  const typingTimerRef = useRef(null)

  const handleTextChange = (e) => {
    setContent(e.target.value)

    if (onTyping) {
      onTyping()
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }

    typingTimerRef.current = setTimeout(() => {
      if (onStopTyping) onStopTyping()
    }, 1500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleAddAttachmentUrl = () => {
    if (!attachmentInput.trim()) return
    setAttachments([...attachments, attachmentInput.trim()])
    setAttachmentInput('')
    setShowAttachModal(false)
  }

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }
    if (onStopTyping) onStopTyping()

    onSendMessage({
      content: content.trim(),
      attachments,
    })

    setContent('')
    setAttachments([])
  }

  return (
    <div className="message-input-container">
      {/* Attachments preview row */}
      {attachments.length > 0 && (
        <div className="attachment-previews-bar">
          {attachments.map((url, i) => (
            <div key={i} className="attachment-chip">
              <Paperclip size={12} />
              <span className="attachment-url">{url.split('/').pop() || url}</span>
              <button type="button" onClick={() => handleRemoveAttachment(i)}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attach modal popover */}
      {showAttachModal && (
        <div className="attach-popover">
          <label>Add File / Image URL:</label>
          <div className="popover-input-row">
            <input
              type="text"
              placeholder="https://example.com/file.pdf"
              value={attachmentInput}
              onChange={(e) => setAttachmentInput(e.target.value)}
            />
            <button type="button" className="primary-action text-xs" onClick={handleAddAttachmentUrl}>
              Add
            </button>
            <button type="button" className="secondary-action text-xs" onClick={() => setShowAttachModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-form-bar">
        <button
          type="button"
          className="attach-btn"
          onClick={() => setShowAttachModal(!showAttachModal)}
          title="Attach file URL"
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>

        <textarea
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={() => onStopTyping && onStopTyping()}
          placeholder="Type a message... (Press Enter to send)"
          rows={1}
          disabled={disabled}
          className="message-textarea"
        />

        <button
          type="submit"
          className="send-btn"
          disabled={disabled || (!content.trim() && attachments.length === 0)}
          title="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
