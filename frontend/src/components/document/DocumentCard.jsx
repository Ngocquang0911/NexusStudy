import { Archive, Download, ExternalLink, File, FileCode, FileText, Image, Link2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import useAuth from '../../hooks/useAuth.js'
import api from '../../services/api.js'
import { formatDate, formatFileSize } from '../../utils/formatDate.js'

export default function DocumentCard({ document: doc, onDelete, currentUserId, userRole }) {
  const { token } = useAuth()
  const [downloading, setDownloading] = useState(false)
  const uploader = doc.uploadedBy || {}
  const uploaderName = uploader.name || uploader.email || 'Workspace Member'
  const isUploader = (uploader._id || uploader) === currentUserId
  const isLeader = ['OWNER', 'LEADER'].includes(userRole)
  const canDelete = isUploader || isLeader

  const isLink = Boolean(doc.isLink || doc.fileType === 'link')

  const getFileIcon = (fileType = '', fileName = '') => {
    if (isLink) {
      return <Link2 size={24} className="file-type-icon link" />
    }
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
      return <Image size={24} className="file-type-icon image" />
    }
    if (fileType.includes('pdf') || ext === 'pdf') {
      return <FileText size={24} className="file-type-icon pdf" />
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || fileType.includes('zip') || fileType.includes('compressed')) {
      return <Archive size={24} className="file-type-icon archive" />
    }
    if (['js', 'ts', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext) || fileType.startsWith('text/')) {
      return <FileCode size={24} className="file-type-icon code" />
    }
    return <File size={24} className="file-type-icon default" />
  }

  // Construct download URL using backend origin + token query param
  const getDownloadUrl = () => {
    const baseUrl = window.location.origin.includes('5173')
      ? 'http://localhost:5000'
      : window.location.origin
    return `${baseUrl}/api/documents/${doc._id}/download?token=${token || ''}`
  }

  const downloadUrl = getDownloadUrl()

  const handleDownload = async (event) => {
    event.preventDefault()
    setDownloading(true)
    try {
      const response = await api.get(`/documents/${doc._id}/download`, { responseType: 'blob' })
      const blob = new Blob([response.data], { type: doc.fileType || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (_err) {
      window.open(downloadUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="document-card surface-card">
      <div className="document-card-top">
        <div className="document-icon-wrapper">{getFileIcon(doc.fileType, doc.fileName)}</div>
        <div className="document-info">
          <h4 className="document-name" title={doc.fileName}>
            {doc.fileName}
          </h4>
          <span className="document-size">{isLink ? 'External Link' : formatFileSize(doc.fileSize)}</span>
        </div>
      </div>

      <div className="document-meta-row">
        <div className="uploader-info">
          <div className="mini-avatar">{uploaderName.charAt(0).toUpperCase()}</div>
          <div>
            <strong className="uploader-name">{uploaderName}</strong>
            <small className="upload-date">{formatDate(doc.createdAt)}</small>
          </div>
        </div>
      </div>

      <div className="document-card-actions">
        {isLink ? (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-action text-xs"
          >
            <ExternalLink size={14} /> Open Link
          </a>
        ) : (
          <a
            href={downloadUrl}
            onClick={handleDownload}
            target="_blank"
            rel="noopener noreferrer"
            download={doc.fileName}
            className="secondary-action text-xs"
          >
            <Download size={14} /> {downloading ? 'Downloading...' : 'Download'}
          </a>
        )}

        {canDelete && (
          <button
            type="button"
            className="icon-action danger"
            onClick={() => onDelete(doc._id)}
            title="Delete Document"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
