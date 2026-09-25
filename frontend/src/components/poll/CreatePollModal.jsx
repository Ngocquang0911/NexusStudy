import { LoaderCircle, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

export default function CreatePollModal({ isOpen, onClose, onSubmit, loading = false }) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      question: '',
      options: [{ label: '' }, { label: '' }],
      duration: '3d', // default 3 days
      customExpiresAt: '',
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'options',
  })

  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (isOpen) {
      reset({
        question: '',
        options: [{ label: '' }, { label: '' }],
        duration: '3d',
        customExpiresAt: '',
      })
      setFormError('')
    }
  }, [isOpen, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (data) => {
    setFormError('')
    try {
      const cleanOptions = data.options.map((o) => o.label.trim()).filter(Boolean)
      if (cleanOptions.length < 2) {
        setFormError('At least 2 non-empty options are required')
        return
      }

      // Check duplicates
      const uniqueLabels = new Set(cleanOptions.map((l) => l.toLowerCase()))
      if (uniqueLabels.size !== cleanOptions.length) {
        setFormError('Poll options must be unique')
        return
      }

      let expiresAt
      if (data.duration === 'custom' && data.customExpiresAt) {
        expiresAt = new Date(data.customExpiresAt).toISOString()
      } else {
        const now = new Date()
        let days = 3
        if (data.duration === '1d') days = 1
        if (data.duration === '7d') days = 7
        if (data.duration === '14d') days = 14
        now.setDate(now.getDate() + days)
        expiresAt = now.toISOString()
      }

      await onSubmit({
        question: data.question.trim(),
        options: cleanOptions,
        expiresAt,
      })
      onClose()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create poll')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workspace-modal poll-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Create Group Poll</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="form-group">
            <label htmlFor="poll-question">Poll Question / Decision *</label>
            <input
              id="poll-question"
              type="text"
              placeholder="e.g. Which date works best for our project presentation?"
              {...register('question', {
                required: 'Question is required',
                maxLength: { value: 500, message: 'Question must be 500 characters or less' },
              })}
            />
            {errors.question && <span className="field-error">{errors.question.message}</span>}
          </div>

          <div className="form-group">
            <label>Options (Minimum 2) *</label>
            <div className="poll-options-input-list">
              {fields.map((field, index) => (
                <div key={field.id} className="option-input-row">
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    {...register(`options.${index}.label`, {
                      required: 'Option label cannot be empty',
                    })}
                  />
                  {fields.length > 2 && (
                    <button
                      type="button"
                      className="icon-action danger"
                      onClick={() => remove(index)}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {fields.length < 8 && (
              <button
                type="button"
                className="secondary-action text-xs margin-top-sm"
                onClick={() => append({ label: '' })}
              >
                <Plus size={14} /> Add Option
              </button>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="poll-duration">Poll Expiration</label>
            <select id="poll-duration" {...register('duration')}>
              <option value="1d">1 Day</option>
              <option value="3d">3 Days</option>
              <option value="7d">7 Days</option>
              <option value="14d">14 Days</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-action" disabled={loading}>
              {loading && <LoaderCircle className="spin" size={16} />}
              Create Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
