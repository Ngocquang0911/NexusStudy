import { ArrowLeft, Hash, Lock, LoaderCircle, MessageSquare, Pin, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ChannelList from '../../components/chat/ChannelList.jsx'
import ChatSearchModal from '../../components/chat/ChatSearchModal.jsx'
import CreateChannelModal from '../../components/chat/CreateChannelModal.jsx'
import MessageInput from '../../components/chat/MessageInput.jsx'
import MessageList from '../../components/chat/MessageList.jsx'
import useAuth from '../../hooks/useAuth.js'
import useSocket from '../../hooks/useSocket.js'
import {
  createChannel,
  deleteMessage,
  editMessage,
  listChannels,
  listMessages,
  sendMessage as sendRestMessage,
  togglePinMessage,
} from '../../services/chatService.js'
import { getWorkspace, getWorkspaceMembers, listWorkspaces } from '../../services/workspaceService.js'

export default function ChatPage() {
  const { workspaceId: paramWorkspaceId } = useParams()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const { socket, isConnected } = useSocket(token)

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(paramWorkspaceId || '')
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])

  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState('')

  // Modals & UI states
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [createChannelLoading, setCreateChannelLoading] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])

  const activeWsId = paramWorkspaceId || selectedWorkspaceId

  // Load user workspaces list if standalone /chat route
  useEffect(() => {
    if (!paramWorkspaceId) {
      listWorkspaces()
        .then(({ data }) => {
          const list = data.data || []
          setWorkspaces(list)
          if (list.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(list[0]._id)
          }
        })
        .catch(() => {})
    } else {
      setSelectedWorkspaceId(paramWorkspaceId)
    }
  }, [paramWorkspaceId])

  // Load workspace details & channels
  const loadChannels = useCallback(async () => {
    if (!activeWsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [channelsRes, memberRes, wsRes] = await Promise.all([
        listChannels(activeWsId),
        getWorkspaceMembers(activeWsId).catch(() => ({ data: { data: [] } })),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
      ])

      const chanList = channelsRes.data.data || []
      setChannels(chanList)
      setMembers(memberRes.data.data || [])
      setWorkspace(wsRes.data.data || null)

      if (chanList.length > 0 && !activeChannel) {
        setActiveChannel(chanList[0])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load chat channels')
    } finally {
      setLoading(false)
    }
  }, [activeWsId])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  // Load messages whenever activeChannel changes
  const loadChannelMessages = useCallback(async (channelId) => {
    if (!channelId) return
    setMessagesLoading(true)
    try {
      const { data } = await listMessages(channelId, 50)
      setMessages(data.data || [])
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeChannel?._id) {
      loadChannelMessages(activeChannel._id)
    }
  }, [activeChannel?._id, loadChannelMessages])

  // SOCKET.IO REAL-TIME SUBSCRIPTIONS
  useEffect(() => {
    if (!socket || !isConnected) return undefined

    if (activeWsId) {
      socket.emit('joinWorkspace', { workspaceId: activeWsId })
    }

    if (activeChannel?._id) {
      socket.emit('joinChannel', { channelId: activeChannel._id })
    }

    const handleReceiveMessage = (newMessage) => {
      if (newMessage.channelId === activeChannel?._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev
          return [newMessage, ...prev]
        })
      }
    }

    const handleTyping = ({ userId }) => {
      if (userId !== user?._id && !typingUsers.includes(userId)) {
        setTypingUsers((prev) => [...prev, userId])
      }
    }

    const handleStopTyping = ({ userId }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId))
    }

    const handleMessagePinned = (pinnedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === pinnedMessage._id ? pinnedMessage : m))
      )
    }

    const handleChannelRead = ({ channelId, userId }) => {
      if (channelId === activeChannel?._id) {
        setMessages((prev) =>
          prev.map((m) => {
            const hasRead = m.readBy?.some((u) => (typeof u === 'object' ? u._id : u) === userId)
            if (hasRead) return m
            return { ...m, readBy: [...(m.readBy || []), userId] }
          })
        )
      }
    }

    socket.on('receiveMessage', handleReceiveMessage)
    socket.on('typing', handleTyping)
    socket.on('stopTyping', handleStopTyping)
    socket.on('messagePinned', handleMessagePinned)
    socket.on('channelRead', handleChannelRead)

    return () => {
      socket.off('receiveMessage', handleReceiveMessage)
      socket.off('typing', handleTyping)
      socket.off('stopTyping', handleStopTyping)
      socket.off('messagePinned', handleMessagePinned)
      socket.off('channelRead', handleChannelRead)
    }
  }, [socket, isConnected, activeWsId, activeChannel?._id, user?._id])

  // USER ACTIONS
  const handleSelectChannel = (channel) => {
    setActiveChannel(channel)
    setTypingUsers([])
  }

  const handleCreateChannelSubmit = async (formData) => {
    setCreateChannelLoading(true)
    try {
      const { data } = await createChannel(activeWsId, formData)
      const newChan = data.data
      setChannels((prev) => [...prev, newChan])
      setActiveChannel(newChan)
      setIsCreateChannelOpen(false)
    } finally {
      setCreateChannelLoading(false)
    }
  }

  const handleSendMessage = async ({ content, attachments }) => {
    if (!activeChannel?._id) return

    const addMessageIfNew = (msg) => {
      if (!msg || !msg._id) return
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev
        return [msg, ...prev]
      })
    }

    // Try Socket emit first if connected
    if (socket && isConnected) {
      socket.emit(
        'sendMessage',
        { channelId: activeChannel._id, content, attachments },
        (res) => {
          if (res?.success && res.data) {
            addMessageIfNew(res.data)
          } else {
            // Fallback REST
            sendRestMessage(activeChannel._id, { content, attachments }).then(({ data }) => {
              if (data?.data) addMessageIfNew(data.data)
            })
          }
        }
      )
    } else {
      // Fallback REST
      const { data } = await sendRestMessage(activeChannel._id, { content, attachments })
      if (data?.data) addMessageIfNew(data.data)
    }
  }

  const handleTypingTrigger = () => {
    if (socket && isConnected && activeChannel?._id) {
      socket.emit('typing', { channelId: activeChannel._id })
    }
  }

  const handleStopTypingTrigger = () => {
    if (socket && isConnected && activeChannel?._id) {
      socket.emit('stopTyping', { channelId: activeChannel._id })
    }
  }

  const handlePinMessage = async (messageId) => {
    if (socket && isConnected) {
      socket.emit('pinMessage', { messageId }, (res) => {
        if (res?.success && res.data) {
          setMessages((prev) => prev.map((m) => (m._id === messageId ? res.data : m)))
        } else {
          togglePinMessage(messageId).then(({ data }) => {
            setMessages((prev) => prev.map((m) => (m._id === messageId ? data.data : m)))
          })
        }
      })
    } else {
      const { data } = await togglePinMessage(messageId)
      setMessages((prev) => prev.map((m) => (m._id === messageId ? data.data : m)))
    }
  }

  const handleEditMessage = async (messageId, newContent) => {
    const { data } = await editMessage(messageId, { content: newContent })
    setMessages((prev) => prev.map((m) => (m._id === messageId ? data.data : m)))
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return
    await deleteMessage(messageId)
    setMessages((prev) => prev.filter((m) => m._id !== messageId))
  }

  const currentMember = members.find((m) => (m.userId?._id || m.userId) === user?._id)
  const userRole = currentMember?.role || 'MEMBER'
  const isLeader = ['OWNER', 'LEADER'].includes(userRole)
  const pinnedMessages = messages.filter((m) => m.isPinned)

  return (
    <div className="chat-page-container">
      {/* Workspace Header & Tabs if inside workspace context */}
      {paramWorkspaceId && workspace ? (
        <div className="workspace-detail-header-block">
          <Link className="back-link" to="/workspaces">
            <ArrowLeft size={16} /> All workspaces
          </Link>
          <section className="workspace-hero">
            <div className="workspace-hero-icon">{workspace.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <span className="eyebrow">{workspace.type}</span>
              <h1>{workspace.name}</h1>
              <p>{workspace.description || 'A focused space for your group to collaborate.'}</p>
            </div>
          </section>

          <nav className="workspace-tabs">
            <Link to={`/workspaces/${paramWorkspaceId}`}>Overview</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/tasks`}>Tasks</Link>
            <Link className="active" to={`/workspaces/${paramWorkspaceId}/chat`}>
              Chat
            </Link>
            <Link to={`/workspaces/${paramWorkspaceId}/polls`}>Polls</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/documents`}>Documents</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/evaluations`}>Evaluation</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/ai`}>AI assistant</Link>
          </nav>
        </div>
      ) : (
        <div className="page-title-row">
          <div>
            <span className="eyebrow">COMMUNICATION</span>
            <h1>Workspace Chat</h1>
            <p>Real-time group messaging and channel discussions.</p>
          </div>

          <div className="page-actions-right">
            {workspaces.length > 0 && (
              <div className="workspace-select-wrapper">
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="workspace-picker-select"
                >
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      Workspace: {ws.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Interface Grid */}
      {loading ? (
        <div className="route-loading" style={{ minHeight: '350px' }}>
          <LoaderCircle className="spin" size={24} /> Loading chat channels...
        </div>
      ) : error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : !activeWsId ? (
        <div className="workspace-empty surface-card">
          <MessageSquare size={40} />
          <h2>No workspace selected</h2>
          <p>Please select a workspace to join chat channels.</p>
        </div>
      ) : (
        <div className="chat-layout-card surface-card">
          {/* Channels Sidebar */}
          <ChannelList
            channels={channels}
            activeChannelId={activeChannel?._id}
            onSelectChannel={handleSelectChannel}
            onOpenCreateModal={() => setIsCreateChannelOpen(true)}
            isLeader={isLeader}
          />

          {/* Main Channel Discussion Area */}
          <div className="chat-main-area">
            {activeChannel ? (
              <>
                {/* Active Channel Header */}
                <div className="channel-top-bar">
                  <div className="channel-info-group">
                    {activeChannel.isPrivate ? <Lock size={18} /> : <Hash size={18} />}
                    <div>
                      <h2>{activeChannel.name}</h2>
                      {activeChannel.description && (
                        <p className="channel-desc">{activeChannel.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="channel-actions-group">
                    <span
                      className={`socket-status-pill ${isConnected ? 'online' : 'offline'}`}
                      title={isConnected ? 'Real-time connected' : 'Polling fallback'}
                    >
                      <span className="dot" /> {isConnected ? 'Live' : 'Polling'}
                    </span>

                    <button
                      type="button"
                      className="icon-action"
                      onClick={() => setIsSearchOpen(true)}
                      title="Search messages"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </div>

                {/* Messages Feed */}
                {messagesLoading ? (
                  <div className="messages-loading">
                    <LoaderCircle className="spin" size={20} /> Loading message history...
                  </div>
                ) : (
                  <MessageList
                    messages={messages}
                    pinnedMessages={pinnedMessages}
                    typingUsers={typingUsers}
                    currentUserId={user?._id}
                    isLeader={isLeader}
                    onPin={handlePinMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                  />
                )}

                {/* Message Input Bar */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTyping={handleTypingTrigger}
                  onStopTyping={handleStopTypingTrigger}
                />
              </>
            ) : (
              <div className="empty-messages-placeholder">
                <MessageSquare size={40} />
                <h3>No channel selected</h3>
                <p>Select a channel on the left to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onSubmit={handleCreateChannelSubmit}
        loading={createChannelLoading}
      />

      {activeChannel && (
        <ChatSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          channelId={activeChannel._id}
          channelName={activeChannel.name}
        />
      )}
    </div>
  )
}
