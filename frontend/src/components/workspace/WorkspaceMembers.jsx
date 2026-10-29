import { Clock, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { cancelInvitation, inviteMember, removeMember, updateMemberRole } from '../../services/workspaceService.js'

export default function WorkspaceMembers({ workspaceId, members, invitations = [], role, onChanged }) {
  const canManage = role === 'OWNER' || role === 'LEADER'
  const [message, setMessage] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()
  async function invite(values) {
    try {
      await inviteMember(workspaceId, values.email)
      setMessage('Invitation sent. The recipient has 3 days to respond.')
      reset()
      setInviteOpen(false)
      await onChanged()
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to send invitation')
    }
  }
  async function changeRole(userId, nextRole) {
    try { await updateMemberRole(workspaceId, userId, nextRole); await onChanged() }
    catch (error) { setMessage(error.response?.data?.message || 'Unable to update role') }
  }
  async function remove(userId) {
    if (!window.confirm('Remove this member from the workspace?')) return
    try { await removeMember(workspaceId, userId); await onChanged() }
    catch (error) { setMessage(error.response?.data?.message || 'Unable to remove member') }
  }
  async function cancel(invitationId) {
    if (!window.confirm('Cancel this pending invitation?')) return
    try { await cancelInvitation(workspaceId, invitationId); await onChanged() }
    catch (error) { setMessage(error.response?.data?.message || 'Unable to cancel invitation') }
  }

  return (
    <section className="members-section">
      <div className="section-heading">
        <div><span className="eyebrow">PEOPLE</span><h2>Members <small>{members.length}</small></h2></div>
        {canManage && <button className="secondary-action" onClick={() => setInviteOpen((open) => !open)}><UserPlus size={15} /> Invite member</button>}
      </div>
      {inviteOpen && (
        <form className="invite-form" onSubmit={handleSubmit(invite)}>
          <input type="email" {...register('email', { required: true })} placeholder="student@university.edu" aria-label="Invitee email" />
          <button className="primary-action" type="submit">Send invitation</button>
        </form>
      )}
      {message && <p className="member-message" role="status">{message}</p>}
      <div className="member-list">
        {members.map((member) => (
          <div className="member-row" key={member._id}>
            <span className="member-avatar">{member.userId?.name?.slice(0, 2).toUpperCase() || '?'}</span>
            <span className="member-info"><strong>{member.userId?.name || 'Unknown user'}</strong><small>{member.userId?.email}</small></span>
            {canManage && member.role !== 'OWNER' ? (
              <select value={member.role} onChange={(event) => changeRole(member.userId._id, event.target.value)} aria-label={`Role for ${member.userId.name}`}>
                <option>LEADER</option><option>MEMBER</option><option>ADVISOR</option>
              </select>
            ) : <span className={`role-tag ${member.role.toLowerCase()}`}>{member.role}</span>}
            {canManage && member.role !== 'OWNER' && <button className="icon-action danger" onClick={() => remove(member.userId._id)} aria-label={`Remove ${member.userId.name}`}><X size={15} /></button>}
          </div>
        ))}
      </div>
      <div className="pending-invitations">
        <h3>Invitations <small>{invitations.filter((invitation) => invitation.status === 'PENDING').length} pending</small></h3>
        {!invitations.length ? <p className="muted-copy">No invitations yet.</p> : (
          <div className="member-list">
            {invitations.map((invitation) => (
              <div className="member-row" key={invitation._id}>
                <Clock size={16} aria-hidden="true" />
                <span className="member-info">
                  <strong>{invitation.inviteeId?.name || invitation.inviteeId?.email || 'Unknown user'}</strong>
                  <small>{invitation.status === 'PENDING' ? `Respond by ${new Date(invitation.expiresAt).toLocaleString()}` : `Invitation ${invitation.status.toLowerCase()}`}</small>
                </span>
                <span className={`role-tag ${invitation.status.toLowerCase()}`}>{invitation.status}</span>
                {canManage && invitation.status === 'PENDING' && (
                  <button className="icon-action danger" onClick={() => cancel(invitation._id)} aria-label={`Cancel invitation for ${invitation.inviteeId?.email || invitation.inviteeId?.name || 'user'}`}><X size={15} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
