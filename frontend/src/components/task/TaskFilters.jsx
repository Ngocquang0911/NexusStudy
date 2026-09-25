import { Filter, Search, X } from 'lucide-react'

export default function TaskFilters({ filters, setFilters, members = [], currentUserId }) {
  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const handlePreset = (preset) => {
    switch (preset) {
      case 'MY_TASKS':
        setFilters((prev) => ({ ...prev, assignee: currentUserId, status: 'ALL', priority: 'ALL', search: '' }))
        break
      case 'HIGH_PRIORITY':
        setFilters((prev) => ({ ...prev, priority: 'HIGH', assignee: 'ALL', status: 'ALL', search: '' }))
        break
      case 'DUE_SOON':
        setFilters((prev) => ({ ...prev, preset: 'DUE_SOON', assignee: 'ALL', status: 'ALL', priority: 'ALL', search: '' }))
        break
      case 'COMPLETED':
        setFilters((prev) => ({ ...prev, status: 'DONE', assignee: 'ALL', priority: 'ALL', search: '' }))
        break
      case 'ALL':
      default:
        setFilters({ search: '', status: 'ALL', priority: 'ALL', assignee: 'ALL', preset: 'ALL' })
        break
    }
  }

  const isFiltered = filters.search || filters.status !== 'ALL' || filters.priority !== 'ALL' || filters.assignee !== 'ALL' || filters.preset !== 'ALL'

  const resetFilters = () => {
    setFilters({ search: '', status: 'ALL', priority: 'ALL', assignee: 'ALL', preset: 'ALL' })
  }

  return (
    <div className="task-filters-container">
      <div className="task-filters-presets">
        <button
          type="button"
          className={`filter-chip ${filters.preset === 'ALL' && filters.status === 'ALL' && filters.priority === 'ALL' && filters.assignee === 'ALL' ? 'active' : ''}`}
          onClick={() => handlePreset('ALL')}
        >
          All Tasks
        </button>
        <button
          type="button"
          className={`filter-chip ${filters.assignee === currentUserId ? 'active' : ''}`}
          onClick={() => handlePreset('MY_TASKS')}
        >
          My Tasks
        </button>
        <button
          type="button"
          className={`filter-chip ${filters.priority === 'HIGH' ? 'active' : ''}`}
          onClick={() => handlePreset('HIGH_PRIORITY')}
        >
          High Priority
        </button>
        <button
          type="button"
          className={`filter-chip ${filters.preset === 'DUE_SOON' ? 'active' : ''}`}
          onClick={() => handlePreset('DUE_SOON')}
        >
          Due Soon
        </button>
        <button
          type="button"
          className={`filter-chip ${filters.status === 'DONE' ? 'active' : ''}`}
          onClick={() => handlePreset('COMPLETED')}
        >
          Completed
        </button>
      </div>

      <div className="task-filters-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search task title..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
          {filters.search && (
            <button type="button" className="clear-search" onClick={() => handleChange('search', '')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          <div className="select-group">
            <Filter size={14} className="select-icon" />
            <select value={filters.status} onChange={(e) => handleChange('status', e.target.value)}>
              <option value="ALL">Status: All</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          <div className="select-group">
            <select value={filters.priority} onChange={(e) => handleChange('priority', e.target.value)}>
              <option value="ALL">Priority: All</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {members.length > 0 && (
            <div className="select-group">
              <select value={filters.assignee} onChange={(e) => handleChange('assignee', e.target.value)}>
                <option value="ALL">Assignee: All</option>
                <option value={currentUserId}>Assigned to Me</option>
                <option value="UNASSIGNED">Unassigned</option>
                {members.map((member) => {
                  const mUser = member.userId || member
                  if (mUser._id === currentUserId) return null
                  return (
                    <option key={mUser._id} value={mUser._id}>
                      {mUser.name || mUser.email}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {isFiltered && (
            <button type="button" className="reset-filters-btn" onClick={resetFilters}>
              <X size={14} /> Reset
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
