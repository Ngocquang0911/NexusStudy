import { ArrowLeft, Award, BarChart3, LoaderCircle, ShieldAlert, UserCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ContributionReport from '../../components/evaluation/ContributionReport.jsx'
import EvaluationForm from '../../components/evaluation/EvaluationForm.jsx'
import useAuth from '../../hooks/useAuth.js'
import {
  getEvaluationReport,
  getMyEvaluations,
} from '../../services/evaluationService.js'
import { getWorkspace, getWorkspaceMembers, listWorkspaces } from '../../services/workspaceService.js'

export default function EvaluationPage() {
  const { workspaceId: paramWorkspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(paramWorkspaceId || '')
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])

  const [myEvaluations, setMyEvaluations] = useState([])
  const [reportData, setReportData] = useState(null)
  const [reportPrivate, setReportPrivate] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('FORM') // 'FORM' | 'REPORT'

  const activeWsId = paramWorkspaceId || selectedWorkspaceId

  // Load user workspaces list if standalone /evaluations route
  useEffect(() => {
    if (!paramWorkspaceId) {
      listWorkspaces()
        .then(({ data }) => {
          const list = data.data || []
          setWorkspaces(list)
          if (list.length > 0 && !selectedWorkspaceId) {
            setSelectedWorkspaceId(list[0]._id)
          }
        })
        .catch(() => {})
    } else {
      setSelectedWorkspaceId(paramWorkspaceId)
    }
  }, [paramWorkspaceId])

  // Load evaluation data
  const loadEvaluationData = useCallback(async () => {
    if (!activeWsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    setReportPrivate(false)
    try {
      const [memberRes, wsRes, myEvalRes] = await Promise.all([
        getWorkspaceMembers(activeWsId).catch(() => ({ data: { data: [] } })),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
        getMyEvaluations(activeWsId).catch(() => ({ data: { data: [] } })),
      ])

      setMembers(memberRes.data.data || [])
      setWorkspace(wsRes.data.data || null)
      setMyEvaluations(myEvalRes.data.data || [])

      // Load report separately to catch privacy 403 error
      try {
        const reportRes = await getEvaluationReport(activeWsId)
        setReportData(reportRes.data.data || null)
      } catch (repErr) {
        if (repErr.response?.status === 403) {
          setReportPrivate(true)
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load evaluation data')
    } finally {
      setLoading(false)
    }
  }, [activeWsId])

  useEffect(() => {
    loadEvaluationData()
  }, [loadEvaluationData])

  const currentMember = members.find((m) => (m.userId?._id || m.userId) === user?._id)
  const userRole = currentMember?.role || 'MEMBER'
  const isLeader = ['OWNER', 'LEADER'].includes(userRole)

  return (
    <div className="evaluation-page-container">
      {/* Workspace Header & Tabs if inside workspace context */}
      {paramWorkspaceId && workspace ? (
        <div className="workspace-detail-header-block">
          <Link className="back-link" to="/workspaces">
            <ArrowLeft size={16} /> All workspaces
          </Link>
          <section className="workspace-hero">
            <div className="workspace-hero-icon">{workspace.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <span className="eyebrow">{workspace.type}</span>
              <h1>{workspace.name}</h1>
              <p>{workspace.description || 'A focused space for your group to collaborate.'}</p>
            </div>
          </section>

          <nav className="workspace-tabs">
            <Link to={`/workspaces/${paramWorkspaceId}`}>Overview</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/tasks`}>Tasks</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/chat`}>Chat</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/polls`}>Polls</Link>
            <Link to={`/workspaces/${paramWorkspaceId}/documents`}>Documents</Link>
            <Link className="active" to={`/workspaces/${paramWorkspaceId}/evaluations`}>
              Evaluation
            </Link>
            <Link to={`/workspaces/${paramWorkspaceId}/ai`}>AI assistant</Link>
          </nav>
        </div>
      ) : (
        <div className="page-title-row">
          <div>
            <span className="eyebrow">PERFORMANCE ASSESSMENT</span>
            <h1>Peer Evaluation</h1>
            <p>Assess team member contributions and view performance analytics.</p>
          </div>

          <div className="page-actions-right">
            {workspaces.length > 0 && (
              <div className="workspace-select-wrapper">
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  className="workspace-picker-select"
                >
                  {workspaces.map((ws) => (
                    <option key={ws._id} value={ws._id}>
                      Workspace: {ws.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-header view toggle buttons */}
      <div className="evaluation-view-toggle-bar">
        <div className="task-filters-presets">
          <button
            type="button"
            className={`filter-chip ${activeTab === 'FORM' ? 'active' : ''}`}
            onClick={() => setActiveTab('FORM')}
          >
            <UserCheck size={14} /> Submit Evaluation
          </button>
          <button
            type="button"
            className={`filter-chip ${activeTab === 'REPORT' ? 'active' : ''}`}
            onClick={() => setActiveTab('REPORT')}
          >
            <BarChart3 size={14} /> Contribution Report
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="route-loading" style={{ minHeight: '300px' }}>
          <LoaderCircle className="spin" size={24} /> Loading peer evaluation module...
        </div>
      ) : error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : !activeWsId ? (
        <div className="workspace-empty surface-card">
          <Award size={40} />
          <h2>No workspace selected</h2>
          <p>Please select a workspace to participate in peer evaluations.</p>
        </div>
      ) : activeTab === 'FORM' ? (
        <EvaluationForm
          workspaceId={activeWsId}
          members={members}
          currentUserId={user?._id}
          myEvaluations={myEvaluations}
          onSubmitted={loadEvaluationData}
        />
      ) : (
        <ContributionReport
          reportData={reportData}
          isPrivate={reportPrivate}
          isLeader={isLeader}
        />
      )}
    </div>
  )
}
