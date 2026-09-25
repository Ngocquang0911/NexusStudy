import { LoaderCircle, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

export default function CreateChannelModal({ isOpen, onClose, onSubmit, loading = false }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      isPrivate: false,
    },
  })

  const [formError, setFormError] = useState('')

  if (!isOpen) return null

  const handleFormSubmit = async (data) => {
    setFormError('')
    try {
      // Format channel name (slugify / lowercase/hyphens or clean)
      const cleanName = data.name.trim().toLowerCase().replace(/\s+/g, '-')
      await onSubmit({ ...data, name: cleanName })
      reset()
      onClose()
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create channel')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workspace-modal channel-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Create Channel</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="form-group">
            <label htmlFor="channel-name">Channel Name *</label>
            <input
              id="channel-name"
              type="text"
              placeholder="e.g. backend-dev, general, design"
              {...register('name', {
                required: 'Channel name is required',
                maxLength: { value: 80, message: 'Name must be 80 characters or less' },
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message: 'Channel name can only contain letters, numbers, hyphens, and underscores',
                },
              })}
            />
            {errors.name && <span className="field-error">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="channel-desc">Description</label>
            <textarea
              id="channel-desc"
              rows={3}
              placeholder="What is this channel about?"
              {...register('description', {
                maxLength: { value: 300, message: 'Description must be 300 characters or less' },
              })}
            />
            {errors.description && <span className="field-error">{errors.description.message}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" {...register('isPrivate')} />
              <span>
                <strong><Lock size={13} inline /> Make channel private</strong>
                <small>When a channel is private, it can only be viewed by invited members.</small>
              </span>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-action" disabled={loading}>
              {loading && <LoaderCircle className="spin" size={16} />}
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
