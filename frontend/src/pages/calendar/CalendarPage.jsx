import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listTasks } from '../../services/taskService.js'
import { listWorkspaces } from '../../services/workspaceService.js'
import { formatDate } from '../../utils/formatDate.js'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [workspaces, setWorkspaces] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch all tasks across user's workspaces
  const loadCalendarEvents = useCallback(async () => {
    setLoading(true)
    try {
      const wsRes = await listWorkspaces()
      const wsList = wsRes.data.data || []
      setWorkspaces(wsList)

      const taskPromises = wsList.map((ws) =>
        listTasks(ws._id)
          .then(({ data }) =>
            (data.data || []).map((t) => ({ ...t, workspaceName: ws.name }))
          )
          .catch(() => [])
      )

      const taskResults = await Promise.all(taskPromises)
      const mergedTasks = taskResults.flat()
      setAllTasks(mergedTasks)
    } catch (err) {
      console.error('Failed to load calendar tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCalendarEvents()
  }, [loadCalendarEvents])

  // Calendar Math
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    const now = new Date()
    setCurrentDate(now)
    setSelectedDate(now)
  }

  // Get tasks due on a specific YYYY-MM-DD
  const getTasksForDate = (dayNum) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    return allTasks.filter((t) => {
      if (!t.deadline) return false
      const tDate = new Date(t.deadline).toISOString().split('T')[0]
      return tDate === dateStr
    })
  }

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
  const selectedDayTasks = allTasks.filter((t) => {
    if (!t.deadline) return false
    return new Date(t.deadline).toISOString().split('T')[0] === selectedDateStr
  })

  return (
    <div className="calendar-page-container">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">SCHEDULE & DEADLINES</span>
          <h1>Academic Calendar</h1>
          <p>Track workspace project deadlines, task due dates, and evaluation milestones.</p>
        </div>

        <div className="page-actions-right">
          <button type="button" className="secondary-action text-xs" onClick={handleToday}>
            Today
          </button>
        </div>
      </div>

      {loading ? (
        <div className="route-loading" style={{ minHeight: '350px' }}>
          <LoaderCircle className="spin" size={24} /> Loading calendar deadlines...
        </div>
      ) : (
        <div className="calendar-main-grid">
          {/* Left: Interactive Month View Grid */}
          <div className="calendar-month-card surface-card">
            <div className="calendar-header-nav">
              <h2>{monthNames[month]} {year}</h2>
              <div className="calendar-nav-buttons">
                <button type="button" className="icon-action" onClick={handlePrevMonth} title="Previous Month">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="icon-action" onClick={handleNextMonth} title="Next Month">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="calendar-days-header-row">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Grid Cells */}
            <div className="calendar-dates-grid">
              {/* Blank offset padding cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`blank-${i}`} className="calendar-date-cell empty" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dayTasks = getTasksForDate(dayNum)
                const isSelected =
                  selectedDate.getDate() === dayNum &&
                  selectedDate.getMonth() === month &&
                  selectedDate.getFullYear() === year

                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`calendar-date-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${dayTasks.length > 0 ? 'has-events' : ''}`}
                    onClick={() => setSelectedDate(new Date(year, month, dayNum))}
                  >
                    <span className="date-number">{dayNum}</span>
                    {dayTasks.length > 0 && (
                      <div className="date-task-dots">
                        {dayTasks.slice(0, 3).map((t, tIdx) => (
                          <span
                            key={tIdx}
                            className={`event-dot ${t.priority ? t.priority.toLowerCase() : 'low'}`}
                            title={t.title}
                          />
                        ))}
                        {dayTasks.length > 3 && <span className="more-dot">+{dayTasks.length - 3}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Selected Date Agenda Details */}
          <div className="calendar-agenda-card surface-card">
            <div className="agenda-header">
              <Clock size={18} className="agenda-icon" />
              <div>
                <h3>Agenda for {formatDate(selectedDate)}</h3>
                <small>{selectedDayTasks.length} deadline{selectedDayTasks.length !== 1 ? 's' : ''} scheduled</small>
              </div>
            </div>

            <div className="agenda-items-list">
              {selectedDayTasks.length === 0 ? (
                <div className="empty-agenda">
                  <CalendarIcon size={32} />
                  <p>No deadlines scheduled for this date.</p>
                </div>
              ) : (
                selectedDayTasks.map((task) => (
                  <div key={task._id} className="agenda-task-item">
                    <div className="agenda-task-top">
                      <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      <span className="workspace-name-chip">{task.workspaceName}</span>
                    </div>
                    <h4 className="agenda-task-title">{task.title}</h4>
                    <div className="agenda-task-bottom">
                      <span className={`status-badge ${task.status.toLowerCase()}`}>{task.status.replace('_', ' ')}</span>
                      <span className="task-progress-num">{task.progress}% done</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
