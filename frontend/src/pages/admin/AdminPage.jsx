import { useDeferredValue, useEffect, useState } from 'react'
import { Activity, Building2, ChevronLeft, ChevronRight, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import { formatDate } from '../../utils/formatDate.js'
import { getAdminOverview, listAdminUsers, listAdminWorkspaces, updateAdminUserRole } from '../../services/adminService.js'
import './AdminPage.css'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'workspaces', label: 'Study rooms' },
]

function errorMessage(error) {
  return error.response?.data?.message || 'Unable to load admin data. Please try again.'
}

function Stat({ label, value, icon: Icon, tone }) {
  return <article className="admin-stat">
    <span className={`admin-stat-icon ${tone}`}><Icon size={18} /></span>
    <span className="admin-stat-label">{label}</span>
    <strong>{Number(value || 0).toLocaleString()}</strong>
  </article>
}

function Pagination({ page, pages, onChange }) {
  return <div className="admin-pagination">
    <span>Page {page} of {Math.max(1, pages)}</span>
    <div>
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft size={17} /></button>
      <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)}><ChevronRight size={17} /></button>
    </div>
  </div>
}

export default function AdminPage() {
  const { user } = useAuth()
  const [section, setSection] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [savingUser, setSavingUser] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const request = section === 'overview'
      ? getAdminOverview().then(({ data }) => { if (active) setOverview(data.data) })
      : section === 'users'
        ? listAdminUsers({ search: deferredSearch, role: roleFilter, page }).then(({ data }) => {
          if (active) { setRows(data.data.users); setPages(data.data.pages) }
        })
        : listAdminWorkspaces({ search: deferredSearch, page }).then(({ data }) => {
          if (active) { setRows(data.data.workspaces); setPages(data.data.pages) }
        })

    request.catch((requestError) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [section, deferredSearch, roleFilter, page, refresh])

  function changeSection(nextSection) {
    setSection(nextSection)
    setSearch('')
    setRoleFilter('')
    setPage(1)
    setNotice('')
  }

  async function changeRole(targetUser, systemRole) {
    setSavingUser(targetUser._id)
    setNotice('')
    setError('')
    try {
      const { data } = await updateAdminUserRole(targetUser._id, systemRole)
      setRows((current) => current.map((row) => row._id === targetUser._id ? data.data : row))
      setNotice(`Role updated for ${targetUser.name}.`)
    } catch (requestError) {
      setError(errorMessage(requestError))
      setRefresh((value) => value + 1)
    } finally {
      setSavingUser('')
    }
  }

  return <section className="admin-page">
    <header className="admin-heading">
      <div>
        <span className="eyebrow">SYSTEM CONTROL</span>
        <h1>Administration</h1>
        <p>Manage accounts and keep study spaces in view.</p>
      </div>
      <button className="admin-refresh" type="button" onClick={() => setRefresh((value) => value + 1)} aria-label="Refresh admin data" title="Refresh">
        <RefreshCw size={17} />
      </button>
    </header>

    <nav className="admin-tabs" aria-label="Admin sections">
      {sections.map(({ id, label }) => <button key={id} type="button" className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined} onClick={() => changeSection(id)}>{label}</button>)}
    </nav>

    {error && <p className="admin-alert" role="alert">{error}</p>}
    {notice && <p className="admin-notice" role="status">{notice}</p>}

    {section === 'overview' && <>
      <div className="admin-stats-grid">
        <Stat label="Registered users" value={overview?.users} icon={Users} tone="coral" />
        <Stat label="Administrators" value={overview?.admins} icon={ShieldCheck} tone="green" />
        <Stat label="Study rooms" value={overview?.workspaces} icon={Building2} tone="blue" />
        <Stat label="Shared records" value={(overview?.tasks || 0) + (overview?.polls || 0) + (overview?.documents || 0) + (overview?.messages || 0)} icon={Activity} tone="gold" />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Recently registered</h2><p>Latest accounts created on NEXUS STUDY.</p></div><button type="button" onClick={() => changeSection('users')}>View users <ChevronRight size={15} /></button></div>
        {loading ? <p className="admin-empty">Loading overview...</p> : <div className="admin-table-scroll"><table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>System role</th><th>Joined</th></tr></thead>
          <tbody>{(overview?.recentUsers || []).map((item) => <tr key={item._id}><td className="admin-user-name">{item.name}</td><td>{item.email}</td><td><span className={`admin-role-badge ${item.systemRole.toLowerCase()}`}>{item.systemRole}</span></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody>
        </table>{!overview?.recentUsers?.length && <p className="admin-empty">No users registered yet.</p>}</div>}
      </section>
    </>}

    {section !== 'overview' && <section className="admin-panel admin-directory">
      <div className="admin-panel-heading"><div><h2>{section === 'users' ? 'User accounts' : 'Study rooms'}</h2><p>{section === 'users' ? 'Search accounts and manage system-level roles.' : 'Review study spaces and their owners.'}</p></div></div>
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={17} /><input aria-label={`Search ${section}`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder={section === 'users' ? 'Search name or email' : 'Search study rooms'} /></label>
        {section === 'users' && <select aria-label="Filter by system role" value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }}><option value="">All roles</option><option value="STUDENT">Student</option><option value="LECTURER">Lecturer</option><option value="ADMIN">Admin</option></select>}
      </div>
      {loading ? <p className="admin-empty">Loading {section}...</p> : section === 'users' ? <div className="admin-table-scroll"><table className="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>System role</th></tr></thead>
        <tbody>{rows.map((item) => <tr key={item._id}><td className="admin-user-name">{item.name}{item._id === user?._id && <small className="admin-you">You</small>}</td><td>{item.email}</td><td>{formatDate(item.createdAt)}</td><td><select aria-label={`Role for ${item.name}`} value={item.systemRole} disabled={savingUser === item._id || item._id === user?._id} onChange={(event) => changeRole(item, event.target.value)}><option value="STUDENT">Student</option><option value="LECTURER">Lecturer</option><option value="ADMIN">Admin</option></select></td></tr>)}</tbody>
      </table>{!rows.length && <p className="admin-empty">No users match this search.</p>}</div> : <div className="admin-table-scroll"><table className="admin-table">
        <thead><tr><th>Study room</th><th>Type</th><th>Owner</th><th>Created</th></tr></thead>
        <tbody>{rows.map((item) => <tr key={item._id}><td className="admin-user-name">{item.name}<small className="admin-room-description">{item.description || 'No description'}</small></td><td><span className="admin-role-badge workspace">{item.type.replaceAll('_', ' ')}</span></td><td>{item.ownerId?.name || 'Unknown'}<small className="admin-room-description">{item.ownerId?.email || ''}</small></td><td>{formatDate(item.createdAt)}</td></tr>)}</tbody>
      </table>{!rows.length && (search
        ? <p className="admin-empty">No study rooms match this search.</p>
        : <div className="admin-empty-state"><span><Building2 size={20} /></span><h3>No study rooms yet</h3><p>Create a workspace first; it will appear here for system-wide review.</p><Link to="/workspaces" className="admin-empty-action">Open workspaces</Link></div>)}</div>}
      {!loading && pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
    </section>}
  </section>
}