import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar.jsx'
import Topbar from '../components/layout/Topbar.jsx'
import LivePomodoroSection from '../components/pomodoro/LivePomodoroSection.jsx'
import useAuth from '../hooks/useAuth.js'
import { useTheme } from '../context/ThemeContext.jsx'
import './app-shell.css'
import './user-pages.css'
import './mobile.css'
import './dark-mode.css'

export default function AppLayout() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pomodoroOpen, setPomodoroOpen] = useState(false)
  useEffect(() => {
    // Warm workspace routes after the shell renders, so switching tabs avoids a loading flash.
    const preload = () => { void Promise.allSettled([import('../pages/workspace/WorkspaceDetailPage.jsx'), import('../pages/task/TaskPage.jsx'), import('../pages/chat/ChatPage.jsx'), import('../pages/poll/PollPage.jsx'), import('../pages/document/DocumentsPage.jsx'), import('../pages/evaluation/EvaluationPage.jsx'), import('../pages/ai/AIAssistantPage.jsx')]) }
    const timer = window.setTimeout(preload, 500)
    return () => window.clearTimeout(timer)
  }, [])
  const isAdmin = user?.systemRole === 'ADMIN'

  return (
    <>
      <div className="app-shell">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} onToggleTheme={toggleTheme} />
        <div className="app-main">
          <Topbar
            theme={theme}
            onToggleTheme={toggleTheme}
            onMenu={() => setSidebarOpen(true)}
            onTogglePomodoro={() => setPomodoroOpen((open) => !open)}
            pomodoroOpen={pomodoroOpen}
          />
          <main className="page-content"><Outlet /></main>
        </div>
        {sidebarOpen && (
          <button
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation overlay"
          />
        )}
      </div>
      {!isAdmin && (
        <LivePomodoroSection isOpen={pomodoroOpen} onClose={() => setPomodoroOpen(false)} />
      )}
    </>
  )
}
