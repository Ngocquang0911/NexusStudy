import { ArrowLeft, FileText, HardDrive, LoaderCircle, Plus, Search, UploadCloud } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DocumentCard from '../../components/document/DocumentCard.jsx'
import UploadDocumentModal from '../../components/document/UploadDocumentModal.jsx'
import useAuth from '../../hooks/useAuth.js'
import {
  addDocumentLink,
  deleteDocument,
  listDocuments,
  uploadDocument,
} from '../../services/documentService.js'
import { getWorkspace, getWorkspaceMembers, listWorkspaces } from '../../services/workspaceService.js'
import { formatFileSize } from '../../utils/formatDate.js'

export default function DocumentsPage() {
  const params = useParams()
  const workspaceId = params.workspaceId
  const navigate = useNavigate()
  const { user } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceId || '')
  const [workspace, setWorkspace] = useState(null)
  const [members, setMembers] = useState([])

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Upload modal states
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL') // ALL, IMAGE, PDF, DOC, ZIP, CODE

  const activeWsId = workspaceId || selectedWorkspaceId

  // Load user workspaces list if standalone /documents route
  useEffect(() => {
    if (!workspaceId) {
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
      setSelectedWorkspaceId(workspaceId)
    }
  }, [workspaceId])

  // Load workspace details & documents
  const loadDocumentsData = useCallback(async () => {
    if (!activeWsId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [docsRes, memberRes, wsRes] = await Promise.all([
        listDocuments(activeWsId),
        getWorkspaceMembers(activeWsId).catch(() => ({ data: { data: [] } })),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
      ])

      setDocuments(docsRes.data.data || [])
      setMembers(memberRes.data.data || [])
      setWorkspace(wsRes.data.data || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workspace documents')
    } finally {
      setLoading(false)
    }
  }, [activeWsId])

  useEffect(() => {
    loadDocumentsData()
  }, [loadDocumentsData])

  // Handlers
  const handleUploadSubmit = async (formData) => {
    setUploadLoading(true)
    setUploadProgress(0)
    try {
      await uploadDocument(activeWsId, formData, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percent)
        }
      })
      await loadDocumentsData()
      setIsUploadOpen(false)
    } finally {
      setUploadLoading(false)
      setUploadProgress(0)
    }
  }

  const handleUploadLinkSubmit = async (payload) => {
    setUploadLoading(true)
    try {
      await addDocumentLink(activeWsId, payload)
      await loadDocumentsData()
      setIsUploadOpen(false)
    } finally {
      setUploadLoading(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return
    try {
      await deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d._id !== docId))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete document')
    }
  }

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    // Search by file name
    if (searchTerm && !doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    // Category filter
    const ext = doc.fileName.split('.').pop()?.toLowerCase() || ''
    const type = doc.fileType || ''

    if (categoryFilter === 'IMAGE') {
      return type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)
    }
    if (categoryFilter === 'PDF') {
      return type.includes('pdf') || ext === 'pdf'
    }
    if (categoryFilter === 'ZIP') {
      return ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || type.includes('zip')
    }
    if (categoryFilter === 'CODE') {
      return ['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext) || type.startsWith('text/')
    }

    return true
  })

  const currentMember = members.find((m) => (m.userId?._id || m.userId) === user?._id)
  const userRole = currentMember?.role || 'MEMBER'

  // Calculations
  const totalStorageBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0)

  return (
    <div className="document-page-container">
      {/* Workspace Header & Tabs if inside workspace context */}
      {workspaceId && workspace ? (
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
            <Link to={`/workspaces/${workspaceId}`}>Overview</Link>
            <Link to={`/workspaces/${workspaceId}/tasks`}>Tasks</Link>
            <Link to={`/workspaces/${workspaceId}/chat`}>Chat</Link>
            <Link to={`/workspaces/${workspaceId}/polls`}>Polls</Link>
            <Link className="active" to={`/workspaces/${workspaceId}/documents`}>
              Documents
            </Link>
            <Link to={`/workspaces/${workspaceId}/evaluations`}>Evaluation</Link>
            <Link to={`/workspaces/${workspaceId}/ai`}>AI assistant</Link>
          </nav>
        </div>
      ) : (
        <div className="page-title-row">
          <div>
            <span className="eyebrow">FILE REPOSITORY</span>
            <h1>Workspace Documents</h1>
            <p>Upload, organize, and share study materials and project files.</p>
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
            <button
              type="button"
              className="primary-action"
              onClick={() => setIsUploadOpen(true)}
              disabled={!activeWsId}
            >
              <UploadCloud size={16} /> Upload Document
            </button>
          </div>
        </div>
      )}

      {/* Page Sub-header for workspace view */}
      {workspaceId && (
        <div className="task-page-sub-header">
          <div className="section-title">
            <h2>Resource Library</h2>
            <p>Shared files, documents, and reference materials.</p>
          </div>
          <button
            type="button"
            className="primary-action"
            onClick={() => setIsUploadOpen(true)}
          >
            <UploadCloud size={16} /> Upload Document
          </button>
        </div>
      )}

      {/* Metrics Summary Card */}
      <div className="task-stats-summary-card">
        <div className="stat-pill">
          <span className="stat-num">{documents.length}</span>
          <span className="stat-label">Total Files</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-pill">
          <span className="stat-num text-blue">{formatFileSize(totalStorageBytes)}</span>
          <span className="stat-label">Storage Used</span>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="task-filters-container">
        <div className="task-filters-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search file name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="task-filters-presets">
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ALL')}
            >
              All Files
            </button>
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'PDF' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('PDF')}
            >
              PDFs
            </button>
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'IMAGE' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('IMAGE')}
            >
              Images
            </button>
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'ZIP' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('ZIP')}
            >
              Archives
            </button>
            <button
              type="button"
              className={`filter-chip ${categoryFilter === 'CODE' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('CODE')}
            >
              Code / Text
            </button>
          </div>
        </div>
      </div>

      {/* Document Grid Feed */}
      {loading ? (
        <div className="route-loading" style={{ minHeight: '300px' }}>
          <LoaderCircle className="spin" size={24} /> Loading documents...
        </div>
      ) : error ? (
        <div className="inline-error" role="alert">
          {error}
        </div>
      ) : !activeWsId ? (
        <div className="workspace-empty surface-card">
          <FileText size={40} />
          <h2>No workspace selected</h2>
          <p>Please select a workspace to view or upload documents.</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="workspace-empty surface-card">
          <FileText size={40} />
          <h2>No documents found</h2>
          <p>Upload files to start building your workspace resource library.</p>
          <button
            type="button"
            className="primary-action margin-top-md"
            onClick={() => setIsUploadOpen(true)}
          >
            <UploadCloud size={16} /> Upload First File
          </button>
        </div>
      ) : (
        <div className="documents-grid-layout">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc._id}
              document={doc}
              onDelete={handleDeleteDocument}
              currentUserId={user?._id}
              userRole={userRole}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUploadSubmit}
        onUploadLink={handleUploadLinkSubmit}
        loading={uploadLoading}
        uploadProgress={uploadProgress}
      />
    </div>
  )
}
