import { Check, CheckCheck, FileText, Image as ImageIcon, MoreHorizontal, Paperclip, Pencil, Pin, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '../../utils/formatDate.js'

export default function MessageItem({
  message,
  currentUserId,
  isLeader = false,
  onPin,
  onEdit,
  onDelete,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [showMenu, setShowMenu] = useState(false)

  const sender = message.senderId || message.sender || {}
  const senderName = sender.name || sender.email || 'Unknown User'

  const getUserIdString = (userRef) => {
    if (!userRef) return ''
    if (typeof userRef === 'string') return userRef
    if (typeof userRef === 'object') {
      return userRef._id ? String(userRef._id) : userRef.id ? String(userRef.id) : String(userRef)
    }
    return String(userRef)
  }

  const senderIdStr = getUserIdString(sender)
  const currentUserIdStr = getUserIdString(currentUserId)
  const isSelf = Boolean(senderIdStr && currentUserIdStr && senderIdStr === currentUserIdStr)
  const canEdit = isSelf
  const canDelete = isSelf || isLeader

  // Read status calculation
  const readers = message.readBy || []
  const otherReaders = readers.filter((r) => getUserIdString(r) !== senderIdStr)
  const readerNames = otherReaders
    .map((r) => (typeof r === 'object' ? r.name || r.email : 'Thành viên'))
    .filter(Boolean)

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return
    await onEdit(message._id, editContent.trim())
    setIsEditing(false)
  }

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`message-item ${isSelf ? 'is-self' : ''} ${message.isPinned ? 'is-pinned' : ''}`}>
      <div className="message-avatar">
        {sender.avatar ? (
          <img src={sender.avatar} alt={senderName} />
        ) : (
          <span>{senderName.charAt(0).toUpperCase()}</span>
        )}
      </div>

      <div className="message-content-block">
        <div className="message-meta">
          <strong className="message-sender-name">{senderName}</strong>
          <span className="message-time">{formatMessageTime(message.createdAt)}</span>
          {message.isPinned && (
            <span className="pinned-indicator-badge" title="Pinned message">
              <Pin size={12} /> Pinned
            </span>
          )}
        </div>

        {isEditing ? (
          <div className="message-edit-box">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={2}
            />
            <div className="edit-actions">
              <button type="button" className="secondary-action text-sm" onClick={() => setIsEditing(false)}>
                <X size={14} /> Cancel
              </button>
              <button type="button" className="primary-action text-sm" onClick={handleSaveEdit}>
                <Check size={14} /> Save
              </button>
            </div>
          </div>
        ) : (
          <div className="message-text">{message.content}</div>
        )}

        {/* Attachments rendering */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="message-attachments-grid">
            {message.attachments.map((url, idx) => {
              const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(url)
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-card"
                >
                  {isImg ? (
                    <img src={url} alt={`Attachment ${idx + 1}`} className="attachment-img-preview" />
                  ) : (
                    <div className="attachment-file-preview">
                      <FileText size={18} />
                      <span className="file-name">{url.split('/').pop()}</span>
                    </div>
                  )}
                </a>
              )
            })}
          </div>
        )}

        {/* Read Receipt Status Footer */}
        <div className="message-status-bar">
          {otherReaders.length === 0 ? (
            <span className="read-status delivered" title="Chưa có ai đọc tin nhắn">
              <Check size={12} /> Đã nhận
            </span>
          ) : (
            <span
              className="read-status read"
              title={`Đã xem bởi: ${readerNames.join(', ')}`}
            >
              <CheckCheck size={12} />{' '}
              {otherReaders.length === 1
                ? `Đã xem bởi ${readerNames[0]}`
                : `Đã xem bởi ${readerNames[0]} và ${otherReaders.length - 1} người khác`}
            </span>
          )}
        </div>
      </div>

      {/* Hover action menu */}
      <div className="message-actions-menu">
        <button
          type="button"
          className="action-icon-btn"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreHorizontal size={14} />
        </button>

        {showMenu && (
          <div className="message-dropdown" onMouseLeave={() => setShowMenu(false)}>
            {isLeader && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  onPin(message._id)
                }}
              >
                <Pin size={13} /> {message.isPinned ? 'Unpin message' : 'Pin message'}
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  setIsEditing(true)
                }}
              >
                <Pencil size={13} /> Edit message
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setShowMenu(false)
                  onDelete(message._id)
                }}
              >
                <Trash2 size={13} /> Delete message
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
