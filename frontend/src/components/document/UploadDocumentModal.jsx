import { FileUp, Link2, LoaderCircle, UploadCloud, X } from 'lucide-react'
import { useState } from 'react'
import { formatFileSize } from '../../utils/formatDate.js'

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onUpload,
  onUploadLink,
  loading = false,
  uploadProgress = 0,
}) {
  const [mode, setMode] = useState('FILE') // 'FILE' | 'LINK'
  const [selectedFile, setSelectedFile] = useState(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState('')

  if (!isOpen) return null

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setFormError('')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
      setFormError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (mode === 'FILE') {
      if (!selectedFile) {
        setFormError('Please select a file to upload')
        return
      }
      const formData = new FormData()
      formData.append('file', selectedFile)

      try {
        await onUpload(formData)
        setSelectedFile(null)
        onClose()
      } catch (err) {
        setFormError(err.response?.data?.message || err.message || 'Failed to upload document')
      }
    } else {
      if (!linkTitle.trim()) {
        setFormError('Please enter a link title')
        return
      }
      if (!linkUrl.trim()) {
        setFormError('Please enter a valid URL')
        return
      }

      try {
        await onUploadLink({ fileName: linkTitle.trim(), fileUrl: linkUrl.trim() })
        setLinkTitle('')
        setLinkUrl('')
        onClose()
      } catch (err) {
        setFormError(err.response?.data?.message || err.message || 'Failed to add link')
      }
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="workspace-modal upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <h2>Add Document / Link</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="task-filters-presets" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`filter-chip ${mode === 'FILE' ? 'active' : ''}`}
            onClick={() => { setMode('FILE'); setFormError('') }}
          >
            <UploadCloud size={14} /> Upload File
          </button>
          <button
            type="button"
            className={`filter-chip ${mode === 'LINK' ? 'active' : ''}`}
            onClick={() => { setMode('LINK'); setFormError('') }}
          >
            <Link2 size={14} /> Attach Link / URL
          </button>
        </div>

        {formError && <p className="form-error">{formError}</p>}

        <form onSubmit={handleSubmit}>
          {mode === 'FILE' ? (
            /* File Dropzone */
            <div
              className={`file-dropzone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="document-file-input"
                className="file-hidden-input"
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="selected-file-preview">
                  <FileUp size={32} className="file-icon" />
                  <div className="file-details">
                    <strong>{selectedFile.name}</strong>
                    <small>{formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}</small>
                  </div>
                  <button
                    type="button"
                    className="clear-file-btn"
                    onClick={() => setSelectedFile(null)}
                    title="Choose another file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label htmlFor="document-file-input" className="dropzone-label">
                  <UploadCloud size={40} className="cloud-icon" />
                  <strong>Click to upload or drag & drop file here</strong>
                  <small>Supports PDFs, Documents, Images, Archives, and Code files</small>
                </label>
              )}
            </div>
          ) : (
            /* Link Inputs */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '12px 0' }}>
              <label>
                Document / Resource Title *
                <input
                  type="text"
                  placeholder="e.g. Báo cáo Google Drive, Figma Design System, GitHub Repo..."
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  autoFocus
                />
              </label>

              <label>
                URL Link *
                <input
                  type="text"
                  placeholder="https://drive.google.com/... or https://figma.com/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Upload Progress Bar */}
          {loading && mode === 'FILE' && (
            <div className="upload-progress-wrapper">
              <div className="progress-info">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="stat-progress-bar-bg">
                <div className="stat-progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-action"
              disabled={loading || (mode === 'FILE' ? !selectedFile : (!linkTitle.trim() || !linkUrl.trim()))}
            >
              {loading && <LoaderCircle className="spin" size={16} />}
              {mode === 'FILE' ? 'Upload File' : 'Save Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
