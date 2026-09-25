import { FolderKanban, KeyRound, LoaderCircle, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreateWorkspaceModal from '../../components/workspace/CreateWorkspaceModal.jsx'
import JoinWorkspaceModal from '../../components/workspace/JoinWorkspaceModal.jsx'
import { createWorkspace, joinWorkspace, listWorkspaces } from '../../services/workspaceService.js'

export default function WorkspaceListPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [joinSubmitting, setJoinSubmitting] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    listWorkspaces()
      .then(({ data }) => setWorkspaces(data.data || []))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load workspaces'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(payload) {
    setSubmitting(true)
    setError('')
    try {
      const { data } = await createWorkspace(payload)
      setModalOpen(false)
      navigate(`/workspaces/${data.data._id}`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create workspace')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(inviteCode) {
    setJoinSubmitting(true)
    setJoinError('')
    try {
      const { data } = await joinWorkspace(inviteCode)
      setJoinModalOpen(false)
      navigate(`/workspaces/${data.data._id}`)
    } catch (requestError) {
      setJoinError(requestError.response?.data?.message || 'Unable to join workspace')
    } finally {
      setJoinSubmitting(false)
    }
  }

  if (loading) return <div className="route-loading"><LoaderCircle className="spin" size={22} /> Loading workspaces...</div>

  return (
    <div className="workspace-page">
      <section className="page-title-row">
        <div>
          <span className="eyebrow">YOUR COLLABORATION SPACES</span>
          <h1>My workspaces</h1>
          <p>Everything your study groups are building together.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary-action" onClick={() => { setJoinError(''); setJoinModalOpen(true) }}>
            <KeyRound size={17} /> Join with code
          </button>
          <button className="primary-action" onClick={() => setModalOpen(true)}>
            <Plus size={17} /> Create workspace
          </button>
        </div>
      </section>

      {error && <div className="inline-error" role="alert">{error}</div>}

      {workspaces.length === 0 ? (
        <div className="surface-card workspace-empty">
          <FolderKanban size={27} />
          <h2>No workspace yet</h2>
          <p>Create a project space or join one with an invite code.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="secondary-action" onClick={() => { setJoinError(''); setJoinModalOpen(true) }}>
              <KeyRound size={17} /> Join with code
            </button>
            <button className="primary-action" onClick={() => setModalOpen(true)}>
              Create your first workspace
            </button>
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
          {workspaces.map((workspace) => (
            <button className="workspace-card" key={workspace._id} onClick={() => navigate(`/workspaces/${workspace._id}`)}>
              <span className="workspace-card-icon">{workspace.name.slice(0, 1).toUpperCase()}</span>
              <span className="workspace-card-content">
                <strong>{workspace.name}</strong>
                <small>{workspace.type} · {workspace.role}</small>
                <span><Users size={14} /> Open workspace</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <CreateWorkspaceModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          error={error}
        />
      )}

      {joinModalOpen && (
        <JoinWorkspaceModal
          onClose={() => setJoinModalOpen(false)}
          onSubmit={handleJoin}
          submitting={joinSubmitting}
          error={joinError}
        />
      )}
    </div>
  )
}
