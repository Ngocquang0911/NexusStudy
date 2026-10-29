import { Archive, Download, FileText, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadDeletedWorkspaceDocument, listDeletedWorkspaceDocuments, listDeletedWorkspaces } from '../../services/workspaceService.js'
import { formatDate, formatFileSize } from '../../utils/formatDate.js'

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function timeRemaining(value, now) {
  const remaining = Math.max(0, new Date(value).getTime() - now)
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  if (days) return `${days}d ${hours}h remaining`
  if (hours) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

function responseError(error, fallback) {
  return error.response?.data?.message || fallback
}

export default function DeletedSpacesPage() {
  const [spaces, setSpaces] = useState([])
  const [documentsBySpace, setDocumentsBySpace] = useState({})
  const [expandedSpace, setExpandedSpace] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingDocuments, setLoadingDocuments] = useState('')
  const [downloadingId, setDownloadingId] = useState('')
  const [error, setError] = useState('')
  const [documentErrors, setDocumentErrors] = useState({})
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let active = true
    listDeletedWorkspaces()
      .then(({ data }) => { if (active) setSpaces(data.data || []) })
      .catch((requestError) => { if (active) setError(responseError(requestError, 'Unable to load deleted Spaces.')) })
      .finally(() => { if (active) setLoading(false) })
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const visibleSpaces = spaces.filter((space) => new Date(space.purgeAt).getTime() > now)

  async function toggleSpace(spaceId) {
    setError('')
    if (expandedSpace === spaceId) {
      setExpandedSpace('')
      return
    }
    setExpandedSpace(spaceId)
    if (documentsBySpace[spaceId]) return
    setLoadingDocuments(spaceId)
    try {
      const { data } = await listDeletedWorkspaceDocuments(spaceId)
      setDocumentsBySpace((current) => ({ ...current, [spaceId]: data.data }))
    } catch (requestError) {
      setDocumentErrors((current) => ({ ...current, [spaceId]: responseError(requestError, 'Unable to load archived documents.') }))
    } finally {
      setLoadingDocuments('')
    }
  }

  async function handleDownload(spaceId, document) {
    setDownloadingId(document._id)
    setDocumentErrors((current) => ({ ...current, [spaceId]: '' }))
    try {
      const { data } = await downloadDeletedWorkspaceDocument(spaceId, document._id)
      const url = window.URL.createObjectURL(new Blob([data], { type: document.fileType || 'application/octet-stream' }))
      const anchor = window.document.createElement('a')
      anchor.href = url
      anchor.download = document.fileName
      window.document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      setDocumentErrors((current) => ({ ...current, [spaceId]: responseError(requestError, 'Unable to download this file. It may have expired or been removed.') }))
    } finally {
      setDownloadingId('')
    }
  }

  if (loading) return <div className="route-loading"><LoaderCircle className="spin" size={22} /> Loading deleted Spaces...</div>

  return (
    <div className="deleted-spaces-page">
      <section className="page-title-row">
        <div>
          <span className="eyebrow">TEMPORARY DATA ACCESS</span>
          <h1>Deleted Spaces</h1>
          <p>Spaces you belonged to when their owner deleted them. Access ends when the retention period expires.</p>
        </div>
      </section>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <p className="archive-format-notice">
        The archive supports documents stored in the workspace. Chat and task attachments are external URL references,
        not files stored by NEXUS STUDY, so they cannot be securely downloaded from this archive.
      </p>
      {visibleSpaces.length === 0 ? (
        <div className="surface-card deleted-spaces-empty">
          <Archive size={28} />
          <h2>No deleted Spaces available</h2>
          <p>Spaces you belonged to at the time of deletion will appear here for up to five days.</p>
        </div>
      ) : (
        <div className="deleted-space-list">
          {visibleSpaces.map((space) => {
            const isExpanded = expandedSpace === space._id
            const archive = documentsBySpace[space._id]
            const visibleDocuments = archive?.documents?.filter(
              (document) => !document.expiresAt || new Date(document.expiresAt).getTime() > now,
            ) || []
            return (
              <section className="surface-card deleted-space-card" key={space._id}>
                <div className="deleted-space-heading">
                  <span className="workspace-card-icon">{space.name.slice(0, 1).toUpperCase()}</span>
                  <div className="deleted-space-summary">
                    <span className="eyebrow">{space.type} · DELETED</span>
                    <h2>{space.name}</h2>
                    <p>Deleted {formatDateTime(space.deletedAt)} · Permanently removed {formatDateTime(space.purgeAt)}</p>
                    <strong className="archive-countdown">{timeRemaining(space.purgeAt, now)}</strong>
                  </div>
                  <button className="secondary-action" type="button" onClick={() => toggleSpace(space._id)}>
                    {isExpanded ? 'Hide documents' : 'View documents'}
                  </button>
                </div>
                {isExpanded && (
                  <div className="deleted-space-documents">
                    {loadingDocuments === space._id ? (
                      <div className="route-loading"><LoaderCircle className="spin" size={18} /> Loading documents...</div>
                    ) : documentErrors[space._id] ? (
                      <div className="inline-error" role="alert">{documentErrors[space._id]}</div>
                    ) : !visibleDocuments.length ? (
                      <p className="muted-copy">No unexpired documents are available in this Space archive.</p>
                    ) : (
                      <div className="archived-document-list">
                        {visibleDocuments.map((document) => (
                          <article className="archived-document" key={document._id}>
                            <span className="archived-document-icon"><FileText size={18} /></span>
                            <div className="archived-document-main">
                              <strong>{document.fileName}</strong>
                              <small>{document.isLink ? 'External link · download unavailable' : formatFileSize(document.fileSize)} · Uploaded {formatDate(document.createdAt)}</small>
                              <details>
                                <summary>Document information</summary>
                                <p>Type: {document.fileType || 'Unknown'} · Uploaded by {document.uploadedBy?.name || document.uploadedBy?.email || 'Workspace member'}</p>
                                <p>Original file retention ends {formatDateTime(document.expiresAt || space.purgeAt)}. Space archive access ends {formatDateTime(space.purgeAt)}.</p>
                              </details>
                            </div>
                            {document.downloadAvailable ? (
                              <button
                                className="secondary-action"
                                type="button"
                                disabled={downloadingId === document._id}
                                onClick={() => handleDownload(space._id, document)}
                              >
                                <Download size={15} /> {downloadingId === document._id ? 'Downloading…' : 'Download'}
                              </button>
                            ) : (
                              <span className="archive-unsupported">Link only; no file download</span>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
