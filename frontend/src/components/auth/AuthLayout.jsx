import { ArrowLeft, ArrowUpRight, BookOpen, Check, Clock3, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandLogo from '../common/BrandLogo.jsx'
import './auth-layout.css'

const copyByMode = {
  login: {
    badge: 'YOUR STUDY SPACE',
    title: 'Good to have you back.',
    description: 'Reconnect with your study group, pick up where you left off, and keep making progress together.',
  },
  register: {
    badge: 'BUILT FOR BETTER STUDY HABITS',
    title: 'Make room for better study sessions.',
    description: 'Bring your people, notes, and plans together in one calm space designed to help your group move forward.',
  },
}

export default function AuthLayout({ mode = 'login', children }) {
  const copy = copyByMode[mode]

  return (
    <div className={`auth-page auth-experience-page auth-experience-page--${mode}`}>
      <aside className="auth-showcase" aria-label="About NexusStudy">
        <div className="auth-showcase-top">
          <Link className="auth-showcase-brand" to="/" aria-label="NexusStudy home">
            <BrandLogo variant="light" className="auth-showcase-logo" />
          </Link>
          <span className="auth-showcase-status">
            <span />
            A better way to study together
          </span>
        </div>

        <div className="auth-showcase-visual" aria-hidden="true">
          <div className="auth-showcase-orbit auth-showcase-orbit-one" />
          <div className="auth-showcase-orbit auth-showcase-orbit-two" />
          <div className="auth-dashboard-card">
            <div className="auth-dashboard-heading">
              <span className="auth-dashboard-icon"><BookOpen size={17} /></span>
              <span>
                <strong>Biology Study Group</strong>
                <small><i /> 4 members online</small>
              </span>
              <ArrowUpRight size={17} />
            </div>
            <div className="auth-dashboard-divider" />
            <div className="auth-dashboard-label">TODAY'S PROGRESS</div>
            <div className="auth-progress-row">
              <span className="auth-progress-icon"><Check size={14} /></span>
              <span>Review lecture notes</span>
              <strong>Done</strong>
            </div>
            <div className="auth-progress-row">
              <span className="auth-progress-icon auth-progress-icon-purple"><Sparkles size={14} /></span>
              <span>Prepare for the quiz</span>
              <strong>In progress</strong>
            </div>
            <div className="auth-dashboard-focus">
              <Clock3 size={15} />
              <span>Focus session</span>
              <strong>24:18</strong>
              <span className="auth-focus-bars"><i /><i /><i /><i /><i /></span>
            </div>
          </div>
          <div className="auth-float-badge auth-float-badge-ai">
            <span><Sparkles size={15} /></span>
            <span><strong>AI study notes</strong><small>Ready to review</small></span>
          </div>
          <div className="auth-float-badge auth-float-badge-team">
            <span className="auth-team-avatars"><i>A</i><i>M</i><i>J</i></span>
            <span><strong>In sync</strong><small>Your whole study crew</small></span>
          </div>
        </div>

        <div className="auth-showcase-copy">
          <span className="auth-showcase-eyebrow"><Users size={14} /> {copy.badge}</span>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>
        <div className="auth-showcase-footer">
          <span>NEXUSSTUDY</span>
          <span>STUDY BETTER, TOGETHER</span>
        </div>
      </aside>

      <main className="auth-form-side">
        <Link className="auth-home-link" to="/">
          <ArrowLeft size={15} /> Back to home
        </Link>
        <div className="auth-form-content">
          <Link className="auth-form-logo-link" to="/" aria-label="NexusStudy home"><BrandLogo markOnly className="auth-form-mark" /></Link>
          {children}
        </div>
        <p className="auth-form-footer">A shared space for everything your study group does.</p>
      </main>
    </div>
  )
}
