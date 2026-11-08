import { readWorkspaceHeader } from '../../utils/workspaceHeaderCache.js'
import { ArrowLeft, Check, Clock3, LoaderCircle, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AiChatWindow from '../../components/ai/AiChatWindow.jsx'
import AiQuickTools from '../../components/ai/AiQuickTools.jsx'
import useAuth from '../../hooks/useAuth.js'
import {
  askAi,
  confirmSuggestedTasks,
  generateFlashcards,
  generateQuiz,
  suggestTaskDistribution,
  summarizeDocument,
} from '../../services/aiService.js'
import { listDocuments } from '../../services/documentService.js'
import { getWorkspace, listWorkspaces } from '../../services/workspaceService.js'
import './ai-suggestions.css'

export default function AIAssistantPage() {
  const { workspaceId: paramWorkspaceId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isPremiumUser = user?.subscriptionPlan === 'PREMIUM'

  const [workspaces, setWorkspaces] = useState([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(paramWorkspaceId || '')
  const [workspace, setWorkspace] = useState(() => readWorkspaceHeader(paramWorkspaceId))
  const [documents, setDocuments] = useState([])
  const [selectedDocIds, setSelectedDocIds] = useState([])
  const [showQuizSetup, setShowQuizSetup] = useState(false)
  const [setupAction, setSetupAction] = useState('QUIZ')
  const [questionCount, setQuestionCount] = useState(10)
  const [practiceQuestions, setPracticeQuestions] = useState([])
  const [practiceAnswers, setPracticeAnswers] = useState({})
  const [practiceSubmitted, setPracticeSubmitted] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [showPracticeReview, setShowPracticeReview] = useState(false)
  const [flashcards, setFlashcards] = useState([])
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [flashcardFlipped, setFlashcardFlipped] = useState(false)

  const [messages, setMessages] = useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [taskSuggestions, setTaskSuggestions] = useState([])
  const [selectedSuggestionIndexes, setSelectedSuggestionIndexes] = useState([])
  const [taskSuggestionNotice, setTaskSuggestionNotice] = useState('')

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
        listDocuments(activeWsId),
        getWorkspace(activeWsId).catch(() => ({ data: { data: null } })),
      ])

      const docList = docsRes.data.data || []
      setDocuments(docList)
      setWorkspace(wsRes.data.data || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load workspace documents. Please try again.')
    }
  }, [activeWsId])

  useEffect(() => {
    setSelectedDocIds([])
    setDocuments([])
    setTaskSuggestions([])
    setPracticeQuestions([])
    setPracticeAnswers({})
    setPracticeSubmitted(false)
    setPracticeIndex(0)
    setShowPracticeReview(false)
    setFlashcards([])
    setFlashcardIndex(0)
    setFlashcardFlipped(false)
    setShowQuizSetup(false)
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

  const handleQuickAction = async (actionType, startPractice = false) => {
    if (!activeWsId) return
    if (['QUIZ', 'FLASHCARDS'].includes(actionType) && !startPractice) { setSetupAction(actionType); setQuestionCount(10); setShowQuizSetup(true); return }
    setError('')
    setTaskSuggestionNotice('')
    if (['QUIZ', 'FLASHCARDS'].includes(actionType) && (!Number.isInteger(Number(questionCount)) || Number(questionCount) < 1 || Number(questionCount) > (isPremiumUser ? 50 : 20))) return
    const documentIds = selectedDocIds.length ? selectedDocIds : documents.filter((doc) => !doc.isLink && ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(doc.fileType)).map((doc) => doc._id)
    if (actionType !== 'TASK_SUGGESTION' && (!documentIds.length || documentIds.length > 10)) {
      setError(documentIds.length ? 'Please select at most 10 supported documents for this request.' : 'Upload or select at least one supported document (TXT, PDF, DOC, or DOCX).')
      return
    }
    setAiLoading(true)

    let promptText = ''
    let apiCall

    if (actionType === 'SUMMARIZE') {
      promptText = 'Generate a summary of the selected workspace documents.'
      apiCall = summarizeDocument({ workspaceId: activeWsId, documentIds })
    } else if (actionType === 'QUIZ') {
      promptText = `Generate ${questionCount} multiple-choice questions from workspace documents.`
      apiCall = generateQuiz({ workspaceId: activeWsId, documentIds, count: Number(questionCount) })
    } else if (actionType === 'FLASHCARDS') {
      promptText = `Generate ${questionCount} revision flashcards from workspace documents.`
      apiCall = generateFlashcards({ workspaceId: activeWsId, documentIds, count: Number(questionCount) })
    } else if (actionType === 'TASK_SUGGESTION') {
      promptText = 'Suggest workload distribution and task priorities.'
      apiCall = suggestTaskDistribution({ workspaceId: activeWsId })
    }

    setMessages((prev) => [...prev, { role: 'user', content: promptText }])

    try {
      const { data } = await apiCall
      const aiData = data.data || {}
      if (actionType === 'FLASHCARDS') {
        if (!Array.isArray(aiData.cards) || !aiData.cards.length) throw new Error('No valid flashcards were returned.')
        setFlashcards(aiData.cards)
        setFlashcardIndex(0)
        setFlashcardFlipped(false)
        setShowQuizSetup(false)
        setMessages((prev) => [...prev, { role: 'assistant', content: `${aiData.cards.length} flashcards are ready below.`, sourceDocuments: aiData.sourceDocuments || [] }])
        return
      }
      if (actionType === 'QUIZ') {
        if (!Array.isArray(aiData.questions) || !aiData.questions.length) throw new Error('No valid questions were returned.')
        setPracticeQuestions(aiData.questions)
        setPracticeAnswers({})
        setPracticeSubmitted(false)
        setPracticeIndex(0)
        setShowPracticeReview(false)
        setShowQuizSetup(false)
        setMessages((prev) => [...prev, { role: 'assistant', content: `${aiData.questions.length} questions are ready below.`, sourceDocuments: aiData.sourceDocuments || [] }])
        return
      }
      if (actionType === 'TASK_SUGGESTION') {
        const suggestions = aiData.suggestions || []
        setTaskSuggestions(suggestions)
        setSelectedSuggestionIndexes(suggestions.map((_suggestion, index) => index))
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: aiData.message || (suggestions.length
              ? 'Review the proposed tasks below. Select the ones you want to add to your workspace.'
              : 'No task suggestions were returned. Check the AI provider configuration and try again.'),
          },
        ])
        return
      }
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: aiData.answer || 'Tool output generated.',
          sourceDocuments: aiData.sourceDocuments || [],
        },
      ])
    } catch (err) {
      const message = err.response?.data?.message || (err.response
        ? `AI request failed (HTTP ${err.response.status}). Please try again or check the backend logs.`
        : err.request ? 'Cannot connect to the backend. Check that the server is running and try again.' : err.message || 'Unable to generate questions.')
      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${message}`,
        },
      ])
    } finally {
      setAiLoading(false)
    }
  }

  const handleConfirmSuggestions = async () => {
    const selected = selectedSuggestionIndexes.map((index) => taskSuggestions[index]).filter(Boolean)
    if (!selected.length || !activeWsId) return
    setAiLoading(true)
    setError('')
    setTaskSuggestionNotice('')
    try {
      const { data } = await confirmSuggestedTasks({ workspaceId: activeWsId, suggestions: selected })
      setTaskSuggestionNotice(`${data.data.length} confirmed task${data.data.length === 1 ? '' : 's'} added to the To Do list.`)
      setTaskSuggestions([])
      setSelectedSuggestionIndexes([])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to add the selected tasks')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="ai-page-container">
      {/* Workspace Header & Tabs if inside workspace context */}
      {paramWorkspaceId ? (
        <div className="workspace-detail-header-block">
          <Link className="back-link" to="/workspaces">
            <ArrowLeft size={16} /> All workspaces
          </Link>
          <section className="workspace-hero">
            <div className="workspace-hero-icon">{workspace?.avatar ? <img src={workspace.avatar} alt="" /> : workspace?.name?.slice(0, 1).toUpperCase() || '…'}</div>
            <div>
              <span className="eyebrow">{workspace?.type?.replaceAll('_', ' ') || 'WORKSPACE'}</span>
              <h1>{workspace?.name || 'Loading workspace…'}</h1>
              <p>{workspace?.description || 'A focused space for your group to collaborate.'}</p>
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
        isPremium={workspace?.plan === 'PREMIUM'}
      />

      {flashcards.length > 0 && <section className="surface-card flashcard-panel" aria-label="Bộ thẻ ghi nhớ"><div className="practice-heading"><div><span className="practice-eyebrow">ÔN TẬP CÙNG AI</span><h2>Thẻ ghi nhớ</h2><p>Nhấn vào thẻ để xem mặt còn lại</p></div><button type="button" className="secondary-action" onClick={() => { setFlashcards([]); setFlashcardIndex(0); setFlashcardFlipped(false) }}>Đóng bộ thẻ</button></div><button type="button" className={`flashcard-face ${flashcardFlipped ? 'is-flipped' : ''}`} onClick={() => setFlashcardFlipped((value) => !value)} aria-label={flashcardFlipped ? 'Mặt sau, nhấn để xem mặt trước' : 'Mặt trước, nhấn để xem đáp án'}><span>{flashcardFlipped ? 'ĐÁP ÁN' : 'THUẬT NGỮ / CÂU HỎI'}</span><strong>{flashcardFlipped ? flashcards[flashcardIndex].back : flashcards[flashcardIndex].front}</strong><small>Nhấn để lật thẻ ↻</small></button><div className="flashcard-controls"><button type="button" className="secondary-action" disabled={flashcardIndex === 0} onClick={() => { setFlashcardIndex((index) => index - 1); setFlashcardFlipped(false) }}>← Thẻ trước</button><span aria-live="polite">{flashcardIndex + 1} / {flashcards.length}</span><button type="button" className="secondary-action" disabled={flashcardIndex === flashcards.length - 1} onClick={() => { setFlashcardIndex((index) => index + 1); setFlashcardFlipped(false) }}>Thẻ tiếp →</button></div><p className="practice-note">Thẻ do AI tạo, bạn nên đối chiếu với tài liệu gốc. Bộ thẻ sẽ mất khi tải lại trang.</p></section>}

      {showQuizSetup && <section className="surface-card practice-panel" aria-label="Practice setup"><div className="practice-heading"><div><h2>{setupAction === 'QUIZ' ? 'Tạo bài luyện tập' : 'Tạo bộ thẻ ghi nhớ'}</h2><p>Nhập số lượng bạn muốn tạo từ tài liệu đã chọn.</p></div><button type="button" className="secondary-action" onClick={() => setShowQuizSetup(false)}>Đóng</button></div><label htmlFor="practice-count">{setupAction === 'QUIZ' ? 'Số câu hỏi' : 'Số thẻ'}</label><input id="practice-count" type="number" min="1" max={isPremiumUser ? 50 : 20} step="1" value={questionCount} aria-describedby="practice-count-hint" onChange={(event) => setQuestionCount(event.target.value)} /><div id="practice-count-hint" aria-live="polite">{(!Number.isInteger(Number(questionCount)) || Number(questionCount) < 1 || Number(questionCount) > (isPremiumUser ? 50 : 20)) && <p className="practice-count-warning">{Number(questionCount) > (isPremiumUser ? 50 : 20) ? <>Bạn có thể tạo tối đa {isPremiumUser ? 50 : 20} {setupAction === 'QUIZ' ? 'câu hỏi' : 'thẻ'} mỗi lần.{!isPremiumUser && <> <Link to="/premium">Đăng ký Premium</Link> để nâng giới hạn lên 50.</>}</> : questionCount === '' ? `Vui lòng nhập số ${setupAction === 'QUIZ' ? 'câu hỏi' : 'thẻ'} bạn muốn tạo.` : `Vui lòng nhập số từ 1 đến ${isPremiumUser ? 50 : 20}.`}</p>}</div><button type="button" className="primary-action" disabled={aiLoading} onClick={() => handleQuickAction(setupAction, true)}>{aiLoading ? 'Đang tạo…' : setupAction === 'QUIZ' ? 'Tạo bài luyện tập' : 'Tạo bộ thẻ'}</button></section>}

      {practiceQuestions.length > 0 && (() => {
        const question = practiceQuestions[practiceIndex]
        const answered = Object.keys(practiceAnswers).length
        return <section className="surface-card practice-panel" aria-label="Bài luyện tập">
          <div className="practice-heading"><div><span className="practice-eyebrow">LUYỆN TẬP CÙNG AI</span><h2>Bài luyện tập</h2><p>{practiceSubmitted ? `Kết quả: ${practiceQuestions.filter((item, index) => practiceAnswers[index] === item.correctIndex).length}/${practiceQuestions.length} câu đúng` : `Đã trả lời ${answered}/${practiceQuestions.length} câu`}</p></div>{practiceSubmitted && <div className="practice-complete-actions"><button type="button" className="secondary-action" onClick={() => { setPracticeAnswers({}); setPracticeSubmitted(false); setPracticeIndex(0); setShowPracticeReview(false) }}>Làm lại</button><button type="button" className="secondary-action" onClick={() => setShowPracticeReview(true)}>Đóng bài</button><button type="button" className="primary-action" onClick={() => { setPracticeQuestions([]); setPracticeAnswers({}); setPracticeSubmitted(false); setPracticeIndex(0); setShowPracticeReview(false); setSetupAction('QUIZ'); setQuestionCount(10); setShowQuizSetup(true) }}>Tạo bài mới</button></div>}</div>
          <div className="practice-progress" role="progressbar" aria-label="Tiến độ trả lời" aria-valuemin={0} aria-valuemax={practiceQuestions.length} aria-valuenow={answered}><span style={{ width: `${answered / practiceQuestions.length * 100}%` }} /></div>
          <nav className="practice-nav" aria-label="Chọn câu hỏi">{practiceQuestions.map((item, index) => <button key={index} type="button" aria-label={`Câu ${index + 1}${practiceAnswers[index] !== undefined ? ', đã trả lời' : ', chưa trả lời'}`} aria-current={index === practiceIndex ? 'step' : undefined} className={`${index === practiceIndex ? 'active' : ''} ${practiceAnswers[index] !== undefined ? 'answered' : ''} ${practiceSubmitted ? practiceAnswers[index] === item.correctIndex ? 'result-correct' : 'result-incorrect' : ''}`} onClick={() => setPracticeIndex(index)}>{index + 1}</button>)}</nav>
          <form onSubmit={(event) => { event.preventDefault(); if (answered < practiceQuestions.length && !window.confirm(`Bạn còn ${practiceQuestions.length - answered} câu chưa trả lời. Bạn vẫn muốn nộp bài?`)) return; setPracticeSubmitted(true) }}>
            <fieldset className="practice-question"><legend>Câu {practiceIndex + 1}/{practiceQuestions.length}</legend><h3>{question.question}</h3>{question.options.map((option, optionIndex) => <label className={`practice-option ${practiceAnswers[practiceIndex] === optionIndex ? 'selected' : ''} ${practiceSubmitted && optionIndex === question.correctIndex ? 'correct' : ''} ${practiceSubmitted && practiceAnswers[practiceIndex] === optionIndex && optionIndex !== question.correctIndex ? 'incorrect' : ''}`} key={optionIndex}><input type="radio" name={`practice-${practiceIndex}`} checked={practiceAnswers[practiceIndex] === optionIndex} disabled={practiceSubmitted} onChange={() => setPracticeAnswers((answers) => ({ ...answers, [practiceIndex]: optionIndex }))} /><span className="practice-option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></label>)}{practiceSubmitted && <p className="practice-explanation">{practiceAnswers[practiceIndex] === question.correctIndex ? 'Đúng' : practiceAnswers[practiceIndex] === undefined ? 'Chưa trả lời' : 'Chưa đúng'} · Đáp án: {String.fromCharCode(65 + question.correctIndex)}{question.explanation ? ` — ${question.explanation}` : ''}</p>}</fieldset>
            <div className="practice-actions"><button type="button" className="secondary-action" disabled={practiceIndex === 0} onClick={() => setPracticeIndex((index) => index - 1)}>← Câu trước</button><div>{!practiceSubmitted && <button className="secondary-action" type="submit">Nộp bài và chấm điểm</button>}{practiceIndex < practiceQuestions.length - 1 && <button type="button" className="primary-action" onClick={() => setPracticeIndex((index) => index + 1)}>Câu tiếp →</button>}</div></div>
          </form>{showPracticeReview && <section className="practice-review" aria-label="Xem lại câu sai"><h3>Xem lại trước khi đóng</h3>{practiceQuestions.every((item, index) => practiceAnswers[index] === item.correctIndex) ? <p>Bạn đã trả lời đúng tất cả câu hỏi.</p> : practiceQuestions.map((item, index) => practiceAnswers[index] === item.correctIndex ? null : <article className="practice-review-item" key={index}><strong>Câu {index + 1}: {item.question}</strong><p>Bạn chọn: {practiceAnswers[index] === undefined ? 'Chưa trả lời' : `${String.fromCharCode(65 + practiceAnswers[index])}. ${item.options[practiceAnswers[index]]}`}</p><p>Đáp án đúng: {String.fromCharCode(65 + item.correctIndex)}. {item.options[item.correctIndex]}</p><p>Giải thích của AI: {item.explanation || 'Chưa có giải thích. Hãy đối chiếu với tài liệu gốc.'}</p></article>)}<p>Sau khi đóng, bài làm và kết quả sẽ không còn trên trang.</p><div className="practice-complete-actions"><button type="button" className="secondary-action" onClick={() => setShowPracticeReview(false)}>Quay lại bài</button><button type="button" className="primary-action" onClick={() => { setPracticeQuestions([]); setPracticeAnswers({}); setPracticeSubmitted(false); setPracticeIndex(0); setShowPracticeReview(false); setShowQuizSetup(false) }}>Xác nhận đóng bài</button></div></section>}<p className="practice-note">Câu hỏi và đáp án do AI tạo, bạn nên đối chiếu với tài liệu gốc.</p>
        </section>
      })()}

      {taskSuggestions.length > 0 && (
        <section className="surface-card ai-task-suggestions" aria-label="AI task suggestions">
          <div className="section-heading">
            <div><span className="eyebrow">PREMIUM AI PLAN</span><h2>Suggested task list</h2></div>
            <span>{selectedSuggestionIndexes.length} selected</span>
          </div>
          <div className="ai-suggestion-list">
            {taskSuggestions.map((suggestion, index) => {
              const checked = selectedSuggestionIndexes.includes(index)
              return (
                <label className={`ai-suggestion-card ${checked ? 'selected' : ''}`} key={`${suggestion.title}-${index}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedSuggestionIndexes((current) =>
                      checked ? current.filter((item) => item !== index) : [...current, index],
                    )}
                  />
                  <span className="ai-suggestion-copy">
                    <strong>{suggestion.title}</strong>
                    <small>{suggestion.description}</small>
                    <span className="ai-suggestion-meta">
                      <span>{suggestion.difficulty}</span>
                      <span><Clock3 size={12} /> {suggestion.estimatedHours}h</span>
                      <span>{suggestion.priority}</span>
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          <button type="button" className="primary-action" onClick={handleConfirmSuggestions} disabled={aiLoading || selectedSuggestionIndexes.length === 0}>
            {aiLoading ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
            Add selected tasks to To Do
          </button>
        </section>
      )}

      {taskSuggestionNotice && <p className="member-message" role="status">{taskSuggestionNotice}</p>}
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
