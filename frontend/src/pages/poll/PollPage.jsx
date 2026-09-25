import { ArrowLeft, CheckCircle2, Clock, LoaderCircle, Plus, Vote } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CreatePollModal from '../../components/poll/CreatePollModal.jsx'
import PollCard from '../../components/poll/PollCard.jsx'
import useAuth from '../../hooks/useAuth.js'
import {
  closePoll,
  createPoll,
  deletePoll,
  listPolls,
  votePoll,
} from '../../services/pollService.js'
import { getWorkspace, getWorkspaceMembers, listWorkspaces } from '../../services/workspaceService.js'

export default function PollPage() {
  const { workspaceId: paramWorkspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(paramWorkspaceId || '')
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])

  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals & Filters
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [filterTab, setFilterTab] = useState('ALL') // ALL, ACTIVE, CLOSED, MY_VOTES

  const activeWsId = paramWorkspaceId || selectedWorkspaceId

  // Load user workspaces list if standalone /polls route
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

  // Load workspace details & polls
  const loadPollsData = useCallback(async () => {
    if (!activeWsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [pollsRes, memberRes, wsRes] = await Promise.all([
        listPolls(activeWsId),
        getWorkspaceMembers(activeWsId).catch(() => ({ data: { data: [] } })),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
      ])

      setPolls(pollsRes.data.data || [])
      setMembers(memberRes.data.data || [])
      setWorkspace(wsRes.data.data || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load group polls')
    } finally {
      setLoading(false)
    }
  }, [activeWsId])

  useEffect(() => {
    loadPollsData()
  }, [loadPollsData])

  // Handlers
  const handleCreatePollSubmit = async (formData) => {
    setCreateLoading(true)
    try {
      await createPoll(activeWsId, formData)
      await loadPollsData()
      setIsCreateOpen(false)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleVote = async (pollId, optionId) => {
    try {
      const { data } = await votePoll(pollId, optionId)
      const updatedPoll = data.data
      setPolls((prev) => prev.map((p) => (p._id === pollId ? updatedPoll : p)))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit vote')
    }
  }

  const handleClosePoll = async (pollId) => {
    if (!window.confirm('Close this poll to stop receiving votes?')) return
    try {
      const { data } = await closePoll(pollId)
      const updatedPoll = data.data
      setPolls((prev) => prev.map((p) => (p._id === pollId ? updatedPoll : p)))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close poll')
    }
  }

  const handleDeletePoll = async (pollId) => {
    if (!window.confirm('Are you sure you want to delete this poll?')) return
    try {
      await deletePoll(pollId)
      setPolls((prev) => prev.filter((p) => p._id !== pollId))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete poll')
    }
  }

  // Filter polls
  const filteredPolls = polls.filter((poll) => {
    if (filterTab === 'ACTIVE') return poll.status === 'OPEN'
    if (filterTab === 'CLOSED') return poll.status === 'CLOSED' || poll.status === 'EXPIRED'
    if (filterTab === 'MY_VOTES') return Boolean(poll.userVote)
    return true
  })

  const currentMember = members.find((m) => (m.userId?._id || m.userId) === user?._id)
  const userRole = currentMember?.role || 'MEMBER'

  // Stats calculation
  const activePollsCount = polls.filter((p) => p.status === 'OPEN').length
  const totalVotesCast = polls.reduce((sum, p) => sum + (p.totalVotes || 0), 0)

  return (
    <div className="poll-page-container">
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
            <Link to={`/workspaces/${paramWorkspaceId}/chat`}>Chat</Link>
            <Link className="active" to={`/workspaces/${paramWorkspaceId}/polls`}>
              Polls
            </Link>
            <Link to={`/workspaces/${paramWorkspaceId}/documents`}>Documents</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/evaluations`}>Evaluation</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/ai`}>AI assistant</Link>
          </nav>
        </div>
      ) : (
        <div className="page-title-row">
          <div>
            <span className="eyebrow">GROUP DECISIONS</span>
            <h1>Workspace Polls</h1>
            <p>Vote on key topics, schedule meetings, and make group decisions.</p>
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
            <button
              type="button"
              className="primary-action"
              onClick={() => setIsCreateOpen(true)}
              disabled={!activeWsId}
            >
              <Plus size={16} /> Create Poll
            </button>
          </div>
        </div>
      )}

      {/* Page Action bar inside workspace view */}
      {paramWorkspaceId && (
        <div className="task-page-sub-header">
          <div className="section-title">
            <h2>Polls & Team Surveys</h2>
            <p>Gather feedback and democratize team choices.</p>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} /> Create Poll
          </button>
        </div>
      )}

      {/* Poll Metrics Summary Card */}
      <div className="task-stats-summary-card">
        <div className="stat-pill">
          <span className="stat-num">{polls.length}</span>
          <span className="stat-label">Total Polls</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-green">{activePollsCount}</span>
          <span className="stat-label">Active Polls</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-blue">{totalVotesCast}</span>
          <span className="stat-label">Votes Cast</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="poll-filter-tabs-row">
        <button
          type="button"
          className={`filter-chip ${filterTab === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilterTab('ALL')}
        >
          All Polls ({polls.length})
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setFilterTab('ACTIVE')}
        >
          Active ({activePollsCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'CLOSED' ? 'active' : ''}`}
          onClick={() => setFilterTab('CLOSED')}
        >
          Closed / Expired ({polls.length - activePollsCount})
        </button>
        <button
          type="button"
          className={`filter-chip ${filterTab === 'MY_VOTES' ? 'active' : ''}`}
          onClick={() => setFilterTab('MY_VOTES')}
        >
          My Votes ({polls.filter((p) => p.userVote).length})
        </button>
      </div>

      {/* Polls Feed */}
      {loading ? (
        <div className="route-loading" style={{ minHeight: '300px' }}>
          <LoaderCircle className="spin" size={24} /> Loading group polls...
        </div>
      ) : error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : !activeWsId ? (
        <div className="workspace-empty surface-card">
          <Vote size={40} />
          <h2>No workspace selected</h2>
          <p>Please select a workspace to view group polls.</p>
        </div>
      ) : filteredPolls.length === 0 ? (
        <div className="workspace-empty surface-card">
          <Vote size={40} />
          <h2>No polls found</h2>
          <p>Create a poll to gather feedback from your workspace members.</p>
          <button
            type="button"
            className="primary-action margin-top-md"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus size={16} /> Create First Poll
          </button>
        </div>
      ) : (
        <div className="polls-grid-layout">
          {filteredPolls.map((poll) => (
            <PollCard
              key={poll._id}
              poll={poll}
              onVote={handleVote}
              onClosePoll={handleClosePoll}
              onDeletePoll={handleDeletePoll}
              currentUserId={user?._id}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Create Poll Modal */}
      <CreatePollModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePollSubmit}
        loading={createLoading}
      />
    </div>
  )
}
