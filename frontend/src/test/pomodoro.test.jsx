import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'
import { AuthContext } from '../context/AuthContext.jsx'
import LivePomodoroSection from '../components/pomodoro/LivePomodoroSection.jsx'
import {
  DEFAULT_SETTINGS,
  getPomodoroSettings,
  savePomodoroSettings,
  getPomodoroState,
  savePomodoroState,
  recordCompletedSession,
  getPomodoroHistory,
  clearPomodoroHistory,
  calculatePomodoroStats,
  POMODORO_SETTINGS_KEY,
  POMODORO_STATE_KEY,
  POMODORO_HISTORY_KEY,
  POMODORO_COMPLETED_IDS_KEY,
} from '../utils/pomodoroStorage.js'

function renderAuthenticatedPomodoro() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ isAuthenticated: true }}>
        <LivePomodoroSection />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('Pomodoro Storage & Real Timestamp Utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  afterEach(() => {
    localStorage.clear()
  })

  test('loads default settings when localStorage is empty', () => {
    const settings = getPomodoroSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings.focusDuration).toBe(25)
    expect(settings.shortBreakDuration).toBe(5)
    expect(settings.longBreakDuration).toBe(15)
  })

  test('saves and retrieves customized settings', () => {
    savePomodoroSettings({
      focusDuration: 50,
      shortBreakDuration: 10,
      longBreakDuration: 20,
      autoStartBreak: true,
      soundEnabled: false,
    })

    const loaded = getPomodoroSettings()
    expect(loaded.focusDuration).toBe(50)
    expect(loaded.shortBreakDuration).toBe(10)
    expect(loaded.longBreakDuration).toBe(20)
    expect(loaded.autoStartBreak).toBe(true)
    expect(loaded.soundEnabled).toBe(false)
  })

  test('ensures idempotency when recording completed sessions (no duplicates)', () => {
    const session = {
      id: 'session-unique-123',
      mode: 'focus',
      durationMinutes: 25,
      goal: 'Study Biology',
      completedAt: Date.now(),
    }

    // First record
    const history1 = recordCompletedSession(session)
    expect(history1.length).toBe(1)

    // Attempt duplicate record with same ID
    const history2 = recordCompletedSession(session)
    expect(history2.length).toBe(1) // Still 1, NOT duplicated!
  })

  test('calculates correct daily and total stats from session history', () => {
    const now = Date.now()
    const history = [
      { id: '1', mode: 'focus', durationMinutes: 25, completedAt: now },
      { id: '2', mode: 'focus', durationMinutes: 30, completedAt: now },
      { id: '3', mode: 'shortBreak', durationMinutes: 5, completedAt: now },
      // Yesterday's session
      { id: '4', mode: 'focus', durationMinutes: 45, completedAt: now - 86400000 * 2 },
    ]

    const stats = calculatePomodoroStats(history)
    expect(stats.totalSessions).toBe(3) // 3 focus sessions in total
    expect(stats.sessionsToday).toBe(2) // 2 today
    expect(stats.focusMinutesToday).toBe(55) // 25 + 30
  })

  test('clears local history and completed session ids', () => {
    recordCompletedSession({ id: 's1', mode: 'focus', durationMinutes: 25 })
    expect(getPomodoroHistory().length).toBe(1)

    clearPomodoroHistory()
    expect(getPomodoroHistory()).toEqual([])
    expect(localStorage.getItem(POMODORO_HISTORY_KEY)).toBeNull()
    expect(localStorage.getItem(POMODORO_COMPLETED_IDS_KEY)).toBeNull()
  })

  test('saves and recovers timer state based on targetEndTime timestamp', () => {
    const targetEnd = Date.now() + 600 * 1000 // 10 minutes from now
    savePomodoroState({
      mode: 'focus',
      isRunning: true,
      isPaused: false,
      targetEndTime: targetEnd,
      totalTime: 1500,
      sessionId: 'session-persist-456',
      goal: 'Write essay',
    })

    const retrieved = getPomodoroState()
    expect(retrieved.mode).toBe('focus')
    expect(retrieved.isRunning).toBe(true)
    expect(retrieved.targetEndTime).toBe(targetEnd)

    // Calculate remaining seconds directly from timestamp
    const remaining = Math.round((retrieved.targetEndTime - Date.now()) / 1000)
    expect(remaining).toBeGreaterThan(590)
    expect(remaining).toBeLessThanOrEqual(600)
  })
})

describe('LivePomodoroSection Component (Guest Unauthenticated Experience)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    localStorage.clear()
  })

  test('renders full personal Pomodoro timer on homepage with no login required', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Title and badge
    expect(screen.getByText('Live Pomodoro')).toBeInTheDocument()
    expect(screen.getByText(/Personal Focus/i)).toBeInTheDocument()

    // Default 25:00 countdown display
    expect(screen.getByText('25:00')).toBeInTheDocument()

    // Cycle / Loop indicator
    expect(screen.getByText(/Round 1 of 4/i)).toBeInTheDocument()

    // Mode tabs
    expect(screen.getByRole('tab', { name: /Focus/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Short Break/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Long Break/i })).toBeInTheDocument()

    // Controls
    expect(screen.getByRole('button', { name: /Start Focus/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument()

    // Accountability buttons
    expect(screen.getByRole('button', { name: /Join a Focus Room/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a Focus Room/i })).toBeInTheDocument()
  })

  test('keeps the panel hidden until opened', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection isOpen={false} />
      </MemoryRouter>
    )

    expect(document.getElementById('pomodoro')).toHaveAttribute('hidden')
  })

  test('keeps the Pomodoro panel compact with auxiliary sections collapsed', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    const panel = document.getElementById('pomodoro')
    expect(panel).toHaveClass('is-compact')
    expect(screen.queryByRole('button', { name: 'Expand Pomodoro' })).not.toBeInTheDocument()
    expect(screen.getByText("TODAY'S STATS")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Recent Sprints' })).toBeInTheDocument()
  })

  test('moves the panel when its drag handle is dragged', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    const panel = document.getElementById('pomodoro')
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 100,
      right: 400,
      bottom: 500,
      width: 300,
      height: 400,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    })

    const pointerDown = new Event('pointerdown', { bubbles: true })
    Object.defineProperties(pointerDown, {
      button: { value: 0 },
      clientX: { value: 120 },
      clientY: { value: 120 },
    })
    fireEvent(screen.getByLabelText('Drag to move Pomodoro panel'), pointerDown)

    const pointerMove = new Event('pointermove')
    Object.defineProperties(pointerMove, {
      clientX: { value: 220 },
      clientY: { value: 270 },
    })
    fireEvent(window, pointerMove)

    expect(panel.style.left).toBe('200px')
    expect(panel.style.top).toBe('250px')

    fireEvent(window, new Event('pointerup'))
  })

  test('fades while scrolling and closes with Escape', () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <LivePomodoroSection isOpen onClose={onClose} />
      </MemoryRouter>
    )

    const panel = document.getElementById('pomodoro')
    fireEvent.scroll(window)
    expect(panel).toHaveClass('is-scrolling')

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(panel).not.toHaveClass('is-scrolling')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('starts, pauses, and resumes timer correctly', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    const startBtn = screen.getByRole('button', { name: /Start Focus/i })
    fireEvent.click(startBtn)

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByText('24:55')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument()

    // Pause
    const pauseBtn = screen.getByRole('button', { name: /Pause/i })
    fireEvent.click(pauseBtn)

    expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument()

    // Time does not decrease while paused
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('24:55')).toBeInTheDocument()

    // Resume
    const resumeBtn = screen.getByRole('button', { name: /Resume/i })
    fireEvent.click(resumeBtn)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('24:50')).toBeInTheDocument()
  })

  test('resets the timer back to mode duration', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Focus/i }))

    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(screen.getByText('24:50')).toBeInTheDocument()

    // Reset
    fireEvent.click(screen.getByRole('button', { name: /Reset/i }))
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Focus/i })).toBeInTheDocument()
  })

  test('switches modes between Focus, Short Break, and Long Break', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Switch to Short Break (5m)
    fireEvent.click(screen.getByRole('tab', { name: /Short Break/i }))
    expect(screen.getByText('05:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Break/i })).toBeInTheDocument()

    // Switch to Long Break (15m)
    fireEvent.click(screen.getByRole('tab', { name: /Long Break/i }))
    expect(screen.getByText('15:00')).toBeInTheDocument()

    // Switch back to Focus
    fireEvent.click(screen.getByRole('tab', { name: /Focus/i }))
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  test('allows entering, saving, and editing a study goal', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Click on goal placeholder
    fireEvent.click(screen.getByText(/Set a study goal/i))

    const input = screen.getByPlaceholderText(/What are you focusing on/i)
    fireEvent.change(input, { target: { value: 'Organic Chemistry Midterm' } })
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))

    expect(screen.getByText('Organic Chemistry Midterm')).toBeInTheDocument()
  })

  test('recovers running timer state using wall-clock timestamp on page refresh', () => {
    // Simulate a saved running state: 10 minutes remaining
    const remainingSeconds = 600
    const targetEnd = Date.now() + remainingSeconds * 1000

    localStorage.setItem(
      POMODORO_STATE_KEY,
      JSON.stringify({
        mode: 'focus',
        isRunning: true,
        isPaused: false,
        totalTime: 1500,
        targetEndTime: targetEnd,
        sessionId: 'session-refresh-test',
        goal: 'Calculus III practice',
        startedAt: Date.now() - 900 * 1000,
      })
    )

    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Expect ~10:00 recovered
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('Calculus III practice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument()

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('09:55')).toBeInTheDocument()
  })

  test('opens Account Required Modal when guest clicks Join or Create Focus Room', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Click "Join a Focus Room"
    fireEvent.click(screen.getByRole('button', { name: /Join a Focus Room/i }))

    // Modal opens
    expect(screen.getByText(/Account required for Join a Focus Room/i)).toBeInTheDocument()
    expect(screen.getByText(/Personal Pomodoro is 100% free/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create free student account/i })).toHaveAttribute('href', '/register')
    expect(screen.getByRole('link', { name: /Already have an account\? Log in/i })).toHaveAttribute('href', '/login')

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Continue with Personal Pomodoro/i }))
    expect(screen.queryByText(/Account required for Join a Focus Room/i)).not.toBeInTheDocument()

    // Personal timer remains intact!
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  test('customizes durations in settings and saves to localStorage', () => {
    renderAuthenticatedPomodoro()

    // Open Settings
    fireEvent.click(screen.getByRole('button', { name: /Timer settings/i }))
    expect(screen.getByText(/Timer & Loop Settings/i)).toBeInTheDocument()

    // Change focus duration to 45
    const focusInput = screen.getByLabelText(/Focus \(minutes\)/i)
    fireEvent.change(focusInput, { target: { value: '45' } })

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    // Modal closes and display updates to 45:00
    expect(screen.queryByText(/Timer & Loop Settings/i)).not.toBeInTheDocument()
    expect(screen.getByText('45:00')).toBeInTheDocument()

    // Settings persisted
    const saved = getPomodoroSettings()
    expect(saved.focusDuration).toBe(45)
  })

  test('locks all guest settings and prompts account creation', () => {
    savePomodoroSettings({
      focusDuration: 45,
      shortBreakDuration: 10,
      longBreakDuration: 30,
      soundEnabled: true,
    })

    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    expect(screen.getByText('25:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Timer settings/i }))

    expect(screen.getByText(/customize focus and break times, cycles, or automatic timer behavior/i)).toBeInTheDocument()
    expect(screen.queryByText(/Timer & Loop Settings/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Focus \(minutes\)/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Cycles per round/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create free student account/i })).toHaveAttribute('href', '/register')

    fireEvent.click(screen.getByRole('button', { name: /Continue with Personal Pomodoro/i }))
    expect(getPomodoroSettings().focusDuration).toBe(45)
    expect(getPomodoroSettings().shortBreakDuration).toBe(10)
    expect(getPomodoroSettings().longBreakDuration).toBe(30)
    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  test('does not resume a saved custom-duration timer for a guest', () => {
    savePomodoroState({
      mode: 'focus',
      isRunning: true,
      isPaused: false,
      totalTime: 45 * 60,
      remainingSeconds: 30 * 60,
      targetEndTime: Date.now() + 30 * 60 * 1000,
    })

    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Focus/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pause/i })).not.toBeInTheDocument()
  })

  test('allows configuring cycles per round and updates loop indicators', () => {
    renderAuthenticatedPomodoro()

    // Open settings
    fireEvent.click(screen.getByRole('button', { name: /Timer settings/i }))

    // Change cycles per round to 6
    const cycleInput = screen.getByLabelText(/Cycles per round/i)
    fireEvent.change(cycleInput, { target: { value: '6' } })

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }))

    // Now shows Round 1 of 6
    expect(screen.getByText(/Round 1 of 6/i)).toBeInTheDocument()
    const saved = getPomodoroSettings()
    expect(saved.cyclesPerRound).toBe(6)
  })

  test('advances loop round when break is skipped and allows reset loop', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    expect(screen.getByText(/Round 1 of 4/i)).toBeInTheDocument()

    // Switch to short break
    fireEvent.click(screen.getByRole('tab', { name: /Short Break/i }))

    // Skip break
    fireEvent.click(screen.getByRole('button', { name: /Skip Break/i }))

    // Now in Round 2 of 4!
    expect(screen.getByText(/Round 2 of 4/i)).toBeInTheDocument()

    // Click Reset Loop
    fireEvent.click(screen.getByRole('button', { name: /Restart cycle from round 1/i }))

    // Reset back to Round 1 of 4!
    expect(screen.getByText(/Round 1 of 4/i)).toBeInTheDocument()
  })

  test('skips break mode and returns to focus timer', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Switch to Short Break
    fireEvent.click(screen.getByRole('tab', { name: /Short Break/i }))
    expect(screen.getByText('05:00')).toBeInTheDocument()

    // Start break
    fireEvent.click(screen.getByRole('button', { name: /Start Break/i }))
    expect(screen.getByRole('button', { name: /Skip Break/i })).toBeInTheDocument()

    // Click Skip Break
    fireEvent.click(screen.getByRole('button', { name: /Skip Break/i }))

    // Returned to Focus mode (25:00)
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Focus/i })).toBeInTheDocument()
  })

  test('ends session early and transitions appropriately', () => {
    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    // Start focus session
    fireEvent.click(screen.getByRole('button', { name: /Start Focus/i }))

    // Advance 65 seconds
    act(() => {
      vi.advanceTimersByTime(65000)
    })

    // Click End Session
    const endBtn = screen.getByRole('button', { name: /End Session/i })
    fireEvent.click(endBtn)

    // Transitions to short break mode (05:00)
    expect(screen.getByText('05:00')).toBeInTheDocument()
    // Session recorded in history
    expect(screen.getByText(/1m Focus/i)).toBeInTheDocument()
  })

  test('completes a session and displays completion banner', () => {
    // Set 1 minute focus for quick completion test
    savePomodoroSettings({ focusDuration: 1, shortBreakDuration: 5, longBreakDuration: 15, autoStartBreak: false, soundEnabled: false })

    renderAuthenticatedPomodoro()

    // Start 1m session
    fireEvent.click(screen.getByRole('button', { name: /Start Focus/i }))

    // Advance 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000)
    })

    // Completion banner appears
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Session completed! Great focus\./i)).toBeInTheDocument()

    // Dismiss banner
    fireEvent.click(screen.getByRole('button', { name: /Dismiss completion alert/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('clears local history via confirmation dialog', () => {
    recordCompletedSession({ id: 'hist-1', mode: 'focus', durationMinutes: 25, goal: 'Math', completedAt: Date.now() })

    render(
      <MemoryRouter>
        <LivePomodoroSection />
      </MemoryRouter>
    )

    expect(screen.getByText(/25m Focus/i)).toBeInTheDocument()

    // Click Clear button
    fireEvent.click(screen.getByRole('button', { name: /Clear/i }))
    expect(screen.getByText(/Clear local.*history\?/i)).toBeInTheDocument()

    // Confirm clear
    fireEvent.click(screen.getByRole('button', { name: /Yes, clear/i }))

    // History is now empty
    expect(screen.getByText(/No completed sprints yet/i)).toBeInTheDocument()
  })
})
