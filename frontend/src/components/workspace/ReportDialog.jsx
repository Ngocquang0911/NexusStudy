import { useState } from 'react'
import { X } from 'lucide-react'
import { submitReport } from '../../services/reportService.js'
export default function ReportDialog({ workspaceId, targetType, targetId, targetName, onClose }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(''); setSaving(true)
    try { await submitReport(workspaceId, { targetType, targetId, reason: reason.trim() }); setSubmitted(true) }
    catch (err) { setError(err.response?.data?.message || 'Unable to submit report.') }
    finally { setSaving(false) }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}><section className="workspace-modal report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title"><div className="modal-top"><h2 id="report-title">Report {targetType === 'USER' ? 'member' : 'workspace'}</h2><button type="button" className="modal-close" aria-label="Close report" onClick={onClose} disabled={saving}><X size={18} /></button></div>{submitted ? <><p role="status">Your report was sent to the administration team for review.</p><button type="button" className="primary-action" onClick={onClose}>Done</button></> : <form onSubmit={submit}><p>Reporting <strong>{targetName}</strong>. Describe what happened so an administrator can review it.</p><label htmlFor="report-reason">Reason <span>(10–2000 characters)</span></label><textarea id="report-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={10} maxLength={2000} rows={5} required placeholder="Describe the behavior and relevant context..." />{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-action" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-action" disabled={saving || reason.trim().length < 10}>{saving ? 'Sending…' : 'Send report'}</button></div></form>}</section></div>
}
