import { Hash, Lock, Plus, Search } from 'lucide-react'
import { useState } from 'react'

export default function ChannelList({
  channels = [],
  members = [],
  currentUserId,
  onSelectMember,
  directLoading,
  activeChannelId,
  onSelectChannel,
  onOpenCreateModal,
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredChannels = channels.filter((c) => !c.directKey).filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="chat-channels-sidebar">
      <div className="channels-header">
        <div className="channels-title-row">
          <h3>Channels</h3>
          {onOpenCreateModal && (
            <button
              type="button"
              className="icon-action"
              onClick={onOpenCreateModal}
              title="Create channel"
              aria-label="Create channel"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {channels.length > 5 && (
          <div className="channel-search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder="Filter channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="channels-list">
        {filteredChannels.map((channel) => {
          const isActive = channel._id === activeChannelId
          return (
            <button
              key={channel._id}
              type="button"
              className={`channel-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectChannel(channel)}
            >
              {channel.isPrivate ? <Lock size={15} className="channel-icon" /> : <Hash size={15} className="channel-icon" />}
              <span className="channel-name">{channel.name}</span>
            </button>
          )
        })}

        {filteredChannels.length === 0 && (
          <div className="empty-channels">
            <small>No channels found</small>
          </div>
        )}
      </div>
      <div className="chat-member-section"><div className="chat-member-heading"><h3>Direct messages</h3><span>{members.length}</span></div>
        {members.map((member) => { const person = member.userId; if (!person?._id) return null; const isSelf = person._id === currentUserId; const active = channels.some((channel) => channel._id === activeChannelId && channel.directKey?.split(':').includes(person._id) && !isSelf); return <button type="button" key={person._id} className={`chat-member-item ${active ? 'active' : ''}`} disabled={isSelf || directLoading} onClick={() => onSelectMember(person)}><span className="chat-member-avatar">{person.avatar ? <img src={person.avatar} alt="" /> : (person.name || '?').charAt(0).toUpperCase()}</span><span><strong>{person.name || 'Member'}{isSelf ? ' (you)' : ''}</strong><small>{member.role?.toLowerCase()}</small></span></button> })}
        {!members.length && <p className="chat-members-empty">No members available.</p>}
      </div>
    </div>
  )
}
