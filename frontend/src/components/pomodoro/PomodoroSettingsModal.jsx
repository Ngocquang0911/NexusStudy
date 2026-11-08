import { useState } from 'react'
import { ArrowRight, Lock, Repeat, RotateCcw, Volume2, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PomodoroSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onReset,
  onTestSound,
  canCustomizeDurations,
}) {
  const [focusDuration, setFocusDuration] = useState(settings.focusDuration)
  const [shortBreakDuration, setShortBreakDuration] = useState(settings.shortBreakDuration)
  const [longBreakDuration, setLongBreakDuration] = useState(settings.longBreakDuration)
  const [cyclesPerRound, setCyclesPerRound] = useState(settings.cyclesPerRound || 4)
  const [autoStartBreak, setAutoStartBreak] = useState(settings.autoStartBreak)
  const [autoStartFocus, setAutoStartFocus] = useState(settings.autoStartFocus)
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled)

  if (!isOpen) return null

  const handleSave = (e) => {
    e.preventDefault()
    onSave({
      focusDuration: Math.max(1, Math.min(180, Number(focusDuration) || 25)),
      shortBreakDuration: Math.max(1, Math.min(60, Number(shortBreakDuration) || 5)),
      longBreakDuration: Math.max(1, Math.min(60, Number(longBreakDuration) || 15)),
      cyclesPerRound: Math.max(1, Math.min(12, Number(cyclesPerRound) || 4)),
      autoStartBreak: Boolean(autoStartBreak),
      autoStartFocus: Boolean(autoStartFocus),
      soundEnabled: Boolean(soundEnabled),
    })
    onClose()
  }

  const handleResetDefaults = () => {
    onReset()
    setFocusDuration(25)
    setShortBreakDuration(5)
    setLongBreakDuration(15)
    setCyclesPerRound(4)
    setAutoStartBreak(false)
    setAutoStartFocus(false)
    setSoundEnabled(true)
  }

  return (
    <div
      className="pomodoro-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pomodoro-settings-title"
      onClick={onClose}
    >
      <div
        className="pomodoro-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pomodoro-modal-header">
          <h3 id="pomodoro-settings-title">Timer & Loop Settings</h3>
          <button
            type="button"
            className="pomodoro-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="pomodoro-settings-form">
          <div className="settings-section-heading">
            <span>SESSION DURATIONS (MINUTES)</span>
          </div>
          {!canCustomizeDurations && (
            <div className="pomodoro-settings-lock-notice">
              <Lock size={15} />
              <span>Sign in to customize focus and break durations. Guests can use the default timer.</span>
              <Link to="/register" onClick={onClose}>
                Create account <ArrowRight size={13} />
              </Link>
            </div>
          )}
          <div className="pomodoro-settings-grid">
            <label className="pomodoro-setting-field">
              <span>Focus (minutes)</span>
              <input
                type="number"
                min="1"
                max="180"
                value={focusDuration}
                onChange={(e) => setFocusDuration(e.target.value)}
                disabled={!canCustomizeDurations}
              />
            </label>

            <label className="pomodoro-setting-field">
              <span>Short Break (minutes)</span>
              <input
                type="number"
                min="1"
                max="60"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(e.target.value)}
                disabled={!canCustomizeDurations}
              />
            </label>

            <label className="pomodoro-setting-field">
              <span>Long Break (minutes)</span>
              <input
                type="number"
                min="1"
                max="60"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(e.target.value)}
                disabled={!canCustomizeDurations}
              />
            </label>
          </div>

          <div className="settings-section-heading">
            <span>CYCLE & LOOP SETTINGS</span>
          </div>
          <div className="pomodoro-cycle-config-row">
            <label className="pomodoro-setting-field full-width">
              <span className="field-with-icon">
                <Repeat size={14} /> Cycles per round (Số vòng lặp trước khi nghỉ dài)
              </span>
              <div className="cycle-input-wrap">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={cyclesPerRound}
                  onChange={(e) => setCyclesPerRound(e.target.value)}
                  className="cycle-number-input"
                />
                <small className="field-hint">Mỗi {cyclesPerRound} phiên tập trung sẽ có 1 lần nghỉ dài (Long Break).</small>
              </div>
            </label>
          </div>

          <div className="pomodoro-toggles-section">
            <label className="pomodoro-toggle-row">
              <input
                type="checkbox"
                checked={autoStartBreak}
                onChange={(e) => setAutoStartBreak(e.target.checked)}
              />
              <div className="toggle-text">
                <strong>Auto-start breaks (Tự động chuyển sang nghỉ)</strong>
                <small>Tự động đếm ngược giờ nghỉ khi phiên tập trung kết thúc</small>
              </div>
            </label>

            <label className="pomodoro-toggle-row">
              <input
                type="checkbox"
                checked={autoStartFocus}
                onChange={(e) => setAutoStartFocus(e.target.checked)}
              />
              <div className="toggle-text">
                <strong>Auto-advance loops (Tự động bắt đầu vòng tiếp theo)</strong>
                <small>Tự động bắt đầu phiên tập trung mới ngay sau khi hết giờ nghỉ</small>
              </div>
            </label>

            <label className="pomodoro-toggle-row">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
              />
              <div className="toggle-text">
                <strong>Sound notifications (Âm thanh thông báo)</strong>
                <small>Phát chuông báo êm dịu khi kết thúc phiên hoặc giờ nghỉ</small>
              </div>
            </label>
          </div>

          {soundEnabled && (
            <div className="pomodoro-test-sound-row">
              <button
                type="button"
                className="pomodoro-btn-outline"
                onClick={onTestSound}
              >
                <Volume2 size={15} /> Test Chime Sound
              </button>
            </div>
          )}

          <div className="pomodoro-modal-footer">
            <button
              type="button"
              className="pomodoro-btn-ghost"
              onClick={handleResetDefaults}
            >
              <RotateCcw size={14} /> Reset Defaults
            </button>
            <div className="pomodoro-footer-actions">
              <button
                type="button"
                className="pomodoro-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pomodoro-btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
