import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LoaderCircle, X } from 'lucide-react'

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  workspaceMembers = [],
  isLeader = true,
  loading = false,
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
      deadline: '',
      progress: 0,
      assignedTo: [],
    },
  })

  const [formError, setFormError] = useState('')
  const currentStatus = watch('status')

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
        ? new Date(initialData.deadline).toISOString().split('T')[0]
        : ''

      const assignedIds = Array.isArray(initialData.assignedTo)
        ? initialData.assignedTo.map((u) => (typeof u === 'object' ? u._id : u))
        : []

      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'TODO',
        priority: initialData.priority || 'MEDIUM',
        deadline: deadlineVal,
        progress: initialData.progress ?? 0,
        assignedTo: assignedIds,
      })
    } else {
      reset({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        deadline: '',
        progress: 0,
        assignedTo: [],
      })
    }
    setFormError('')
  }, [initialData, isOpen, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (data) => {
    setFormError('')
    try {
      // Ensure progress is valid number
      const payload = {
        ...data,
        progress: Number(data.progress || 0),
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workspace-modal task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>{initialData ? 'Edit Task' : 'Create New Task'}</h2>
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
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="task-deadline">Deadline</label>
              <input id="task-deadline" type="date" {...register('deadline')} />
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
                disabled={currentStatus === 'TODO' || currentStatus === 'DONE'}
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
              {initialData ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
