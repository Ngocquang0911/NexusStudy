import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { History, LoaderCircle, MessageSquareText, Send, X } from 'lucide-react'

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function defaultReminderTimes(deadlineValue) {
  if (!deadlineValue) return []
  const deadline = new Date(`${deadlineValue}T23:59:00`)
  const remaining = deadline.getTime() - Date.now()
  if (remaining <= 0) return []
  const offsets = [3 * 24 * 60 * 60 * 1000, 24 * 60 * 60 * 1000, 2 * 60 * 60 * 1000]
  return offsets.map((offset, index) => toLocalDateTime(
    new Date(deadline.getTime() - Math.min(offset, remaining * (0.75 - index * 0.25))),
  ))
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  workspaceMembers = [],
  isLeader = true,
  canManageReminders = isLeader,
  isPremium = false,
  loading = false,
  currentUserId,
  onAddFeedback,
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      difficulty: 'MEDIUM',
      estimatedHours: 0,
      deadline: '',
      progress: 0,
      assignedTo: [],
    },
  })

  const [formError, setFormError] = useState('')
  const [reminderTimes, setReminderTimes] = useState([])
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackRecipient, setFeedbackRecipient] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const currentStatus = watch('status')
  const currentDeadline = watch('deadline')
  const isEditing = Boolean(initialData?._id)

  // Auto-sync progress when status changes
  useEffect(() => {
    if (currentStatus === 'TODO') {
      setValue('progress', 0)
    } else if (currentStatus === 'DONE') {
      setValue('progress', 100)
    }
  }, [currentStatus, setValue])

  useEffect(() => {
    if (initialData) {
      const deadlineVal = initialData.deadline
        ? toLocalDateTime(initialData.deadline).split('T')[0]
        : ''

      const assignedIds = Array.isArray(initialData.assignedTo)
        ? initialData.assignedTo.map((u) => (typeof u === 'object' ? u._id : u))
        : []

      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'TODO',
        priority: initialData.priority || 'MEDIUM',
        difficulty: initialData.difficulty || 'MEDIUM',
        estimatedHours: initialData.estimatedHours ?? 0,
        deadline: deadlineVal,
        progress: initialData.progress ?? 0,
        assignedTo: assignedIds,
      })
      setReminderTimes((initialData.reminders || [])
        .filter((reminder) => !reminder.sentAt && new Date(reminder.sendAt) > new Date())
        .map((reminder) => toLocalDateTime(reminder.sendAt)))
    } else {
      reset({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        difficulty: 'MEDIUM',
        estimatedHours: 0,
        deadline: '',
        progress: 0,
        assignedTo: [],
      })
      setReminderTimes([])
    }
    setFormError('')
    setFeedbackError('')
    setFeedbackMessage('')
    setFeedbackRecipient('')
  }, [initialData, isOpen, reset])

  useEffect(() => {
    if (!isOpen || isEditing || !isPremium || !currentDeadline) return
    setReminderTimes(defaultReminderTimes(currentDeadline))
  }, [currentDeadline, isEditing, isOpen, isPremium])

  if (!isOpen) return null

  const handleFormSubmit = async (data) => {
    setFormError('')
    try {
      // Ensure progress is valid number
      const payload = {
        ...data,
        progress: Number(data.progress || 0),
        deadline: data.deadline ? new Date(`${data.deadline}T23:59:00`).toISOString() : null,
        reminders: reminderTimes.filter(Boolean).map((value) => new Date(value).toISOString()),
      }
      await onSubmit(payload)
      onClose()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save task')
    }
  }

  const handleAssigneeToggle = (userId) => {
    const current = watch('assignedTo') || []
    if (current.includes(userId)) {
      setValue(
        'assignedTo',
        current.filter((id) => id !== userId)
      )
    } else {
      setValue('assignedTo', [...current, userId])
    }
  }

  const assignedToValues = watch('assignedTo') || []
  const deadlineRegistration = register('deadline')
  const relatedUserIds = new Set([
    ...(initialData?.assignedTo || []).map((assignee) => (typeof assignee === 'object' ? assignee._id : assignee)),
    typeof initialData?.createdBy === 'object' ? initialData.createdBy?._id : initialData?.createdBy,
  ].filter((id) => id && id !== currentUserId))
  const feedbackRecipients = workspaceMembers
    .map((member) => member.userId || member)
    .filter((member) => relatedUserIds.has(member._id))

  async function submitFeedback() {
    if (!feedbackRecipient || !feedbackMessage.trim() || feedbackLoading) {
      setFeedbackError('Choose a recipient and enter feedback.')
      return
    }
    setFeedbackLoading(true)
    setFeedbackError('')
    try {
      await onAddFeedback(initialData._id, { recipientId: feedbackRecipient, message: feedbackMessage.trim() })
      setFeedbackMessage('')
      setFeedbackRecipient('')
    } catch (requestError) {
      setFeedbackError(requestError.response?.data?.message || requestError.message || 'Unable to add feedback.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workspace-modal task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="form-group">
            <label htmlFor="task-title">Task Title *</label>
            <input
              id="task-title"
              type="text"
              placeholder="e.g., Design Landing Page Wireframes"
              {...register('title', {
                required: 'Task title is required',
                maxLength: { value: 200, message: 'Title must be 200 characters or less' },
              })}
            />
            {errors.title && <span className="field-error">{errors.title.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              rows={3}
              placeholder="Add additional notes, requirements, or links..."
              {...register('description', {
                maxLength: { value: 5000, message: 'Description must be 5000 characters or less' },
              })}
            />
            {errors.description && <span className="field-error">{errors.description.message}</span>}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="task-difficulty">Difficulty</label>
              <select id="task-difficulty" {...register('difficulty')}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {currentDeadline && (
              <div className="form-group">
                <label>Deadline reminders</label>
                {isPremium && canManageReminders ? (
                  <>
                    <small className="muted-hint">Choose reminder times before the deadline (up to 50).</small>
                    {reminderTimes.map((value, index) => (
                      <div className="reminder-time-row" key={`reminder-${index}`}>
                        <input
                          aria-label={`Reminder ${index + 1}`}
                          type="datetime-local"
                          value={value}
                          onChange={(event) => setReminderTimes((current) => current.map((time, itemIndex) => itemIndex === index ? event.target.value : time))}
                        />
                        <button type="button" className="secondary-action" onClick={() => setReminderTimes((current) => current.filter((_time, itemIndex) => itemIndex !== index))}>Remove</button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={reminderTimes.length >= 50}
                      onClick={() => setReminderTimes((current) => [...current, ''])}
                    >
                      Add reminder time
                    </button>
                  </>
                ) : (
                  <small className="muted-hint">Three reminders will be sent automatically before the deadline.</small>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="task-estimated-hours">Estimated time (hours)</label>
              <input
                id="task-estimated-hours"
                type="number"
                min="0"
                max="10000"
                step="0.5"
                {...register('estimatedHours', { valueAsNumber: true, min: 0, max: 10000 })}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>
              <select id="task-priority" {...register('priority')}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-status">Status</label>
              <select id="task-status" {...register('status')}>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CANCELLED">Cancel</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Finish</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="task-deadline">Deadline</label>
              <input
                id="task-deadline"
                type="date"
                {...deadlineRegistration}
                onChange={(event) => {
                  deadlineRegistration.onChange(event)
                  if (isEditing && isPremium && isLeader) {
                    setReminderTimes(defaultReminderTimes(event.target.value))
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-progress">Progress ({watch('progress')}%)</label>
              <input
                id="task-progress"
                type="range"
                min="0"
                max="100"
                step="5"
                {...register('progress', { valueAsNumber: true })}
                disabled={currentStatus === 'TODO' || currentStatus === 'CANCELLED' || currentStatus === 'DONE'}
              />
            </div>
          </div>

          {/* Member Assignment Section */}
          {workspaceMembers.length > 0 && (
            <div className="form-group">
              <label>Assign To ({assignedToValues.length} selected)</label>
              {!isLeader && <small className="muted-hint">Only workspace leaders can change assignees.</small>}
              <div className="assignee-select-list">
                {workspaceMembers.map((member) => {
                  const mUser = member.userId || member
                  const isChecked = assignedToValues.includes(mUser._id)
                  const name = mUser.name || mUser.email || 'Member'
                  const initial = name.charAt(0).toUpperCase()

                  return (
                    <label
                      key={mUser._id}
                      className={`assignee-checkbox-item ${isChecked ? 'selected' : ''} ${
                        !isLeader ? 'disabled' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isLeader}
                        onChange={() => handleAssigneeToggle(mUser._id)}
                      />
                      <span className="mini-avatar">{initial}</span>
                      <span className="member-name">{name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-action" disabled={loading}>
              {loading && <LoaderCircle className="spin" size={16} />}
              {isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
        {isEditing && (
          <div className="task-activity-section">
            <section>
              <h3><MessageSquareText size={15} /> Feedback</h3>
              {(initialData.feedback || []).map((item) => {
                const author = typeof item.authorId === 'object' ? item.authorId : workspaceMembers.map((member) => member.userId || member).find((member) => member._id === item.authorId)
                const recipient = typeof item.recipientId === 'object' ? item.recipientId : workspaceMembers.map((member) => member.userId || member).find((member) => member._id === item.recipientId)
                return (
                  <article className="task-feedback-item" key={item._id}>
                    <strong>{author?.name || 'Member'} <span>to {recipient?.name || 'teammate'}</span></strong>
                    <p>{item.message}</p>
                    <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}</small>
                  </article>
                )
              })}
              {!initialData.feedback?.length && <p className="muted-hint">No feedback yet.</p>}
              {feedbackRecipients.length > 0 && (
                <div className="task-feedback-form">
                  <label htmlFor="task-feedback-recipient">Send feedback to</label>
                  <select id="task-feedback-recipient" value={feedbackRecipient} onChange={(event) => setFeedbackRecipient(event.target.value)}>
                    <option value="">Select a task participant</option>
                    {feedbackRecipients.map((recipient) => <option key={recipient._id} value={recipient._id}>{recipient.name || recipient.email}</option>)}
                  </select>
                  <label htmlFor="task-feedback-message">Feedback</label>
                  <textarea id="task-feedback-message" maxLength={2000} rows={3} value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} placeholder="Share task-related feedback..." />
                  {feedbackError && <span className="field-error" role="alert">{feedbackError}</span>}
                  <button type="button" className="secondary-action" onClick={submitFeedback} disabled={feedbackLoading}>
                    {feedbackLoading ? <LoaderCircle className="spin" size={14} /> : <Send size={14} />}
                    Send feedback
                  </button>
                </div>
              )}
            </section>
            <section>
              <h3><History size={15} /> Task history</h3>
              {(initialData.history || []).slice(-8).reverse().map((item) => {
                const actor = typeof item.actorId === 'object' ? item.actorId : workspaceMembers.map((member) => member.userId || member).find((member) => member._id === item.actorId)
                return (
                  <article className="task-history-item" key={item._id}>
                    <strong>{actor?.name || 'Member'} · {item.action.replaceAll('_', ' ').toLowerCase()}</strong>
                    <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small>
                  </article>
                )
              })}
              {!initialData.history?.length && <p className="muted-hint">No activity recorded.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
