import { ArrowLeft, Bot, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AiChatWindow from '../../components/ai/AiChatWindow.jsx'
import AiQuickTools from '../../components/ai/AiQuickTools.jsx'
import useAuth from '../../hooks/useAuth.js'
import {
  askAi,
  generateFlashcards,
  generateQuiz,
  suggestTaskDistribution,
  summarizeDocument,
} from '../../services/aiService.js'
import { listDocuments } from '../../services/documentService.js'
import { getWorkspace, listWorkspaces } from '../../services/workspaceService.js'

export default function AIAssistantPage() {
  const { workspaceId: paramWorkspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(paramWorkspaceId || '')
  const [workspace, setWorkspace] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])

  const [messages, setMessages] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')

  const activeWsId = paramWorkspaceId || selectedWorkspaceId

  // Load user workspaces list if standalone /ai route
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

  // Load workspace details & documents
  const loadWorkspaceData = useCallback(async () => {
    if (!activeWsId) return
    setError('')
    try {
      const [docsRes, wsRes] = await Promise.all([
        listDocuments(activeWsId).catch(() => ({ data: { data: [] } })),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
      ])

      const docList = docsRes.data.data || []
      setDocuments(docList)
      setWorkspace(wsRes.data.data || null)
    } catch (err) {
      console.error('Failed to load AI workspace context:', err)
    }
  }, [activeWsId])

  useEffect(() => {
    loadWorkspaceData()
  }, [loadWorkspaceData])

  // AI Actions
  const handleSendMessage = async (userQuestion) => {
    if (!activeWsId) return
    setError('')
    const userMsg = { role: 'user', content: userQuestion }
    setMessages((prev) => [...prev, userMsg])
    setAiLoading(true)

    try {
      const { data } = await askAi({
        workspaceId: activeWsId,
        documentIds: selectedDocIds,
        question: userQuestion,
      })

      const aiData = data.data || {}
      const aiMsg = {
        role: 'assistant',
        content: aiData.answer || 'No response generated.',
        sourceDocuments: aiData.sourceDocuments || [],
      }

      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'AI assistant request failed')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.response?.data?.message || 'Unable to connect to AI assistant.'}`,
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  const handleQuickAction = async (actionType) => {
    if (!activeWsId) return
    setError('')
    setAiLoading(true)

    let promptText = ''
    let apiCall

    if (actionType === 'SUMMARIZE') {
      promptText = 'Generate a summary of the selected workspace documents.'
      apiCall = summarizeDocument({ workspaceId: activeWsId, documentIds: selectedDocIds })
    } else if (actionType === 'QUIZ') {
      promptText = 'Generate a 5-question revision quiz from workspace documents.'
      apiCall = generateQuiz({ workspaceId: activeWsId, documentIds: selectedDocIds, count: 5 })
    } else if (actionType === 'FLASHCARDS') {
      promptText = 'Generate 10 revision flashcards from workspace documents.'
      apiCall = generateFlashcards({ workspaceId: activeWsId, documentIds: selectedDocIds, count: 10 })
    } else if (actionType === 'TASK_SUGGESTION') {
      promptText = 'Suggest workload distribution and task priorities.'
      apiCall = suggestTaskDistribution({ workspaceId: activeWsId })
    }

    setMessages((prev) => [...prev, { role: 'user', content: promptText }])

    try {
      const { data } = await apiCall
      const aiData = data.data || {}
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: aiData.answer || 'Tool output generated.',
          sourceDocuments: aiData.sourceDocuments || [],
        },
      ])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate AI tool output')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.response?.data?.message || 'Failed to complete action.'}`,
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="ai-page-container">
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
            <Link to={`/workspaces/${paramWorkspaceId}/evaluations`}>Evaluation</Link>
            <Link className="active" to={`/workspaces/${paramWorkspaceId}/ai`}>
              AI assistant
            </Link>
          </nav>
        </div>
      ) : (
        <div className="page-title-row">
          <div>
            <span className="eyebrow">INTELLIGENT STUDY COMPANION</span>
            <h1>NEXUS AI Assistant</h1>
            <p>Ask questions, summarize documents, generate revision quizzes & flashcards.</p>
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

      {/* Quick Action Tools Bar */}
      <AiQuickTools
        onSelectAction={handleQuickAction}
        loading={aiLoading}
        documentCount={documents.length}
      />

      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}

      {/* Main Chat Interface Window */}
      <AiChatWindow
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={aiLoading}
        documents={documents}
        selectedDocIds={selectedDocIds}
        onDocSelectionChange={setSelectedDocIds}
      />
    </div>
  )
}
