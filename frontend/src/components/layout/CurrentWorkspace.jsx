import { Check, ChevronDown, Pencil, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { listWorkspaces, updateWorkspace } from '../../services/workspaceService.js'

const SELECTED_WORKSPACE_KEY = 'nexus.selectedWorkspaceId'

export default function CurrentWorkspace() {
  const location = useLocation()
  const routeWorkspaceId = location.pathname.match(/^\/workspaces\/([^/]+)/)?.[1]
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => localStorage.getItem(SELECTED_WORKSPACE_KEY) || '')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    listWorkspaces()
      .then(({ data }) => {
        if (active) setWorkspaces(data.data || [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load workspaces.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const currentWorkspace = useMemo(() => {
    const preferredId = routeWorkspaceId || selectedWorkspaceId
    return workspaces.find((workspace) => workspace._id === preferredId) || workspaces[0] || null
  }, [routeWorkspaceId, selectedWorkspaceId, workspaces])

  useEffect(() => {
    if (!currentWorkspace) return
    setSelectedWorkspaceId(currentWorkspace._id)
    localStorage.setItem(SELECTED_WORKSPACE_KEY, currentWorkspace._id)
    setName(currentWorkspace.name)
  }, [currentWorkspace])

  function selectWorkspace(workspace) {
    setSelectedWorkspaceId(workspace._id)
    localStorage.setItem(SELECTED_WORKSPACE_KEY, workspace._id)
    setOpen(false)
    setEditing(false)
    if (location.pathname !== `/workspaces/${workspace._id}`) {
      navigate(`/workspaces/${workspace._id}`)
    }
  }

  async function saveName(event) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!currentWorkspace || !trimmedName || saving) return
    setSaving(true)
    setError('')
    try {
      const { data } = await updateWorkspace(currentWorkspace._id, { name: trimmedName })
      setWorkspaces((current) => current.map((workspace) => (
        workspace._id === currentWorkspace._id ? { ...workspace, ...data.data } : workspace
      )))
      setEditing(false)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to rename this workspace.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="current-workspace">
      <button
        type="button"
        className="workspace-chip"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => { setOpen((value) => !value); setError('') }}
      >
        <span className="workspace-dot" />
        <span className="workspace-chip-copy">
          <small>Current workspace</small>
          <strong>{loading ? 'Loading...' : currentWorkspace?.name || 'No workspace yet'}</strong>
        </span>
        <ChevronDown size={15} className="workspace-chip-chevron" />
      </button>
      {open && (
        <div className="workspace-switcher-menu">
          <div className="workspace-switcher-heading">Your workspaces</div>
          {workspaces.map((workspace) => (
            <button
              type="button"
              key={workspace._id}
              className={`workspace-switcher-option ${workspace._id === currentWorkspace?._id ? 'selected' : ''}`}
              onClick={() => selectWorkspace(workspace)}
            >
              <span>{workspace.name}</span>
              {workspace._id === currentWorkspace?._id && <Check size={14} />}
            </button>
          ))}
          {!loading && workspaces.length === 0 && <p className="workspace-switcher-empty">Create or join a workspace to get started.</p>}
          {currentWorkspace && ['OWNER', 'LEADER'].includes(currentWorkspace.role) && !editing && (
            <button type="button" className="workspace-switcher-rename" onClick={() => { setName(currentWorkspace.name); setEditing(true); setError('') }}>
              <Pencil size={14} /> Rename workspace
            </button>
          )}
          {editing && (
            <form className="workspace-rename-form" onSubmit={saveName}>
              <label htmlFor="current-workspace-name">Workspace name</label>
              <input
                id="current-workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
                autoFocus
              />
              <div>
                <button type="button" className="workspace-rename-cancel" onClick={() => setEditing(false)} disabled={saving}>
                  <X size={14} /> Cancel
                </button>
                <button type="submit" className="workspace-rename-save" disabled={saving || !name.trim()}>
                  <Check size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
          {error && <p className="workspace-switcher-error" role="alert">{error}</p>}
        </div>
      )}
    </div>
  )
}
