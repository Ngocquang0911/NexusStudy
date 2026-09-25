import { LoaderCircle, Search, X } from 'lucide-react'
import { useState } from 'react'
import { searchMessages } from '../../services/chatService.js'

export default function ChatSearchModal({ isOpen, onClose, channelId, channelName }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  if (!isOpen) return null

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setHasSearched(true)
    try {
      const { data } = await searchMessages(channelId, query.trim())
      setResults(data.data || [])
    } catch (err) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workspace-modal chat-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Search Messages in #{channelName}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="search-modal-form">
          <div className="search-modal-input-group">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search keyword or phrase..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <button type="submit" className="primary-action text-xs" disabled={loading || !query.trim()}>
              {loading ? <LoaderCircle className="spin" size={14} /> : 'Search'}
            </button>
          </div>
        </form>

        <div className="search-results-container">
          {loading ? (
            <div className="search-loading">
              <LoaderCircle className="spin" size={20} /> Searching channel messages...
            </div>
          ) : hasSearched && results.length === 0 ? (
            <div className="search-empty">No messages found matching "{query}"</div>
          ) : (
            results.map((msg) => (
              <div key={msg._id} className="search-result-item">
                <div className="result-header">
                  <strong>{msg.senderId?.name || msg.senderId?.email || 'User'}</strong>
                  <small>{new Date(msg.createdAt).toLocaleString()}</small>
                </div>
                <p className="result-content">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
