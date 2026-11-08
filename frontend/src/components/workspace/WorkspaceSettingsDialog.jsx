import { AlertTriangle, ArrowLeft, ChevronRight, Settings2, X } from 'lucide-react'
import { useState } from 'react'
import { deleteWorkspace, updateWorkspace, uploadWorkspaceAvatar } from '../../services/workspaceService.js'

export default function WorkspaceSettingsDialog({ workspace, onClose, onDeleted, onUpdated }) {
  const [section, setSection] = useState('menu')
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const matchesWorkspaceName = confirmation === workspace.name

  async function saveDetails(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { const { data } = await updateWorkspace(workspace._id, { name: name.trim(), description: description.trim() }); onUpdated(data.data); setConfirmation(''); setNotice('Workspace details saved.') }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to save workspace details.') }
    finally { setSaving(false) }
  }
  async function saveAvatar() {
    if (!avatarFile) return
    setSaving(true); setError(''); setNotice('')
    try { const { data } = await uploadWorkspaceAvatar(workspace._id, avatarFile); onUpdated(data.data); setAvatarFile(null); setNotice('Workspace image updated.') }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to upload image.') }
    finally { setSaving(false) }
  }
  async function removeAvatar() {
    setSaving(true); setError(''); setNotice('')
    try { const { data } = await updateWorkspace(workspace._id, { avatar: '' }); onUpdated(data.data); setAvatarFile(null); setNotice('Workspace image removed.') }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to remove image.') }
    finally { setSaving(false) }
  }

  async function handleDelete(event) {
    event.preventDefault()
    if (!matchesWorkspaceName || deleting || saving) return
    setDeleting(true)
    setDeleteError('')
    try {
      const { data } = await deleteWorkspace(workspace._id)
      onDeleted(data.data)
    } catch (requestError) {
      setDeleteError(requestError.response?.data?.message || 'Unable to delete this Space. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop workspace-settings-backdrop" role="presentation" onMouseDown={() => { if (!deleting && !saving) onClose() }}>
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
          <button type="button" className="modal-close" aria-label="Close settings" onClick={onClose} disabled={deleting || saving}>
            <X size={18} />
          </button>
        </div>
        {section === 'menu' && <div className="workspace-settings-menu"><p>Choose what you want to manage.</p><button type="button" onClick={() => setSection('details')}><span className="settings-menu-icon"><Settings2 size={19} /></span><span><strong>Workspace details</strong><small>Change the name, description and image.</small></span><ChevronRight size={17} /></button><button type="button" onClick={() => setSection('delete')}><span className="settings-menu-icon danger"><AlertTriangle size={19} /></span><span><strong>Delete workspace</strong><small>Review deletion and confirm your choice.</small></span><ChevronRight size={17} /></button></div>}
        {section !== 'menu' && <button type="button" className="workspace-settings-back" disabled={saving || deleting} onClick={() => { setSection('menu'); setError(''); setDeleteError(''); setNotice('') }}><ArrowLeft size={15} /> Back to settings</button>}
        {section === 'details' && <section className="workspace-general-settings">
          <div className="workspace-settings-section-title"><h3>Workspace details</h3><p>Update how your group appears to members.</p></div>
          <div className="workspace-avatar-settings"><span className="workspace-avatar-preview">{workspace.avatar ? <img src={workspace.avatar} alt="" /> : workspace.name.charAt(0).toUpperCase()}</span><div><strong>Workspace image</strong><p>PNG, JPEG or WebP · up to 3 MB</p><label className="workspace-avatar-choose">Choose image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} disabled={saving || deleting} /></label>{avatarFile && <span className="workspace-avatar-filename">{avatarFile.name}</span>}{avatarFile && <button type="button" className="secondary-action" onClick={saveAvatar} disabled={saving}>Upload image</button>}{workspace.avatar && <button type="button" className="workspace-avatar-remove" onClick={removeAvatar} disabled={saving}>Remove</button>}</div></div>
          <form className="workspace-details-form" onSubmit={saveDetails}><label htmlFor="workspace-settings-name">Workspace name</label><input id="workspace-settings-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} required disabled={saving || deleting} /><label htmlFor="workspace-settings-description">Description</label><textarea id="workspace-settings-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={3} disabled={saving || deleting} /><button className="primary-action" disabled={saving || deleting || !name.trim()} type="submit">{saving ? 'Saving…' : 'Save details'}</button></form>
          {notice && <p className="workspace-settings-notice" role="status">{notice}</p>}
          {error && !deleting && <p className="form-error" role="alert">{error}</p>}
        </section>}
        {section === 'delete' && <section className="danger-zone" aria-labelledby="danger-zone-title">
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
                onChange={(event) => { setConfirmation(event.target.value); setDeleteError('') }}
                disabled={deleting || saving}
              />
              {deleteError && <p className="form-error" role="alert">{deleteError}</p>}
              <div className="workspace-settings-actions">
                <button type="button" className="secondary-action" onClick={onClose} disabled={deleting || saving}>Cancel</button>
                <button type="submit" className="danger-delete-button" disabled={!matchesWorkspaceName || deleting || saving}>
                  {deleting ? 'Deleting Space…' : 'Delete Space'}
                </button>
              </div>
            </form>
          </div>
        </section>}
      </section>
    </div>
  )
}
