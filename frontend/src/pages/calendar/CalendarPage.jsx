import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createAppointment, deleteAppointment, listAppointments, updateAppointment } from '../../services/appointmentService.js'
import { listTasks } from '../../services/taskService.js'
import { getWorkspaceMembers, listWorkspaces } from '../../services/workspaceService.js'
import { formatDate } from '../../utils/formatDate.js'
import { getTaskBoardStatus, TASK_STATUS_LABELS } from '../../utils/taskStatus.js'

const localDayKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localInputDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [workspaces, setWorkspaces] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [members, setMembers] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ workspaceId: '', title: '', description: '', startsAt: '', attendeeIds: [] })

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listWorkspaces()
      const wsList = data.data || []
      setWorkspaces(wsList)
      const result = await Promise.all(wsList.map(async (workspace) => {
        const [taskResult, appointmentResult] = await Promise.all([
          listTasks(workspace._id),
          listAppointments(workspace._id),
        ])
        return {
          tasks: (taskResult.data.data || []).map((task) => ({ ...task, workspaceId: workspace._id, workspaceName: workspace.name })),
          appointments: (appointmentResult.data.data || []).map((appointment) => ({ ...appointment, workspaceName: workspace.name })),
        }
      }))
      setAllTasks(result.flatMap((item) => item.tasks))
      setAppointments(result.flatMap((item) => item.appointments))
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not load calendar data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCalendar() }, [loadCalendar])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const openCreate = async () => {
    setEditing(null)
    setFormError('')
    const workspaceId = workspaces[0]?._id || ''
    const start = new Date(selectedDate)
    start.setHours(9, 0, 0, 0)
    if (start <= new Date()) {
      start.setTime(Date.now() + 60 * 60_000)
      start.setMinutes(0, 0, 0)
    }
    setForm({ workspaceId, title: '', description: '', startsAt: localInputDate(start), attendeeIds: [] })
    setModalOpen(true)
  }

  useEffect(() => {
    if (!modalOpen || !form.workspaceId) { setMembers([]); return }
    getWorkspaceMembers(form.workspaceId)
      .then(({ data }) => setMembers(data.data || []))
      .catch(() => setMembers([]))
  }, [modalOpen, form.workspaceId])

  const openEdit = (appointment) => {
    setEditing(appointment)
    setFormError('')
    setForm({
      workspaceId: appointment.workspaceId,
      title: appointment.title,
      description: appointment.description || '',
      startsAt: localInputDate(new Date(appointment.startsAt)),
      attendeeIds: (appointment.attendeeIds || []).map((person) => person._id || person),
    })
    setModalOpen(true)
  }

  const saveAppointment = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const payload = { ...form, startsAt: new Date(form.startsAt).toISOString() }
      if (editing) await updateAppointment(editing._id, payload)
      else await createAppointment(form.workspaceId, payload)
      setModalOpen(false)
      await loadCalendar()
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not save this appointment.')
    } finally {
      setSaving(false)
    }
  }

  const cancelAppointment = async (appointment) => {
    try {
      await deleteAppointment(appointment._id)
      await loadCalendar()
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not cancel this appointment.')
    }
  }

  const selectedKey = localDayKey(selectedDate)
  const dayTasks = useMemo(() => allTasks.filter((task) => task.deadline && localDayKey(task.deadline) === selectedKey), [allTasks, selectedKey])
  const dayAppointments = useMemo(() => appointments.filter((appointment) => localDayKey(appointment.startsAt) === selectedKey), [appointments, selectedKey])

  const upcoming = allTasks.filter((task) => task.deadline && new Date(task.deadline) >= new Date() && !['DONE', 'CANCELLED'].includes(task.status)).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 3)

  return (
    <div className="calendar-page-container">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">SCHEDULE & DEADLINES</span>
          <h1>Academic Calendar</h1>
          <p>View task deadlines and create appointments for your workspaces.</p>
        </div>
        <div className="page-actions-right">
          <button type="button" className="primary-action" onClick={openCreate} disabled={!workspaces.length}><Plus size={16} /> New appointment</button>
          <button type="button" className="secondary-action text-xs" onClick={() => { const now = new Date(); setCurrentDate(now); setSelectedDate(now) }}>Today</button>
        </div>
      </div>

      {loading ? <div className="route-loading" style={{ minHeight: '350px' }}><LoaderCircle className="spin" size={24} /> Loading calendar...</div> : (
        <div className="calendar-main-grid">
          <div className="calendar-month-card surface-card">
            <div className="calendar-header-nav">
              <h2>{monthNames[month]} {year}</h2>
              <div className="calendar-nav-buttons">
                <button type="button" className="icon-action" onClick={() => { const date = new Date(year, month - 1, 1); setCurrentDate(date); setSelectedDate(date) }} title="Previous month"><ChevronLeft size={18} /></button>
                <button type="button" className="icon-action" onClick={() => { const date = new Date(year, month + 1, 1); setCurrentDate(date); setSelectedDate(date) }} title="Next month"><ChevronRight size={18} /></button>
              </div>
            </div>
            <div className="calendar-days-header-row">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-dates-grid">
              {Array.from({ length: firstDayOfMonth }, (_, index) => <div key={`blank-${index}`} className="calendar-date-cell empty" />)}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const dayNum = index + 1
                const date = new Date(year, month, dayNum)
                const key = localDayKey(date)
                const taskCount = allTasks.filter((task) => task.deadline && localDayKey(task.deadline) === key).length
                const appointmentCount = appointments.filter((appointment) => localDayKey(appointment.startsAt) === key).length
                const isToday = key === localDayKey(new Date())
                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    aria-label={`${monthNames[month]} ${dayNum}: ${taskCount} deadlines, ${appointmentCount} appointments`}
                    aria-pressed={key === selectedKey}
                    className={`calendar-date-cell ${key === selectedKey ? 'selected' : ''} ${isToday ? 'today' : ''} ${taskCount + appointmentCount ? 'has-events' : ''}`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="date-number">{dayNum}</span>
                    {(taskCount + appointmentCount > 0) && <div className="date-task-dots"><span className="event-dot medium" title={`${taskCount} task deadlines`} />{appointmentCount > 0 && <span className="event-dot high" title={`${appointmentCount} appointments`} />}</div>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="calendar-agenda-card surface-card">
            <div className="agenda-header"><Clock size={18} className="agenda-icon" /><div><h3>Agenda for {formatDate(selectedDate)}</h3><small>{dayAppointments.length + dayTasks.length} items scheduled</small></div></div>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="agenda-items-list">
              {!dayAppointments.length && !dayTasks.length ? <div className="empty-agenda"><CalendarIcon size={32} /><p>No events on this date.</p><button type="button" className="secondary-action" onClick={openCreate}><Plus size={14} /> Create appointment</button>{upcoming.length > 0 && <div className="calendar-upcoming"><strong>Coming up next</strong>{upcoming.map((task) => <Link key={task._id} to={`/workspaces/${task.workspaceId}/tasks?taskId=${task._id}`}><span>{task.title}<small>{task.workspaceName}</small></span><time>{formatDate(task.deadline)}</time></Link>)}</div>}</div> : <>
                {dayAppointments.map((appointment) => (
                  <article key={appointment._id} className="agenda-task-item">
                    <div className="agenda-task-top"><span className="priority-tag high">APPOINTMENT</span><span className="workspace-name-chip">{appointment.workspaceName}</span></div>
                    <h4 className="agenda-task-title">{appointment.title}</h4>
                    <small>{new Date(appointment.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{appointment.description ? ` · ${appointment.description}` : ''}</small>
                    <div className="agenda-task-bottom"><span>{(appointment.attendeeIds || []).length} attendee(s)</span><span>
                      <button type="button" className="text-action" onClick={() => openEdit(appointment)}>Edit</button>
                      {' · '}<button type="button" className="text-action" onClick={() => cancelAppointment(appointment)}><Trash2 size={13} /> Cancel</button>
                    </span></div>
                  </article>
                ))}
                {dayTasks.map((task) => (
                  <Link key={task._id} to={`/workspaces/${task.workspaceId}/tasks?taskId=${task._id}`} className="agenda-task-item">
                    <div className="agenda-task-top"><span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span><span className="workspace-name-chip">{task.workspaceName}</span></div>
                    <h4 className="agenda-task-title">{task.title}</h4>
                    <div className="agenda-task-bottom"><span className={`status-badge ${getTaskBoardStatus(task).toLowerCase()}`}>{TASK_STATUS_LABELS[getTaskBoardStatus(task)]}</span><span className="task-progress-num">{task.progress}% done</span></div>
                  </Link>
                ))}
              </>}
            </div>
          </div>
        </div>
      )}

      {modalOpen && <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
        <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-title" onClick={(event) => event.stopPropagation()}>
          <div className="modal-header"><div><span className="eyebrow">CALENDAR</span><h2 id="appointment-title">{editing ? 'Edit appointment' : 'New appointment'}</h2></div><button type="button" className="modal-close" onClick={() => setModalOpen(false)} aria-label="Close">×</button></div>
          <form onSubmit={saveAppointment}>
            <label>Workspace<select value={form.workspaceId} onChange={(event) => setForm((current) => ({ ...current, workspaceId: event.target.value, attendeeIds: [] }))} required>{workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}</select></label>
            <label>Title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength={160} required /></label>
            <label>Date and time<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} required /></label>
            <label>Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={2000} rows={3} /></label>
            <fieldset><legend>Remind these members by in-app notification and email</legend><div className="appointment-attendees">{members.map((member) => {
              const person = member.userId || member
              const id = person._id || person
              return <label key={id}><input type="checkbox" checked={form.attendeeIds.includes(id)} onChange={(event) => setForm((current) => ({ ...current, attendeeIds: event.target.checked ? [...current.attendeeIds, id] : current.attendeeIds.filter((item) => item !== id) }))} />{person.name || person.email || 'Member'}</label>
            })}</div><small>Three reminders are scheduled automatically before the appointment. Leave everyone unchecked to remind only you.</small></fieldset>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create appointment'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  )
}
