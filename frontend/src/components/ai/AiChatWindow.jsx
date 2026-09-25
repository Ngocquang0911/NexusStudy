import { Bot, FileText, LoaderCircle, Paperclip, Send, Sparkles, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export default function AiChatWindow({
  messages = [],
  onSendMessage,
  loading = false,
  documents = [],
  selectedDocIds = [],
  onDocSelectionChange,
}) {
  const [inputQuery, setInputQuery] = useState('')
  const [showDocSelector, setShowDocSelector] = useState(false)
  const chatScrollRef = useRef(null)

  // Scroll to bottom when messages update
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputQuery.trim() || loading) return
    onSendMessage(inputQuery.trim())
    setInputQuery('')
  }

  const handleToggleDoc = (docId) => {
    if (selectedDocIds.includes(docId)) {
      onDocSelectionChange(selectedDocIds.filter((id) => id !== docId))
    } else {
      onDocSelectionChange([...selectedDocIds, docId])
    }
  }

  return (
    <div className="ai-chat-window surface-card">
      <div className="ai-chat-header">
        <div className="ai-brand-group">
          <div className="ai-logo-mark">
            <Sparkles size={18} />
          </div>
          <div>
            <h3>NEXUS AI</h3>
            <span className="ai-subtitle">Academic Study Assistant</span>
          </div>
        </div>

        {/* Selected Context Documents Counter */}
        {documents.length > 0 && (
          <button
            type="button"
            className={`context-docs-btn ${selectedDocIds.length > 0 ? 'active' : ''}`}
            onClick={() => setShowDocSelector(!showDocSelector)}
          >
            <Paperclip size={14} />
            <span>
              {selectedDocIds.length === 0
                ? 'All Documents'
                : `${selectedDocIds.length} Document${selectedDocIds.length > 1 ? 's' : ''} Selected`}
            </span>
          </button>
        )}
      </div>

      {/* Document Selector Popover */}
      {showDocSelector && (
        <div className="doc-selector-popover">
          <div className="popover-top">
            <strong>Select Workspace Documents for AI Context:</strong>
            <button type="button" onClick={() => setShowDocSelector(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="doc-chips-list">
            <button
              type="button"
              className={`doc-chip ${selectedDocIds.length === 0 ? 'selected' : ''}`}
              onClick={() => onDocSelectionChange([])}
            >
              All Workspace Docs
            </button>
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc._id)
              return (
                <button
                  key={doc._id}
                  type="button"
                  className={`doc-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleToggleDoc(doc._id)}
                >
                  <FileText size={12} /> {doc.fileName}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Message Feed Area */}
      <div className="ai-chat-messages-scroll" ref={chatScrollRef}>
        {messages.length === 0 ? (
          <div className="ai-empty-welcome">
            <div className="welcome-spark-icon">
              <Sparkles size={32} />
            </div>
            <h3>Hello! How can NEXUS AI help your studies today?</h3>
            <p>
              Ask questions about course materials, generate revision quizzes, summarize workspace documents, or optimize task distribution.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`ai-message-bubble ${msg.role === 'user' ? 'user-role' : 'ai-role'}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>

              <div className="msg-content-wrapper">
                <div className="msg-sender-title">
                  {msg.role === 'user' ? 'You' : 'NEXUS AI'}
                </div>
                <div className="msg-text-body">{msg.content}</div>

                {/* Source Documents Reference Badge */}
                {msg.sourceDocuments && msg.sourceDocuments.length > 0 && (
                  <div className="source-documents-footer">
                    <small>Referenced Context:</small>
                    <div className="source-doc-tags">
                      {msg.sourceDocuments.map((sDoc) => (
                        <span key={sDoc.id || sDoc.fileName} className="source-tag">
                          <FileText size={11} /> {sDoc.fileName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* AI Loading State Spinner */}
        {loading && (
          <div className="ai-message-bubble ai-role loading-state">
            <div className="msg-avatar">
              <Bot size={16} />
            </div>
            <div className="msg-content-wrapper">
              <div className="msg-sender-title">NEXUS AI</div>
              <div className="ai-thinking-row">
                <LoaderCircle className="spin" size={16} />
                <span>NEXUS AI is analyzing documents and generating response...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form Bar */}
      <form onSubmit={handleSend} className="ai-chat-input-bar">
        <input
          type="text"
          placeholder="Ask NEXUS AI a study question..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={loading}
          className="ai-text-input"
        />

        <button
          type="submit"
          className="primary-action ai-send-btn"
          disabled={loading || !inputQuery.trim()}
        >
          {loading ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
          <span>Send</span>
        </button>
      </form>
    </div>
  )
}
