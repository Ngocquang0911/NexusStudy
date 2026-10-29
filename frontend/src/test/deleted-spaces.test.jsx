import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import DeletedSpacesPage from '../pages/workspace/DeletedSpacesPage.jsx'
import {
  downloadDeletedWorkspaceDocument,
  listDeletedWorkspaceDocuments,
  listDeletedWorkspaces,
} from '../services/workspaceService.js'

vi.mock('../services/workspaceService.js', () => ({
  downloadDeletedWorkspaceDocument: vi.fn(),
  listDeletedWorkspaceDocuments: vi.fn(),
  listDeletedWorkspaces: vi.fn(),
}))

const space = {
  _id: 'deleted-workspace',
  name: 'Java Study',
  type: 'COURSE',
  deletedAt: '2026-10-24T12:00:00.000Z',
  purgeAt: '2026-10-30T12:00:00.000Z',
}

const archive = {
  workspace: space,
  documents: [
    {
      _id: 'document-file',
      fileName: 'lecture-notes.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      isLink: false,
      downloadAvailable: true,
      createdAt: '2026-10-20T12:00:00.000Z',
      expiresAt: '2026-11-20T12:00:00.000Z',
      uploadedBy: { name: 'Member' },
    },
    {
      _id: 'document-link',
      fileName: 'reference',
      fileType: 'link',
      fileSize: 0,
      isLink: true,
      downloadAvailable: false,
      createdAt: '2026-10-20T12:00:00.000Z',
      expiresAt: '2026-11-20T12:00:00.000Z',
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  listDeletedWorkspaces.mockResolvedValue({ data: { data: [space] } })
  listDeletedWorkspaceDocuments.mockResolvedValue({ data: { data: archive } })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  return render(<MemoryRouter><DeletedSpacesPage /></MemoryRouter>)
}

describe('Deleted Spaces archive', () => {
  test('shows retention details, document information, and clearly marks unsupported link downloads', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Deleted Spaces' })).toBeInTheDocument()
    expect(screen.getByText('Java Study')).toBeInTheDocument()
    expect(screen.getByText(/remaining/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View documents' }))
    expect(await screen.findByText('lecture-notes.pdf')).toBeInTheDocument()
    expect(screen.getByText('Link only; no file download')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(downloadDeletedWorkspaceDocument).not.toHaveBeenCalled()
  })

  test('downloads using the archived Space and document IDs through the protected API', async () => {
    downloadDeletedWorkspaceDocument.mockResolvedValue({ data: new Blob(['file']) })
    window.URL.createObjectURL = vi.fn(() => 'blob:archive')
    window.URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'View documents' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Download' }))

    await waitFor(() => {
      expect(downloadDeletedWorkspaceDocument).toHaveBeenCalledWith('deleted-workspace', 'document-file')
    })
  })
})
