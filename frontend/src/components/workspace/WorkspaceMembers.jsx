import { MoreHorizontal, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { inviteMember, removeMember, updateMemberRole } from '../../services/workspaceService.js'

export default function WorkspaceMembers({ workspaceId, members, role, onChanged }) {
  const canManage = role === 'OWNER' || role === 'LEADER'
  const [message, setMessage] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const { register, handleSubmit, reset } = useForm()
  async function invite(values) { try { const response = await inviteMember(workspaceId, values.email); setMessage(`Member ${response.data.data.user.email} added to workspace! Code: ${response.data.data.inviteCode}`); reset(); setInviteOpen(false); onChanged() } catch (error) { setMessage(error.response?.data?.message || 'Unable to invite member') } }
  async function changeRole(userId, nextRole) { try { await updateMemberRole(workspaceId, userId, nextRole); onChanged() } catch (error) { setMessage(error.response?.data?.message || 'Unable to update role') } }
  async function remove(userId) { if (!window.confirm('Remove this member from the workspace?')) return; try { await removeMember(workspaceId, userId); onChanged() } catch (error) { setMessage(error.response?.data?.message || 'Unable to remove member') } }
  return <section className="members-section"><div className="section-heading"><div><span className="eyebrow">PEOPLE</span><h2>Members <small>{members.length}</small></h2></div>{canManage && <button className="secondary-action" onClick={() => setInviteOpen((open) => !open)}><UserPlus size={15} /> Invite member</button>}</div>{inviteOpen && <form className="invite-form" onSubmit={handleSubmit(invite)}><input type="email" {...register('email', { required: true })} placeholder="student@university.edu" /><button className="primary-action" type="submit">Prepare invite</button></form>}{message && <p className="member-message">{message}</p>}<div className="member-list">{members.map((member) => <div className="member-row" key={member._id}><span className="member-avatar">{member.userId?.name?.slice(0, 2).toUpperCase() || '?'}</span><span className="member-info"><strong>{member.userId?.name || 'Unknown user'}</strong><small>{member.userId?.email}</small></span>{canManage && member.role !== 'OWNER' ? <select value={member.role} onChange={(event) => changeRole(member.userId._id, event.target.value)} aria-label={`Role for ${member.userId.name}`}><option>LEADER</option><option>MEMBER</option><option>ADVISOR</option></select> : <span className={`role-tag ${member.role.toLowerCase()}`}>{member.role}</span>}{canManage && member.role !== 'OWNER' && <button className="icon-action danger" onClick={() => remove(member.userId._id)} aria-label={`Remove ${member.userId.name}`}><X size={15} /></button>}</div>)}</div></section>
}
