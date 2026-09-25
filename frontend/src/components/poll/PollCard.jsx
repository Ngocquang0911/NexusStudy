import { Check, CheckCircle2, Clock, Lock, MoreVertical, Trash2, User, Vote } from 'lucide-react'
import { useState } from 'react'
import { formatDate } from '../../utils/formatDate.js'

export default function PollCard({
  poll,
  onVote,
  onClosePoll,
  onDeletePoll,
  currentUserId,
  userRole = 'MEMBER',
}) {
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [votingLoading, setVotingLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const isCreator = (poll.createdBy?._id || poll.createdBy) === currentUserId
  const isLeader = ['OWNER', 'LEADER'].includes(userRole)
  const canManage = isCreator || isLeader

  const hasVoted = Boolean(poll.userVote)
  const isOpen = poll.status === 'OPEN'
  const isExpired = poll.status === 'EXPIRED'
  const isClosed = poll.status === 'CLOSED'

  const handleVoteSubmit = async () => {
    if (!selectedOptionId || !isOpen || hasVoted) return
    setVotingLoading(true)
    try {
      await onVote(poll._id, selectedOptionId)
    } finally {
      setVotingLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (isOpen) return <span className="poll-status-badge open">ACTIVE</span>
    if (isExpired) return <span className="poll-status-badge expired">EXPIRED</span>
    return <span className="poll-status-badge closed">CLOSED</span>
  }

  return (
    <div className={`poll-card surface-card ${poll.status.toLowerCase()}`}>
      <div className="poll-card-header">
        <div className="poll-meta-left">
          {getStatusBadge()}
          <span className="poll-expiration">
            <Clock size={13} />
            {isOpen
              ? `Expires ${formatDate(poll.expiresAt)}`
              : `Ended ${formatDate(poll.expiresAt)}`}
          </span>
        </div>

        {canManage && (
          <div className="poll-menu-wrapper">
            <button
              type="button"
              className="icon-action"
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Poll options"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="poll-menu-dropdown" onMouseLeave={() => setShowMenu(false)}>
                {isOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onClosePoll(poll._id)
                    }}
                  >
                    <Lock size={14} /> Close Poll
                  </button>
                )}
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    setShowMenu(false)
                    onDeletePoll(poll._id)
                  }}
                >
                  <Trash2 size={14} /> Delete Poll
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <h3 className="poll-question">{poll.question}</h3>

      <div className="poll-options-list">
        {poll.options.map((option) => {
          const optionId = option.id || option._id
          const isUserSelection = poll.userVote === optionId
          const percent = poll.totalVotes
            ? Math.round((option.voteCount / poll.totalVotes) * 100)
            : 0

          const isSelectedForVote = selectedOptionId === optionId

          return (
            <div
              key={optionId}
              className={`poll-option-item ${isUserSelection ? 'user-voted' : ''} ${
                isSelectedForVote ? 'selected-for-vote' : ''
              }`}
              onClick={() => {
                if (isOpen && !hasVoted) {
                  setSelectedOptionId(optionId)
                }
              }}
            >
              {/* Option Radio / Icon */}
              {isOpen && !hasVoted ? (
                <div className="option-radio-circle">
                  <input
                    type="radio"
                    name={`poll-${poll._id}`}
                    checked={isSelectedForVote}
                    onChange={() => setSelectedOptionId(optionId)}
                  />
                </div>
              ) : isUserSelection ? (
                <CheckCircle2 size={16} className="user-voted-icon" />
              ) : (
                <span className="option-bullet" />
              )}

              <div className="option-content-col">
                <div className="option-text-row">
                  <span className="option-label">{option.label}</span>
                  <span className="option-stats">
                    {option.voteCount} vote{option.voteCount !== 1 ? 's' : ''} ({percent}%)
                  </span>
                </div>

                {/* Progress Percentage Fill */}
                <div className="option-progress-bg">
                  <div
                    className={`option-progress-fill ${isUserSelection ? 'voted' : ''}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="poll-card-footer">
        <div className="poll-total-count">
          <Vote size={15} />
          <span>{poll.totalVotes} Total Vote{poll.totalVotes !== 1 ? 's' : ''}</span>
          {hasVoted && <span className="voted-tag">• You voted</span>}
        </div>

        {isOpen && !hasVoted && (
          <button
            type="button"
            className="primary-action text-xs"
            onClick={handleVoteSubmit}
            disabled={!selectedOptionId || votingLoading}
          >
            {votingLoading ? 'Submitting...' : 'Submit Vote'}
          </button>
        )}
      </div>
    </div>
  )
}
