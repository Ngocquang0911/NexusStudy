import { X } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function JoinWorkspaceModal({ onClose, onSubmit, submitting, error }) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="workspace-modal"
        onSubmit={handleSubmit((data) => onSubmit(data.inviteCode))}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-top">
          <div>
            <span className="eyebrow">JOIN WORKSPACE</span>
            <h2>Enter Workspace Code</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label>
          Invite code
          <input
            autoFocus
            {...register('inviteCode', { required: 'Invite code is required' })}
            placeholder="e.g. 00D531577E35"
            style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
          />
          {errors.inviteCode && <small className="field-error">{errors.inviteCode.message}</small>}
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action" type="submit" disabled={submitting}>
            {submitting ? 'Joining...' : 'Join Workspace'}
          </button>
        </div>
      </form>
    </div>
  )
}
