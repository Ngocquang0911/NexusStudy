import { useCallback, useEffect, useRef, useState } from 'react'
import useAuth from './useAuth.js'
import {
  calculatePomodoroStats,
  clearPomodoroCycle,
  clearPomodoroHistory as clearStorageHistory,
  clearPomodoroState,
  DEFAULT_SETTINGS,
  getPomodoroCycle,
  getPomodoroHistory,
  getPomodoroSettings,
  getPomodoroState,
  isSessionCompleted,
  recordCompletedSession,
  savePomodoroCycle,
  savePomodoroSettings,
  savePomodoroState,
} from '../utils/pomodoroStorage.js'
import { playPomodoroChime } from '../utils/pomodoroAudio.js'

function getDurationMinutes(mode, settings) {
  if (mode === 'shortBreak') return settings.shortBreakDuration
  if (mode === 'longBreak') return settings.longBreakDuration
  return settings.focusDuration
}

export default function usePomodoro() {
  const { isAuthenticated = false } = useAuth() || {}
  const getCurrentSettings = useCallback(() => {
    const storedSettings = getPomodoroSettings()
    return isAuthenticated
      ? storedSettings
      : {
          ...DEFAULT_SETTINGS,
          ...storedSettings,
          focusDuration: DEFAULT_SETTINGS.focusDuration,
          shortBreakDuration: DEFAULT_SETTINGS.shortBreakDuration,
          longBreakDuration: DEFAULT_SETTINGS.longBreakDuration,
        }
  }, [isAuthenticated])
  const [settings, setSettings] = useState(getCurrentSettings)
  const [mode, setMode] = useState('focus') // 'focus' | 'shortBreak' | 'longBreak'
  const [timeLeft, setTimeLeft] = useState(() => getDurationMinutes('focus', getCurrentSettings()) * 60)
  const [totalTime, setTotalTime] = useState(() => getDurationMinutes('focus', getCurrentSettings()) * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [goal, setGoal] = useState('')
  const [history, setHistory] = useState(() => getPomodoroHistory())
  const [cycleData, setCycleData] = useState(() => getPomodoroCycle())
  const [lastCompleted, setLastCompleted] = useState(null)

  const targetEndTimeRef = useRef(null)
  const sessionIdRef = useRef(null)
  const sessionStartedAtRef = useRef(null)
  const tickIntervalRef = useRef(null)

  const currentCycle = cycleData.currentCycle || 1
  const completedCycles = cycleData.completedCycles || 0
  const totalCycles = settings.cyclesPerRound || 4

  // Initialize from localStorage (recovery on refresh or tab reopen)
  useEffect(() => {
    const loadedSettings = getCurrentSettings()
    setSettings(loadedSettings)
    setHistory(getPomodoroHistory())
    setCycleData(getPomodoroCycle())

    const savedState = getPomodoroState()
    if (savedState) {
      const savedMode = savedState.mode || 'focus'
      const savedGoal = savedState.goal || ''
      setMode(savedMode)
      setGoal(savedGoal)

      const defaultModeDuration = getDurationMinutes(savedMode, loadedSettings) * 60
      if (
        !isAuthenticated &&
        savedState.totalTime > 0 &&
        savedState.totalTime !== defaultModeDuration
      ) {
        setTimeLeft(defaultModeDuration)
        setTotalTime(defaultModeDuration)
        setIsRunning(false)
        setIsPaused(false)
        clearPomodoroState()
        return
      }

      if (savedState.sessionId) {
        sessionIdRef.current = savedState.sessionId
      }
      if (savedState.startedAt) {
        sessionStartedAtRef.current = savedState.startedAt
      }

      const modeTotal = (savedState.totalTime && savedState.totalTime > 0)
        ? savedState.totalTime
        : defaultModeDuration
      setTotalTime(modeTotal)

      if (savedState.isRunning && savedState.targetEndTime) {
        const now = Date.now()
        const remaining = Math.round((savedState.targetEndTime - now) / 1000)

        if (remaining > 0) {
          // Timer was running and is still in progress
          targetEndTimeRef.current = savedState.targetEndTime
          setTimeLeft(remaining)
          setIsRunning(true)
          setIsPaused(false)
        } else {
          // Timer finished while visitor was away: silently record history, but DO NOT pop alert banner on initial load
          if (savedMode === 'focus' && savedState.sessionId && !isSessionCompleted(savedState.sessionId)) {
            const completedSession = {
              id: savedState.sessionId,
              mode: 'focus',
              durationMinutes: Math.round(modeTotal / 60),
              goal: savedGoal,
              completedAt: savedState.targetEndTime,
            }
            const updated = recordCompletedSession(completedSession)
            setHistory(updated)
          }

          // Transition to next mode
          const nextMode = savedMode === 'focus' ? 'shortBreak' : 'focus'
          const nextDuration = getDurationMinutes(nextMode, loadedSettings) * 60
          setMode(nextMode)
          setTimeLeft(nextDuration)
          setTotalTime(nextDuration)
          setIsRunning(false)
          setIsPaused(false)
          clearPomodoroState()
        }
      } else if (savedState.isPaused && typeof savedState.remainingSeconds === 'number') {
        // Recover paused timer state
        setTimeLeft(savedState.remainingSeconds)
        setIsRunning(false)
        setIsPaused(true)
      } else {
        setTimeLeft(defaultModeDuration)
        setIsRunning(false)
        setIsPaused(false)
      }
    }
  }, [getCurrentSettings, isAuthenticated])

  // Sync state to localStorage whenever core timer state changes
  const persistCurrentState = useCallback(
    (customOverrides = {}) => {
      const stateToSave = {
        mode,
        goal,
        isRunning,
        isPaused,
        totalTime,
        remainingSeconds: timeLeft,
        targetEndTime: targetEndTimeRef.current,
        sessionId: sessionIdRef.current,
        startedAt: sessionStartedAtRef.current,
        ...customOverrides,
      }
      savePomodoroState(stateToSave)
    },
    [mode, goal, isRunning, isPaused, totalTime, timeLeft]
  )

  // Complete session handler with Loop / Cycle logic
  const handleSessionComplete = useCallback(
    (finishedSessionId, finishedMode, finishedTotalTime, currentGoal) => {
      if (settings.soundEnabled) {
        playPomodoroChime()
      }

      let nextMode = 'focus'
      let shouldAutoStart = false
      let newCycle = currentCycle
      let newCompletedCycles = completedCycles

      if (finishedMode === 'focus') {
        // Record completed focus session
        if (finishedSessionId && !isSessionCompleted(finishedSessionId)) {
          const completedSession = {
            id: finishedSessionId,
            mode: 'focus',
            durationMinutes: Math.round(finishedTotalTime / 60),
            goal: currentGoal,
            completedAt: Date.now(),
          }
          const updated = recordCompletedSession(completedSession)
          setHistory(updated)
          setLastCompleted(completedSession)
        }

        // Determine next break mode based on cycle progress
        if (currentCycle >= totalCycles) {
          // Final round of the cycle reached -> LONG BREAK
          nextMode = 'longBreak'
        } else {
          // Standard round -> SHORT BREAK
          nextMode = 'shortBreak'
        }

        shouldAutoStart = Boolean(settings.autoStartBreak)
      } else if (finishedMode === 'shortBreak') {
        // Short break ended -> Advance to next cycle round
        newCycle = currentCycle + 1
        const updatedCycle = savePomodoroCycle({
          currentCycle: newCycle,
          completedCycles: newCompletedCycles,
        })
        setCycleData(updatedCycle)

        nextMode = 'focus'
        shouldAutoStart = Boolean(settings.autoStartFocus)
      } else if (finishedMode === 'longBreak') {
        // Long break ended -> Entire cycle completed!
        newCompletedCycles = completedCycles + 1
        newCycle = 1
        const updatedCycle = savePomodoroCycle({
          currentCycle: 1,
          completedCycles: newCompletedCycles,
        })
        setCycleData(updatedCycle)

        nextMode = 'focus'
        shouldAutoStart = Boolean(settings.autoStartFocus)
      }

      const nextDuration = getDurationMinutes(nextMode, settings) * 60

      if (shouldAutoStart) {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const newTargetEndTime = Date.now() + nextDuration * 1000
        sessionIdRef.current = newSessionId
        targetEndTimeRef.current = newTargetEndTime
        sessionStartedAtRef.current = Date.now()

        setMode(nextMode)
        setTimeLeft(nextDuration)
        setTotalTime(nextDuration)
        setIsRunning(true)
        setIsPaused(false)

        savePomodoroState({
          mode: nextMode,
          goal: currentGoal,
          isRunning: true,
          isPaused: false,
          totalTime: nextDuration,
          remainingSeconds: nextDuration,
          targetEndTime: newTargetEndTime,
          sessionId: newSessionId,
          startedAt: Date.now(),
        })
      } else {
        setMode(nextMode)
        setTimeLeft(nextDuration)
        setTotalTime(nextDuration)
        setIsRunning(false)
        setIsPaused(false)
        targetEndTimeRef.current = null
        sessionIdRef.current = null
        sessionStartedAtRef.current = null

        savePomodoroState({
          mode: nextMode,
          goal: currentGoal,
          isRunning: false,
          isPaused: false,
          totalTime: nextDuration,
          remainingSeconds: nextDuration,
          targetEndTime: null,
          sessionId: null,
        })
      }
    },
    [settings, currentCycle, completedCycles, totalCycles]
  )

  // Real wall-clock timer tick effect
  useEffect(() => {
    if (!isRunning) {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
      return
    }

    tickIntervalRef.current = setInterval(() => {
      if (!targetEndTimeRef.current) return

      const now = Date.now()
      const remaining = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000))
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
        handleSessionComplete(sessionIdRef.current, mode, totalTime, goal)
      }
    }, 250)

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current)
        tickIntervalRef.current = null
      }
    }
  }, [isRunning, mode, totalTime, goal, handleSessionComplete])

  // Timer controls
  const start = useCallback(() => {
    const sessionDuration = timeLeft > 0 ? timeLeft : getDurationMinutes(mode, settings) * 60
    const sid = sessionIdRef.current || `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const targetEnd = Date.now() + sessionDuration * 1000

    sessionIdRef.current = sid
    targetEndTimeRef.current = targetEnd
    sessionStartedAtRef.current = sessionStartedAtRef.current || Date.now()

    setIsRunning(true)
    setIsPaused(false)
    setTimeLeft(sessionDuration)

    savePomodoroState({
      mode,
      goal,
      isRunning: true,
      isPaused: false,
      totalTime,
      remainingSeconds: sessionDuration,
      targetEndTime: targetEnd,
      sessionId: sid,
      startedAt: sessionStartedAtRef.current,
    })
  }, [timeLeft, mode, settings, totalTime, goal])

  const pause = useCallback(() => {
    if (!isRunning) return
    const now = Date.now()
    const remaining = targetEndTimeRef.current ? Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000)) : timeLeft

    setIsRunning(false)
    setIsPaused(true)
    setTimeLeft(remaining)
    targetEndTimeRef.current = null

    savePomodoroState({
      mode,
      goal,
      isRunning: false,
      isPaused: true,
      totalTime,
      remainingSeconds: remaining,
      targetEndTime: null,
      sessionId: sessionIdRef.current,
      startedAt: sessionStartedAtRef.current,
    })
  }, [isRunning, timeLeft, mode, goal, totalTime])

  const resume = useCallback(() => {
    if (!isPaused && isRunning) return
    const remaining = timeLeft > 0 ? timeLeft : getDurationMinutes(mode, settings) * 60
    const targetEnd = Date.now() + remaining * 1000
    const sid = sessionIdRef.current || `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    sessionIdRef.current = sid
    targetEndTimeRef.current = targetEnd

    setIsRunning(true)
    setIsPaused(false)

    savePomodoroState({
      mode,
      goal,
      isRunning: true,
      isPaused: false,
      totalTime,
      remainingSeconds: remaining,
      targetEndTime: targetEnd,
      sessionId: sid,
      startedAt: sessionStartedAtRef.current,
    })
  }, [isPaused, isRunning, timeLeft, mode, settings, goal, totalTime])

  const reset = useCallback(() => {
    const duration = getDurationMinutes(mode, settings) * 60
    setIsRunning(false)
    setIsPaused(false)
    setTimeLeft(duration)
    setTotalTime(duration)
    targetEndTimeRef.current = null
    sessionIdRef.current = null
    sessionStartedAtRef.current = null

    savePomodoroState({
      mode,
      goal,
      isRunning: false,
      isPaused: false,
      totalTime: duration,
      remainingSeconds: duration,
      targetEndTime: null,
      sessionId: null,
      startedAt: null,
    })
  }, [mode, settings, goal])

  const skipBreak = useCallback(() => {
    // Advancing cycle if skipping a break
    if (mode === 'shortBreak') {
      const updatedCycle = savePomodoroCycle({
        currentCycle: currentCycle + 1,
        completedCycles,
      })
      setCycleData(updatedCycle)
    } else if (mode === 'longBreak') {
      const updatedCycle = savePomodoroCycle({
        currentCycle: 1,
        completedCycles: completedCycles + 1,
      })
      setCycleData(updatedCycle)
    }

    const duration = settings.focusDuration * 60
    setMode('focus')
    setTimeLeft(duration)
    setTotalTime(duration)
    setIsRunning(false)
    setIsPaused(false)
    targetEndTimeRef.current = null
    sessionIdRef.current = null
    sessionStartedAtRef.current = null

    savePomodoroState({
      mode: 'focus',
      goal,
      isRunning: false,
      isPaused: false,
      totalTime: duration,
      remainingSeconds: duration,
      targetEndTime: null,
      sessionId: null,
      startedAt: null,
    })
  }, [settings, goal, mode, currentCycle, completedCycles])

  const endSession = useCallback(() => {
    if (mode === 'focus') {
      const elapsedSeconds = totalTime - timeLeft
      if (elapsedSeconds >= 60 && sessionIdRef.current && !isSessionCompleted(sessionIdRef.current)) {
        const completedSession = {
          id: sessionIdRef.current,
          mode: 'focus',
          durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
          goal,
          completedAt: Date.now(),
        }
        const updated = recordCompletedSession(completedSession)
        setHistory(updated)
        setLastCompleted(completedSession)
      }

      // If at final round of cycle -> long break, else short break
      const nextBreakMode = currentCycle >= totalCycles ? 'longBreak' : 'shortBreak'
      const breakDuration = getDurationMinutes(nextBreakMode, settings) * 60
      setMode(nextBreakMode)
      setTimeLeft(breakDuration)
      setTotalTime(breakDuration)
    } else {
      // Ending break -> advance cycle and return to focus
      if (mode === 'shortBreak') {
        const updatedCycle = savePomodoroCycle({
          currentCycle: currentCycle + 1,
          completedCycles,
        })
        setCycleData(updatedCycle)
      } else {
        const updatedCycle = savePomodoroCycle({
          currentCycle: 1,
          completedCycles: completedCycles + 1,
        })
        setCycleData(updatedCycle)
      }

      const focusDuration = settings.focusDuration * 60
      setMode('focus')
      setTimeLeft(focusDuration)
      setTotalTime(focusDuration)
    }

    setIsRunning(false)
    setIsPaused(false)
    targetEndTimeRef.current = null
    sessionIdRef.current = null
    sessionStartedAtRef.current = null

    savePomodoroState({
      mode: mode === 'focus' ? (currentCycle >= totalCycles ? 'longBreak' : 'shortBreak') : 'focus',
      goal,
      isRunning: false,
      isPaused: false,
      targetEndTime: null,
      sessionId: null,
      startedAt: null,
    })
  }, [mode, totalTime, timeLeft, goal, settings, currentCycle, totalCycles, completedCycles])

  const switchMode = useCallback(
    (newMode) => {
      if (newMode === mode) return
      const duration = getDurationMinutes(newMode, settings) * 60
      setMode(newMode)
      setTimeLeft(duration)
      setTotalTime(duration)
      setIsRunning(false)
      setIsPaused(false)
      targetEndTimeRef.current = null
      sessionIdRef.current = null
      sessionStartedAtRef.current = null

      savePomodoroState({
        mode: newMode,
        goal,
        isRunning: false,
        isPaused: false,
        totalTime: duration,
        remainingSeconds: duration,
        targetEndTime: null,
        sessionId: null,
        startedAt: null,
      })
    },
    [mode, settings, goal]
  )

  const updateGoal = useCallback(
    (newGoal) => {
      setGoal(newGoal)
      persistCurrentState({ goal: newGoal })
    },
    [persistCurrentState]
  )

  const updateSettings = useCallback(
    (newSettings) => {
      if (!isAuthenticated) return

      const saved = savePomodoroSettings(newSettings)
      setSettings(saved)

      // If timer is not currently running or paused, update display to new duration
      if (!isRunning && !isPaused) {
        const newDuration = getDurationMinutes(mode, saved) * 60
        setTimeLeft(newDuration)
        setTotalTime(newDuration)
        persistCurrentState({
          totalTime: newDuration,
          remainingSeconds: newDuration,
        })
      }
    },
    [isAuthenticated, isRunning, isPaused, mode, persistCurrentState]
  )

  const resetSettings = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS)
  }, [updateSettings])

  const resetCycle = useCallback(() => {
    const updated = savePomodoroCycle({
      currentCycle: 1,
      completedCycles,
    })
    setCycleData(updated)
  }, [completedCycles])

  const clearHistory = useCallback(() => {
    clearStorageHistory()
    clearPomodoroCycle()
    setHistory([])
    setCycleData({ currentCycle: 1, completedCycles: 0 })
    setLastCompleted(null)
  }, [])

  const testSound = useCallback(() => {
    playPomodoroChime()
  }, [])

  const dismissLastCompleted = useCallback(() => {
    setLastCompleted(null)
  }, [])

  // Progress percentage (0 to 100)
  const progressPercent = totalTime > 0 ? Math.min(100, Math.max(0, Math.round(((totalTime - timeLeft) / totalTime) * 100))) : 0

  // Stats calculation
  const stats = calculatePomodoroStats(history, settings.cyclesPerRound || 4)

  return {
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
  }
}
