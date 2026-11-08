import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Settings,
  SkipForward,
  Sparkles,
  StopCircle,
  Target,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import usePomodoro from '../../hooks/usePomodoro.js'
import useAuth from '../../hooks/useAuth.js'
import PomodoroSettingsModal from './PomodoroSettingsModal.jsx'
import AccountRequiredModal from './AccountRequiredModal.jsx'
import './pomodoro.css'

const noop = () => {}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatHistoryTimestamp(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function LivePomodoroSection({ isOpen = true, onClose = noop }) {
  const { isAuthenticated = false } = useAuth() || {}
  const {
    mode,
    timeLeft,
    totalTime,
    isRunning,
    isPaused,
    goal,
    settings,
    history,
    stats,
    currentCycle,
    totalCycles,
    completedCycles,
    progressPercent,
    lastCompleted,
    start,
    pause,
    resume,
    reset,
    skipBreak,
    endSession,
    switchMode,
    updateGoal,
    updateSettings,
    resetSettings,
    resetCycle,
    clearHistory,
    testSound,
    dismissLastCompleted,
  } = usePomodoro()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [accountModalAction, setAccountModalAction] = useState(null)
  const [goalInput, setGoalInput] = useState(goal)
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [showHistoryConfirm, setShowHistoryConfirm] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [panelPosition, setPanelPosition] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isOpen) return undefined

    let scrollEndTimeout
    const handleScroll = () => {
      setIsScrolling(true)
      window.clearTimeout(scrollEndTimeout)
      scrollEndTimeout = window.setTimeout(() => setIsScrolling(false), 500)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(scrollEndTimeout)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isDragging) return undefined

    const handlePointerMove = (event) => {
      const panel = panelRef.current
      if (!panel) return

      const { width, height } = panel.getBoundingClientRect()
      const maxLeft = Math.max(0, window.innerWidth - width)
      const maxTop = Math.max(0, window.innerHeight - height)
      const left = Math.min(maxLeft, Math.max(0, event.clientX - dragOffsetRef.current.x))
      const top = Math.min(maxTop, Math.max(0, event.clientY - dragOffsetRef.current.y))

      setPanelPosition({ left, top })
    }
    const handlePointerEnd = () => setIsDragging(false)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [isDragging])

  const handleDragStart = (event) => {
    if ((event.button !== undefined && event.button !== 0) || event.target.closest('button')) return
    const panel = panelRef.current
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    setPanelPosition({ left: rect.left, top: rect.top })
    setIsDragging(true)
  }

  const handleGoalSubmit = (e) => {
    e.preventDefault()
    updateGoal(goalInput.trim())
    setIsEditingGoal(false)
  }

  const handleOpenAccountModal = (actionName) => {
    setAccountModalAction(actionName)
  }

  const handleClearHistory = () => {
    clearHistory()
    setShowHistoryConfirm(false)
  }

  const openSettings = () => {
    if (!isAuthenticated) {
      setAccountModalAction('Customize Pomodoro Settings')
      return
    }

    setIsSettingsOpen(true)
  }

  const isBreak = mode === 'shortBreak' || mode === 'longBreak'

  return createPortal(
    <section
      ref={panelRef}
      className={`landing-pomodoro-section is-compact ${isScrolling ? 'is-scrolling' : ''} ${isDragging ? 'is-dragging' : ''}`}
      id="pomodoro"
      aria-labelledby="pomodoro-panel-title"
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="false"
      hidden={!isOpen}
      style={panelPosition ? { left: `${panelPosition.left}px`, top: `${panelPosition.top}px`, right: 'auto' } : undefined}
    >
      <div className="pomodoro-panel-toolbar" onPointerDown={handleDragStart}>
        <span className="pomodoro-panel-drag-handle" aria-label="Drag to move Pomodoro panel">
          <Clock size={16} />
          <span>Pomodoro</span>
        </span>
        <div className="pomodoro-panel-toolbar-actions">
          <button type="button" className="pomodoro-panel-tool-btn" onClick={onClose} aria-label="Close Pomodoro">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="pomodoro-container">
        {/* Section Heading - Matching NexusStudy standard design system */}
        <div className="landing-section-heading">
          <span className="landing-kicker">PERSONAL FOCUS & ACCOUNTABILITY</span>
          <h2 className="pomodoro-section-title" id="pomodoro-panel-title">Live Pomodoro</h2>
          <p className="landing-section-sub">
            Focus on your goals, one session at a time. No login or registration required.
          </p>
        </div>

        {/* Floating / Inline Session Completion Banner */}
        {lastCompleted && (
          <div className="pomodoro-completion-toast" role="alert">
            <div className="completion-toast-left">
              <Sparkles size={17} className="toast-spark-icon" />
              <div>
                <strong>Session completed! Great focus.</strong>
                <p>
                  You finished a {lastCompleted.durationMinutes}-minute focus sprint
                  {lastCompleted.goal ? ` on "${lastCompleted.goal}"` : ''}.
                  {currentCycle >= totalCycles
                    ? ' Full cycle done! Time for a Long Break.'
                    : ` Completed cycle round ${currentCycle} of ${totalCycles}.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={dismissLastCompleted}
              aria-label="Dismiss completion alert"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* CENTER STAGE: Primary Pomodoro Hero Card */}
        <div className="pomodoro-hero-card">
          {/* Mode Switcher Tabs */}
          <div className="pomodoro-mode-tabs" role="tablist" aria-label="Timer modes">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'focus'}
              className={`mode-tab-btn ${mode === 'focus' ? 'active focus' : ''}`}
              onClick={() => switchMode('focus')}
            >
              <span className="mode-tab-label">Focus</span>
              <span className="mode-tab-duration">{settings.focusDuration}m</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'shortBreak'}
              className={`mode-tab-btn ${mode === 'shortBreak' ? 'active short-break' : ''}`}
              onClick={() => switchMode('shortBreak')}
            >
              <span className="mode-tab-label">Short Break</span>
              <span className="mode-tab-duration">{settings.shortBreakDuration}m</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'longBreak'}
              className={`mode-tab-btn ${mode === 'longBreak' ? 'active long-break' : ''}`}
              onClick={() => switchMode('longBreak')}
            >
              <span className="mode-tab-label">Long Break</span>
              <span className="mode-tab-duration">{settings.longBreakDuration}m</span>
            </button>
          </div>

          {/* Vòng lặp / Cycle & Loop Indicator Bar */}
          <div className="pomodoro-cycle-bar">
            <div className="cycle-info">
              <span className="cycle-label">
                <Repeat size={13} className="cycle-icon" />
                <b>Round {currentCycle} of {totalCycles}</b>
              </span>
              <div className="cycle-dots" aria-label={`Cycle progress: ${currentCycle} of ${totalCycles}`}>
                {Array.from({ length: totalCycles }).map((_, idx) => {
                  const cycleNum = idx + 1
                  const isDone = cycleNum < currentCycle
                  const isCurrent = cycleNum === currentCycle
                  return (
                    <span
                      key={idx}
                      className={`cycle-dot ${isDone ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
                      title={`Round ${cycleNum}`}
                    />
                  )
                })}
              </div>
            </div>

            <div className="cycle-actions">
              <span className="cycle-summary-tag">
                {completedCycles > 0 && <span>{completedCycles} full sets finished · </span>}
                {currentCycle >= totalCycles ? 'Next break: Long' : 'Next break: Short'}
              </span>
              <button
                type="button"
                className="cycle-reset-btn"
                onClick={resetCycle}
                title="Restart cycle from round 1"
                aria-label="Restart cycle from round 1"
              >
                Reset loop
              </button>
            </div>
          </div>

          {/* Goal Input & Display Bar */}
          <div className="pomodoro-goal-bar">
            {isEditingGoal ? (
              <form onSubmit={handleGoalSubmit} className="pomodoro-goal-form">
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="What are you focusing on?"
                  maxLength={100}
                  autoFocus
                  className="pomodoro-goal-input"
                />
                <button type="submit" className="goal-action-btn primary">
                  Save
                </button>
                <button
                  type="button"
                  className="goal-action-btn secondary"
                  onClick={() => {
                    setGoalInput(goal)
                    setIsEditingGoal(false)
                  }}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="pomodoro-goal-display" onClick={() => setIsEditingGoal(true)}>
                <Target size={15} className="goal-icon" />
                <span className="goal-label">
                  {goal ? (
                    <strong>{goal}</strong>
                  ) : (
                    <span className="goal-placeholder">Set a study goal for this session... (click to edit)</span>
                  )}
                </span>
                <button
                  type="button"
                  className="goal-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsEditingGoal(true)
                  }}
                  aria-label="Edit goal"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Timer Display & Countdown */}
          <div className="pomodoro-countdown-wrap">
            <div
              className={`pomodoro-time-display ${mode}`}
              aria-label={`Time remaining: ${formatTime(timeLeft)}`}
            >
              {formatTime(timeLeft)}
            </div>

            {/* Status Subtitle */}
            <div className="pomodoro-status-text">
              {isRunning && (
                <span className="status-badge running">
                  <span className="pulse-dot" />
                  {mode === 'focus'
                    ? `Focusing (Round ${currentCycle}/${totalCycles})...`
                    : mode === 'longBreak'
                    ? 'Long break – reward yourself!'
                    : 'Short break – rest your eyes'}
                </span>
              )}
              {isPaused && (
                <span className="status-badge paused">
                  Paused ({formatTime(timeLeft)} remaining)
                </span>
              )}
              {!isRunning && !isPaused && (
                <span className="status-badge idle">
                  Ready to start {mode === 'focus' ? `${settings.focusDuration}-min focus` : 'break'}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="pomodoro-progress-track" aria-hidden="true">
              <div
                className={`pomodoro-progress-bar ${mode}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="pomodoro-progress-stats">
              <span>{progressPercent}% completed</span>
              <span>{formatTime(Math.max(0, totalTime - timeLeft))} elapsed</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="pomodoro-controls">
            {!isRunning && !isPaused && (
              <button
                type="button"
                className="pomodoro-action-btn start-btn"
                onClick={start}
                aria-label={`Start ${mode === 'focus' ? 'Focus' : 'Break'}`}
              >
                <Play size={18} />
                <span>Start {mode === 'focus' ? 'Focus' : 'Break'}</span>
              </button>
            )}

            {isRunning && (
              <button
                type="button"
                className="pomodoro-action-btn pause-btn"
                onClick={pause}
                aria-label="Pause"
              >
                <Pause size={18} />
                <span>Pause</span>
              </button>
            )}

            {isPaused && (
              <button
                type="button"
                className="pomodoro-action-btn resume-btn"
                onClick={resume}
                aria-label="Resume"
              >
                <Play size={18} />
                <span>Resume</span>
              </button>
            )}

            {/* Reset button */}
            <button
              type="button"
              className="pomodoro-action-btn secondary-btn"
              onClick={reset}
              aria-label="Reset timer"
              title="Reset session"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>

            {/* Skip Break action */}
            {isBreak && (
              <button
                type="button"
                className="pomodoro-action-btn secondary-btn"
                onClick={skipBreak}
                aria-label="Skip Break"
                title="Skip break and start next focus round"
              >
                <SkipForward size={16} />
                <span>Skip Break</span>
              </button>
            )}

            {/* End Session action */}
            {mode === 'focus' && (isRunning || isPaused) && (
              <button
                type="button"
                className="pomodoro-action-btn secondary-btn"
                onClick={endSession}
                aria-label="End Session"
                title="End current session early"
              >
                <StopCircle size={16} />
                <span>End Session</span>
              </button>
            )}

            {/* Settings button */}
            <button
              type="button"
              className="pomodoro-icon-btn"
              onClick={openSettings}
              aria-label="Timer settings"
              title={isAuthenticated ? 'Configure timer settings' : 'Sign in to customize timer settings'}
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Quick Settings Meta Footer */}
          <div className="pomodoro-timer-meta">
            <span>
              {settings.soundEnabled ? (
                <Volume2 size={13} className="meta-icon" />
              ) : (
                <VolumeX size={13} className="meta-icon" />
              )}
              Sound: {settings.soundEnabled ? 'On' : 'Off'}
            </span>
            <span className="dot-divider">·</span>
            <span>Loop: {totalCycles} rounds/set</span>
            <span className="dot-divider">·</span>
            <span>Auto-break: {settings.autoStartBreak ? 'On' : 'Off'}</span>
            <span className="dot-divider">·</span>
            <button
              type="button"
              className="meta-link"
              onClick={openSettings}
            >
              Customize loop & times
            </button>
          </div>
        </div>

        {/* BOTTOM ROW: 3 Symmetrical Companion Cards */}
        <div className="pomodoro-bottom-grid">
          {/* Card 1: Today's Focus Stats */}
          <div className="pomodoro-card">
            <div className="card-topline">
              <span className="summary-eyebrow">
                <Flame size={14} className="eyebrow-icon orange" />
                TODAY'S STATS
              </span>
              <span className="storage-badge" title="Saved locally in your browser">
                Local device
              </span>
            </div>

            <div className="summary-stats-grid">
              <div className="summary-stat-box">
                <span className="stat-number">{stats.focusMinutesToday}</span>
                <span className="stat-label">Focus Mins</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-number">{stats.sessionsToday}</span>
                <span className="stat-label">Sessions</span>
              </div>
              <div className="summary-stat-box">
                <span className="stat-number">{completedCycles}</span>
                <span className="stat-label">Full Loops</span>
              </div>
            </div>

            {goal && (
              <div className="current-goal-preview">
                <span className="goal-preview-label">Target:</span>
                <p className="goal-preview-text">"{goal}"</p>
              </div>
            )}
          </div>

          {/* Card 2: Live Accountability & Focus Rooms */}
          <div className="pomodoro-card accountability-card-accent">
            <div className="accountability-header">
              <span className="accountability-tag">
                <Users size={13} /> Live Accountability
              </span>
              <h3>Study with Friends</h3>
              <p>
                Synchronize timers with classmates, see who's studying, and keep each other accountable.
              </p>
            </div>

            <div className="accountability-actions">
              <button
                type="button"
                className="pomodoro-btn-primary full-width"
                onClick={() => handleOpenAccountModal('Join a Focus Room')}
              >
                <Users size={15} /> Join a Focus Room
              </button>
              <button
                type="button"
                className="pomodoro-btn-secondary full-width"
                onClick={() => handleOpenAccountModal('Create a Focus Room')}
              >
                Create a Focus Room
              </button>
            </div>

            <small className="accountability-note">
              <Info size={12} />
              Requires free NexusStudy account for multi-user sync. Personal timer works without login.
            </small>
          </div>

          {/* Card 3: Local Session History */}
          <div className="pomodoro-card">
            <div className="history-header">
              <div className="history-title-wrap">
                <Clock size={15} />
                <h4>Recent Sprints</h4>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  className="clear-history-btn"
                  onClick={() => setShowHistoryConfirm(true)}
                >
                  <Trash2 size={13} /> Clear
                </button>
              )}
            </div>

            {showHistoryConfirm && (
              <div className="history-confirm-box">
                <span>Clear local history?</span>
                <div className="confirm-btns">
                  <button
                    type="button"
                    className="confirm-yes"
                    onClick={handleClearHistory}
                  >
                    Yes, clear
                  </button>
                  <button
                    type="button"
                    className="confirm-no"
                    onClick={() => setShowHistoryConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {history.length === 0 ? (
              <div className="history-empty">
                <p>No completed sprints yet. Start your first session above!</p>
              </div>
            ) : (
              <ul className="history-list">
                {history.slice(0, 3).map((item) => (
                  <li key={item.id} className="history-item">
                    <div className="history-item-left">
                      <CheckCircle2 size={14} className="history-check" />
                      <div>
                        <strong>{item.durationMinutes}m Focus</strong>
                        {item.goal && <small className="history-goal">"{item.goal}"</small>}
                      </div>
                    </div>
                    <span className="history-time">{formatHistoryTimestamp(item.completedAt)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="history-footer-disclaimer">
              <span>
                💾 Stored in localStorage. Clearing cache resets history.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <PomodoroSettingsModal
        isOpen={isSettingsOpen && isAuthenticated}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={updateSettings}
        onReset={resetSettings}
        onTestSound={testSound}
        canCustomizeDurations={isAuthenticated}
      />

      {/* Account Required Modal */}
      <AccountRequiredModal
        isOpen={Boolean(accountModalAction)}
        onClose={() => setAccountModalAction(null)}
        actionTitle={accountModalAction || 'Focus Rooms'}
      />
    </section>,
    document.body
  )
}
