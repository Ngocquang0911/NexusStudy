import { Check, FolderKanban, LoaderCircle, Plus, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CreateWorkspaceModal from '../../components/workspace/CreateWorkspaceModal.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { acceptInvitation, createWorkspace, declineInvitation, listInvitations, listWorkspaces } from '../../services/workspaceService.js'

export default function WorkspaceListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuth()
  const user = auth?.user
  const [workspaces, setWorkspaces] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user?.systemRole === 'ADMIN') {
      navigate('/admin?section=workspaces', { replace: true })
      return
    }

    Promise.all([listWorkspaces(), listInvitations()])
      .then(([workspaceResponse, invitationResponse]) => {
        setWorkspaces(workspaceResponse.data.data || [])
        setInvitations(invitationResponse.data.data || [])
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load workspaces'))
      .finally(() => setLoading(false))
  }, [user, navigate])

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

  async function respondToInvitation(invitationId, action) {
    setError('')
    try {
      if (action === 'accept') await acceptInvitation(invitationId)
      else await declineInvitation(invitationId)
      const [workspaceResponse, invitationResponse] = await Promise.all([listWorkspaces(), listInvitations()])
      setWorkspaces(workspaceResponse.data.data || [])
      setInvitations(invitationResponse.data.data || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${action} invitation`)
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
          <button className="primary-action" onClick={() => setModalOpen(true)}>
            <Plus size={17} /> Create workspace
          </button>
        </div>
      </section>

      {error && <div className="inline-error" role="alert">{error}</div>}
      {location.state?.notice && (
        <div className={`workspace-success-notice${location.state.cleanupPending ? ' cleanup-pending' : ''}`} role="status">
          {location.state.notice}
        </div>
      )}

      <section className="surface-card workspace-invitations">
        <div className="section-heading">
          <div><span className="eyebrow">YOUR INBOX</span><h2>Invitations <span className="workspace-invitation-count">{invitations.length}</span></h2></div>
        </div>
        {!invitations.length ? <p className="muted-copy">You’re all caught up. New invitations will appear here.</p> : (
          <div className="member-list">
            {invitations.map((invitation) => (
              <div className="member-row" key={invitation._id}>
                <span className="workspace-card-icon">{invitation.workspaceId?.name?.slice(0, 1).toUpperCase() || '?'}</span>
                <span className="member-info">
                  <strong>{invitation.workspaceId?.name || 'Workspace'}</strong>
                  <small>Invited by {invitation.inviterId?.name || invitation.inviterId?.email || 'a workspace leader'} · {new Date(invitation.createdAt).toLocaleDateString()}</small>
                  <small>{invitation.status === 'PENDING' ? `Respond by ${new Date(invitation.expiresAt).toLocaleString()}` : `Invitation ${invitation.status.toLowerCase()}`}</small>
                </span>
                <span className={`role-tag ${invitation.status.toLowerCase()}`}>{invitation.status}</span>
                {invitation.status === 'PENDING' && (
                  <span className="invitation-actions">
                    <button className="primary-action" onClick={() => respondToInvitation(invitation._id, 'accept')}><Check size={15} /> Accept</button>
                    <button className="secondary-action" onClick={() => respondToInvitation(invitation._id, 'decline')}><X size={15} /> Decline</button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {workspaces.length === 0 ? (
        <div className="surface-card workspace-empty">
          <FolderKanban size={27} />
          <h2>No workspace yet</h2>
          <p>Create a space or accept an invitation from its owner or leader.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="primary-action" onClick={() => setModalOpen(true)}>
              Create your first workspace
            </button>
          </div>
        </div>
      ) : (
        <section className="workspace-collection"><div className="workspace-collection-heading"><div><span className="eyebrow">YOUR SPACES</span><h2>Continue collaborating</h2><p>Open a workspace to pick up where your team left off.</p></div><span>{workspaces.length} {workspaces.length === 1 ? 'workspace' : 'workspaces'}</span></div><div className="workspace-grid">
          {workspaces.map((workspace) => (
            <button className="workspace-card" key={workspace._id} onClick={() => navigate(`/workspaces/${workspace._id}`)}>
              <span className="workspace-card-icon">{workspace.avatar ? <img src={workspace.avatar} alt="" /> : workspace.name.slice(0, 1).toUpperCase()}</span>
              <span className="workspace-card-content">
                <strong>{workspace.name}</strong>
                <small>{(workspace.type || 'Workspace').replaceAll('_', ' ')} · {workspace.role}</small>
                <span><Users size={14} /> Open workspace</span>
              </span>
            </button>
          ))}
          <button type="button" className="workspace-create-tile" onClick={() => setModalOpen(true)}><Plus size={22} /><strong>Create a workspace</strong><span>Start a new space for your team</span></button>
        </div></section>
      )}

      {modalOpen && (
        <CreateWorkspaceModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleCreate}
          submitting={submitting}
          error={error}
        />
      )}

    </div>
  )
}
