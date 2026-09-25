import { FileText, HelpCircle, Layers, ListOrdered, Sparkles } from 'lucide-react'

export default function AiQuickTools({ onSelectAction, loading = false, documentCount = 0 }) {
  return (
    <div className="ai-quick-tools-grid">
      <button
        type="button"
        className="ai-tool-card"
        onClick={() => onSelectAction('SUMMARIZE')}
        disabled={loading || documentCount === 0}
      >
        <div className="tool-icon-wrapper purple">
          <FileText size={20} />
        </div>
        <div className="tool-info">
          <strong>Summarize Document</strong>
          <small>Extract key study notes and main ideas</small>
        </div>
      </button>

      <button
        type="button"
        className="ai-tool-card"
        onClick={() => onSelectAction('QUIZ')}
        disabled={loading || documentCount === 0}
      >
        <div className="tool-icon-wrapper blue">
          <HelpCircle size={20} />
        </div>
        <div className="tool-info">
          <strong>Generate Quiz</strong>
          <small>Create revision practice questions</small>
        </div>
      </button>

      <button
        type="button"
        className="ai-tool-card"
        onClick={() => onSelectAction('FLASHCARDS')}
        disabled={loading || documentCount === 0}
      >
        <div className="tool-icon-wrapper amber">
          <Layers size={20} />
        </div>
        <div className="tool-info">
          <strong>Generate Flashcards</strong>
          <small>Build term/definition revision cards</small>
        </div>
      </button>

      <button
        type="button"
        className="ai-tool-card"
        onClick={() => onSelectAction('TASK_SUGGESTION')}
        disabled={loading}
      >
        <div className="tool-icon-wrapper green">
          <ListOrdered size={20} />
        </div>
        <div className="tool-info">
          <strong>Task Distribution</strong>
          <small>Analyze workload & suggest assignments</small>
        </div>
      </button>
    </div>
  )
}
