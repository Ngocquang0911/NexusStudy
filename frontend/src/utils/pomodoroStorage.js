export const POMODORO_SETTINGS_KEY = 'nexus_pomodoro_settings'
export const POMODORO_STATE_KEY = 'nexus_pomodoro_state'
export const POMODORO_HISTORY_KEY = 'nexus_pomodoro_history'
export const POMODORO_COMPLETED_IDS_KEY = 'nexus_pomodoro_completed_ids'
export const POMODORO_CYCLE_KEY = 'nexus_pomodoro_cycle'

export const DEFAULT_SETTINGS = {
  focusDuration: 25, // in minutes
  shortBreakDuration: 5,
  longBreakDuration: 15,
  cyclesPerRound: 4, // Số vòng lặp mỗi chu kỳ
  autoStartBreak: false,
  autoStartFocus: false, // Tự động bắt đầu vòng focus tiếp theo
  soundEnabled: true,
}

export function getPomodoroSettings() {
  try {
    const raw = localStorage.getItem(POMODORO_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw)
    return {
      focusDuration: Number.isInteger(parsed.focusDuration) && parsed.focusDuration > 0 ? parsed.focusDuration : DEFAULT_SETTINGS.focusDuration,
      shortBreakDuration: Number.isInteger(parsed.shortBreakDuration) && parsed.shortBreakDuration > 0 ? parsed.shortBreakDuration : DEFAULT_SETTINGS.shortBreakDuration,
      longBreakDuration: Number.isInteger(parsed.longBreakDuration) && parsed.longBreakDuration > 0 ? parsed.longBreakDuration : DEFAULT_SETTINGS.longBreakDuration,
      cyclesPerRound: Number.isInteger(parsed.cyclesPerRound) && parsed.cyclesPerRound > 0 ? Math.min(12, Math.max(1, parsed.cyclesPerRound)) : DEFAULT_SETTINGS.cyclesPerRound,
      autoStartBreak: Boolean(parsed.autoStartBreak),
      autoStartFocus: Boolean(parsed.autoStartFocus),
      soundEnabled: parsed.soundEnabled !== false,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function savePomodoroSettings(settings) {
  try {
    const validated = {
      focusDuration: Math.max(1, Math.min(180, parseInt(settings.focusDuration, 10) || DEFAULT_SETTINGS.focusDuration)),
      shortBreakDuration: Math.max(1, Math.min(60, parseInt(settings.shortBreakDuration, 10) || DEFAULT_SETTINGS.shortBreakDuration)),
      longBreakDuration: Math.max(1, Math.min(60, parseInt(settings.longBreakDuration, 10) || DEFAULT_SETTINGS.longBreakDuration)),
      cyclesPerRound: Math.max(1, Math.min(12, parseInt(settings.cyclesPerRound, 10) || DEFAULT_SETTINGS.cyclesPerRound)),
      autoStartBreak: Boolean(settings.autoStartBreak),
      autoStartFocus: Boolean(settings.autoStartFocus),
      soundEnabled: Boolean(settings.soundEnabled),
    }
    localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(validated))
    return validated
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function getPomodoroCycle() {
  try {
    const raw = localStorage.getItem(POMODORO_CYCLE_KEY)
    if (!raw) return { currentCycle: 1, completedCycles: 0 }
    const parsed = JSON.parse(raw)
    return {
      currentCycle: Number.isInteger(parsed.currentCycle) && parsed.currentCycle >= 1 ? parsed.currentCycle : 1,
      completedCycles: Number.isInteger(parsed.completedCycles) && parsed.completedCycles >= 0 ? parsed.completedCycles : 0,
    }
  } catch {
    return { currentCycle: 1, completedCycles: 0 }
  }
}

export function savePomodoroCycle(data) {
  try {
    const cycleData = {
      currentCycle: Math.max(1, parseInt(data.currentCycle, 10) || 1),
      completedCycles: Math.max(0, parseInt(data.completedCycles, 10) || 0),
    }
    localStorage.setItem(POMODORO_CYCLE_KEY, JSON.stringify(cycleData))
    return cycleData
  } catch {
    return { currentCycle: 1, completedCycles: 0 }
  }
}

export function clearPomodoroCycle() {
  try {
    localStorage.removeItem(POMODORO_CYCLE_KEY)
  } catch {
    // Ignore
  }
}

export function getPomodoroState() {
  try {
    const raw = localStorage.getItem(POMODORO_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function savePomodoroState(state) {
  try {
    if (!state) {
      localStorage.removeItem(POMODORO_STATE_KEY)
      return
    }
    localStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(state))
  } catch {
    // Graceful error handling for storage limits
  }
}

export function clearPomodoroState() {
  try {
    localStorage.removeItem(POMODORO_STATE_KEY)
  } catch {
    // Ignore
  }
}

export function getPomodoroHistory() {
  try {
    const raw = localStorage.getItem(POMODORO_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getCompletedSessionIds() {
  try {
    const raw = localStorage.getItem(POMODORO_COMPLETED_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function isSessionCompleted(sessionId) {
  if (!sessionId) return false
  const ids = getCompletedSessionIds()
  return ids.includes(sessionId)
}

export function recordCompletedSession(session) {
  try {
    if (!session || !session.id) return getPomodoroHistory()

    const completedIds = getCompletedSessionIds()
    if (completedIds.includes(session.id)) {
      // Idempotency: session already recorded, do not duplicate!
      return getPomodoroHistory()
    }

    const history = getPomodoroHistory()
    const newSession = {
      id: session.id,
      mode: session.mode || 'focus',
      durationMinutes: Math.max(1, Math.round(session.durationMinutes || 25)),
      goal: session.goal ? String(session.goal).trim() : '',
      completedAt: session.completedAt || Date.now(),
    }

    // Keep up to 100 most recent sessions
    const updatedHistory = [newSession, ...history].slice(0, 100)
    localStorage.setItem(POMODORO_HISTORY_KEY, JSON.stringify(updatedHistory))

    const updatedIds = [session.id, ...completedIds].slice(0, 200)
    localStorage.setItem(POMODORO_COMPLETED_IDS_KEY, JSON.stringify(updatedIds))

    return updatedHistory
  } catch {
    return getPomodoroHistory()
  }
}

export function clearPomodoroHistory() {
  try {
    localStorage.removeItem(POMODORO_HISTORY_KEY)
    localStorage.removeItem(POMODORO_COMPLETED_IDS_KEY)
  } catch {
    // Ignore
  }
}

export function calculatePomodoroStats(history, cyclesPerRound = 4) {
  const list = Array.isArray(history) ? history : []
  const todayStr = new Date().toDateString()

  let sessionsToday = 0
  let focusMinutesToday = 0
  let totalSessions = 0

  for (const item of list) {
    if (item.mode === 'focus') {
      totalSessions += 1
      const itemDate = new Date(item.completedAt).toDateString()
      if (itemDate === todayStr) {
        sessionsToday += 1
        focusMinutesToday += item.durationMinutes || 0
      }
    }
  }

  const cycleInfo = getPomodoroCycle()
  const completedCycles = Math.max(cycleInfo.completedCycles, Math.floor(totalSessions / Math.max(1, cyclesPerRound)))

  return {
    sessionsToday,
    focusMinutesToday,
    totalSessions,
    completedCycles,
  }
}

