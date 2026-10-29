import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'
import { deleteWorkspace } from '../../services/workspaceService.js'

export default function WorkspaceSettingsDialog({ workspace, onClose, onDeleted }) {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const matchesWorkspaceName = confirmation === workspace.name

  async function handleDelete(event) {
    event.preventDefault()
    if (!matchesWorkspaceName || deleting) return
    setDeleting(true)
    setError('')
    try {
      const { data } = await deleteWorkspace(workspace._id)
      onDeleted(data.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete this Space. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop workspace-settings-backdrop" role="presentation" onMouseDown={() => { if (!deleting) onClose() }}>
      <section
        className="workspace-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="workspace-settings-header">
          <div>
            <span className="eyebrow">SPACE SETTINGS</span>
            <h2 id="workspace-settings-title">{workspace.name}</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close settings" onClick={onClose} disabled={deleting}>
            <X size={18} />
          </button>
        </div>
        <section className="danger-zone" aria-labelledby="danger-zone-title">
          <div className="danger-zone-heading">
            <span><AlertTriangle size={17} /></span>
            <div>
              <h3 id="danger-zone-title">Danger Zone</h3>
              <p>Delete this Space when it is no longer needed.</p>
            </div>
          </div>
          <div className="danger-zone-content">
            <strong>Delete “{workspace.name}”</strong>
            <p>
              Members will immediately lose access and pending invitations will be cancelled.
              Confirmed members can view and download eligible documents for five days.
              At the end of that period, workspace data will be permanently deleted.
              This action cannot be undone.
            </p>
            <form onSubmit={handleDelete}>
              <label htmlFor="workspace-delete-confirmation">
                Type <strong>{workspace.name}</strong> to confirm
              </label>
              <input
                id="workspace-delete-confirmation"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => { setConfirmation(event.target.value); setError('') }}
                disabled={deleting}
              />
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="workspace-settings-actions">
                <button type="button" className="secondary-action" onClick={onClose} disabled={deleting}>Cancel</button>
                <button type="submit" className="danger-delete-button" disabled={!matchesWorkspaceName || deleting}>
                  {deleting ? 'Deleting Space…' : 'Delete Space'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </section>
    </div>
  )
}
