import { ArrowRight, Lock, Users, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AccountRequiredModal({
  isOpen,
  onClose,
  actionTitle = 'Focus Rooms',
}) {
  if (!isOpen) return null

  return (
    <div
      className="pomodoro-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-req-title"
      onClick={onClose}
    >
      <div
        className="pomodoro-modal-card pomodoro-account-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pomodoro-modal-header">
          <div className="modal-title-with-icon">
            <span className="modal-icon-badge">
              <Users size={18} />
            </span>
            <h3 id="account-req-title">Account required for {actionTitle}</h3>
          </div>
          <button
            type="button"
            className="pomodoro-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="account-req-body">
          <div className="account-req-explanation">
            <p>
              <strong>Personal Pomodoro is 100% free</strong> and works directly on this page without an account.
            </p>
            <p>
              To customize focus and break times, cycles, or automatic timer behavior, create a free NexusStudy account.
            </p>
            <p>
              To create or join <strong>Live Focus Rooms</strong>, study in sync with classmates, share real-time goals, and save your study history to the cloud, you need a free NexusStudy account.
            </p>
          </div>

          <div className="feature-comparison-box">
            <div className="feature-col">
              <span className="col-badge guest">Guest Access (Now)</span>
              <ul>
                <li>✓ Personal Pomodoro timer</li>
                <li>✓ Default focus and break intervals</li>
                <li>✓ Local browser history (localStorage)</li>
                <li>✓ Personal goal setting</li>
              </ul>
            </div>
            <div className="feature-col">
              <span className="col-badge member">NexusStudy Account</span>
              <ul>
                <li>✨ Customize timer durations and settings</li>
                <li>✨ Create & join group Focus Rooms</li>
                <li>✨ Real-time synchronized room timer</li>
                <li>✨ Live study status with friends</li>
                <li>✨ Cloud study history & workspace analytics</li>
              </ul>
            </div>
          </div>

          <div className="account-req-actions">
            <Link to="/register" className="pomodoro-btn-primary full-width" onClick={onClose}>
              Create free student account <ArrowRight size={15} />
            </Link>
            <Link to="/login" className="pomodoro-btn-secondary full-width" onClick={onClose}>
              Already have an account? Log in
            </Link>
            <button type="button" className="pomodoro-btn-ghost full-width" onClick={onClose}>
              Continue with Personal Pomodoro
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
