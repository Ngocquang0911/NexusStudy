import { Hash, Lock, Plus, Search } from 'lucide-react'
import { useState } from 'react'

export default function ChannelList({
  channels = [],
  activeChannelId,
  onSelectChannel,
  onOpenCreateModal,
  isLeader = true,
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="chat-channels-sidebar">
      <div className="channels-header">
        <div className="channels-title-row">
          <h3>Channels</h3>
          {isLeader && (
            <button
              type="button"
              className="icon-action"
              onClick={onOpenCreateModal}
              title="Create Channel"
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
    </div>
  )
}
