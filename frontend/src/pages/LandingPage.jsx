import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Flame,
  GraduationCap,
  HelpCircle,
  Kanban,
  Layers,
  MessageCircle,
  Music,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import BrandLogo from '../components/common/BrandLogo.jsx'
import './landing-page.css'

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('notes')
  const [isFlipped, setIsFlipped] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(1500) // 25:00

  const toggleTimer = () => setTimerRunning(!timerRunning)
  const resetTimer = () => {
    setTimerRunning(false)
    setTimerSeconds(1500)
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const tourTabs = [
    {
      id: 'notes',
      label: 'Collaborative Notes',
      icon: FileText,
      tag: 'Real-time',
      title: 'Shared knowledge base that writes itself',
      desc: 'Type simultaneously with your crew. Format lecture notes in markdown, embed diagrams, and let AI summarize lengthy chapters instantly.',
    },
    {
      id: 'chat',
      label: 'Contextual Chat',
      icon: MessageCircle,
      tag: 'Discussions',
      title: 'Keep talk, files, and questions in one flow',
      desc: 'No more searching across chaotic chat apps. NexusStudy chat lives right alongside your notes and assignments with threaded discussions.',
    },
    {
      id: 'tasks',
      label: 'Kanban & Deadlines',
      icon: Kanban,
      tag: 'Accountability',
      title: 'Turn group chaos into clear deliverables',
      desc: 'Assign responsibilities, set deadlines with automatic reminders, and watch milestones move across visual boards.',
    },
    {
      id: 'calendar',
      label: 'Study Calendar',
      icon: CalendarDays,
      tag: 'Sync',
      title: 'Never double-book or miss a study sprint',
      desc: 'Coordinate review sessions, office hours, and exam countdowns with synchronized calendars and RSVP tracking.',
    },
    {
      id: 'ai',
      label: 'AI Copilot',
      icon: Bot,
      tag: 'Smart',
      title: 'Your 24/7 study partner & quiz master',
      desc: 'Upload class slides or notes to generate instant flashcards, practice exam questions, and concise key-concept cheat sheets.',
    },
  ]

  const faqs = [
    {
      q: 'Is NexusStudy completely free for students?',
      a: 'Yes! NexusStudy is 100% free for students, study groups, and campus clubs. You get unlimited workspaces, collaborative notes, Kanban task boards, and access to our core AI study tools without paying a dime.',
    },
    {
      q: 'How does real-time collaboration work in a study space?',
      a: 'Each workspace is a private hub for your class or project group. Members can edit notes together in real-time, comment in threaded chats, assign tasks, and coordinate study sessions. Everything updates instantly via WebSockets.',
    },
    {
      q: 'Can I invite classmates who do not have an institutional email?',
      a: 'Absolutely. Anyone can sign up and join your workspace with a shared invite link, regardless of email provider. You have full control over member roles (Owner, Leader, Member).',
    },
    {
      q: 'What can the AI Study Copilot actually do for our group?',
      a: 'The AI Copilot can read your shared documents to generate practice quizzes, convert long lecture readings into key bullet points, generate flashcard decks, and explain difficult concepts in plain language.',
    },
    {
      q: 'Is my study data and shared document content private?',
      a: 'Yes. Your workspace data is strictly restricted to members invited into your group. We do not sell student data or share your personal documents with third parties.',
    },
  ]

  const metrics = [
    { value: '15,000+', label: 'Active Students', icon: Users, change: '+45% this semester' },
    { value: '120,000+', label: 'Study Hours Logged', icon: Clock, change: '100% focused time' },
    { value: '98.4%', label: 'On-Time Project Rate', icon: CheckCircle2, change: 'Never miss deadlines' },
    { value: '4.9 / 5.0', label: 'Student Rating', icon: Star, change: 'From 1,400+ reviews' },
  ]

  const steps = [
    {
      num: '01',
      title: 'Create or join your workspace',
      desc: 'Set up a dedicated hub for your course, lab group, or exam study circle in under 30 seconds with an instant invite link.',
      badge: 'Quick Setup',
    },
    {
      num: '02',
      title: 'Centralize notes, tasks & dates',
      desc: 'Say goodbye to lost Google Docs and scattered chat apps. Keep your notes, task assignments, and calendar synced in one place.',
      badge: 'All in One',
    },
    {
      num: '03',
      title: 'Study smarter with AI & Pomodoro',
      desc: 'Join focus rooms with Pomodoro timers, generate instant quiz cards from lecture notes, and conquer exams together.',
      badge: 'High Impact',
    },
  ]

  const testimonials = [
    {
      quote:
        'Before NexusStudy, our 5-person capstone team had conversations scattered across Messenger, documents in Drive, and tasks in Trello. Bringing everything together saved us hours every week.',
      name: 'Alex Chen',
      role: 'Computer Science · Senior',
      school: 'Stanford Study Crew',
      avatar: 'AC',
      avatarBg: '#6548c7',
      stars: 5,
    },
    {
      quote:
        'The AI flashcards and integrated Pomodoro study rooms completely transformed our anatomy study group. We all scored in the top 10% of our midterm exams!',
      name: 'Sarah Jenkins',
      role: 'Pre-Med / Biology Major',
      school: 'BioMed Circle',
      avatar: 'SJ',
      avatarBg: '#df886f',
      stars: 5,
    },
    {
      quote:
        'Having our calendar, group chat, and Kanban board on one intuitive screen means no one ever forgets an assignment or study session again. It just works.',
      name: 'Minh Nguyen',
      role: 'Finance & Economics · Junior',
      school: 'Business Leaders Group',
      avatar: 'MN',
      avatarBg: '#4a7f9c',
      stars: 5,
    },
  ]

  return (
    <main className="landing-page">
      {/* Decorative ambient background glows */}
      <div className="landing-glow landing-glow-top" aria-hidden="true" />
      <div className="landing-glow landing-glow-bottom" aria-hidden="true" />
      <div className="landing-grid-pattern" aria-hidden="true" />

      {/* Header */}
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="NexusStudy home">
          <BrandLogo markOnly className="landing-brand-image" />
          <span>
            NEXUS<span className="landing-brand-light">STUDY</span>
          </span>
        </Link>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#tour">Workspace Tour</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-header-actions">
          <Link className="landing-login" to="/login">
            Log in
          </Link>
          <Link className="landing-button landing-button-small" to="/register">
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-pill-announcement">
            <span className="landing-pill-tag">NEW</span>
            <span>AI Study Copilot 2.0 is live</span>
            <ArrowRight size={13} />
          </div>

          <h1>
            Make space for <span>better</span> study sessions.
          </h1>
          <p>
            Bring your people, projects, and study materials together into one synchronized workspace.
            Less scattered. More learning, side by side.
          </p>

          <div className="landing-hero-actions">
            <Link className="landing-button" to="/register">
              Get started for free <ArrowRight size={17} />
            </Link>
            <a className="landing-secondary-link" href="#tour">
              Explore interactive tour ↓
            </a>
          </div>

          <div className="landing-proof">
            <div className="landing-avatar-stack" aria-hidden="true">
              <span>AN</span>
              <span>MK</span>
              <span>JT</span>
              <span>+4</span>
            </div>
            <div>
              <div className="landing-proof-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="#e1a74b" color="#e1a74b" />
                ))}
              </div>
              <span className="landing-proof-text">
                Rated <b>4.9/5</b> by 1,400+ study groups
              </span>
            </div>
          </div>
        </div>

        {/* Hero Interactive Preview Mockup with Floating Badges */}
        <div className="landing-preview-wrap" aria-label="Preview of a NexusStudy workspace">
          <div className="landing-orbit landing-orbit-one" />
          <div className="landing-orbit landing-orbit-two" />

          {/* Floating Badges for visual richness */}
          <div className="floating-badge badge-streak">
            <span className="badge-icon-box orange">
              <Flame size={16} />
            </span>
            <div>
              <strong>14-Day Streak! 🔥</strong>
              <small>Study group is on fire</small>
            </div>
          </div>

          <div className="floating-badge badge-ai">
            <span className="badge-icon-box purple">
              <Bot size={16} />
            </span>
            <div>
              <strong>AI Summary Ready</strong>
              <small>4 key takeaways generated</small>
            </div>
          </div>

          <div className="floating-badge badge-timer">
            <span className="badge-icon-box green">
              <Clock size={16} />
            </span>
            <div>
              <strong>Focus Room Active</strong>
              <small>25:00 · 4 buddies studying</small>
            </div>
          </div>

          <div className="landing-preview">
            <div className="preview-sidebar">
              <div className="preview-logo">
                <BrandLogo variant="light" markOnly className="preview-brand-image" /> nexus
              </div>
              <div className="preview-workspace-label">YOUR WORKSPACE</div>
              <div className="preview-nav-item active">
                <Users size={14} /> Biology Study Group
              </div>
              <div className="preview-nav-item">
                <MessageCircle size={14} /> Group chat
              </div>
              <div className="preview-nav-item">
                <Check size={14} /> Tasks & Kanban
              </div>
              <div className="preview-nav-item">
                <FileText size={14} /> Shared notes
              </div>
              <div className="preview-nav-item">
                <CalendarDays size={14} /> Study Calendar
              </div>
            </div>
            <div className="preview-content">
              <div className="preview-topline">
                <span>
                  Biology Study Group <span className="preview-dot">·</span> Overview
                </span>
                <span className="preview-online">
                  <i /> 4 online
                </span>
              </div>
              <div className="preview-welcome">
                <span className="preview-eyebrow">MONDAY, OCTOBER 21</span>
                <h2>
                  Hey, study crew <span>✦</span>
                </h2>
                <p>Small steps add up. Here’s what’s happening today.</p>
              </div>
              <div className="preview-card preview-session">
                <div className="preview-card-icon">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <strong>Group study session</strong>
                  <small>
                    Today, 3:30 PM <span>·</span> Cell Biology
                  </small>
                </div>
                <span className="preview-attending">4 going</span>
              </div>
              <div className="preview-columns">
                <div className="preview-card preview-tasks">
                  <strong>
                    Up next <span>2 tasks</span>
                  </strong>
                  <div className="preview-task">
                    <i /> Review lecture notes <small>Today</small>
                  </div>
                  <div className="preview-task">
                    <i /> Share quiz flashcards <small>Tomorrow</small>
                  </div>
                </div>
                <div className="preview-card preview-chat">
                  <strong>Recent chat</strong>
                  <div className="preview-message-avatar">MK</div>
                  <p>
                    <b>Maya:</b> Just shared the chapter 4 summary deck!
                  </p>
                  <small>10:42 AM</small>
                </div>
              </div>
              <div className="preview-toast">
                <span>
                  <Check size={13} />
                </span>
                Your group is making progress!
              </div>
            </div>
          </div>

          <div className="landing-float-card">
            <span>
              <Sparkles size={15} />
            </span>
            <div>
              <b>One place to focus</b>
              <small>Your group’s work, together</small>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Counter Strip */}
      <section className="landing-metrics-section">
        <div className="landing-metrics-container">
          <div className="landing-metrics-header">
            <span className="landing-kicker">POWERING BETTER STUDY HABITS</span>
            <h3>Trusted by students & study crews across 50+ universities</h3>
          </div>
          <div className="landing-metrics-grid">
            {metrics.map((item, idx) => {
              const Icon = item.icon
              return (
                <div className="metric-card" key={idx}>
                  <div className="metric-card-top">
                    <span className="metric-icon">
                      <Icon size={18} />
                    </span>
                    <span className="metric-change">{item.change}</span>
                  </div>
                  <div className="metric-number">{item.value}</div>
                  <div className="metric-label">{item.label}</div>
                </div>
              )
            })}
          </div>

          {/* Subject Badges Ribbon */}
          <div className="landing-disciplines-ribbon">
            <span className="ribbon-label">Top fields of study:</span>
            <div className="ribbon-chips">
              <span className="ribbon-chip">💻 Computer Science</span>
              <span className="ribbon-chip">🩺 Medicine & Pre-Med</span>
              <span className="ribbon-chip">📐 Engineering & Physics</span>
              <span className="ribbon-chip">📈 Business & Economics</span>
              <span className="ribbon-chip">⚖️ Law & Humanities</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - 3 Step Visual Guide */}
      <section className="landing-how" id="how-it-works">
        <div className="landing-section-heading">
          <span className="landing-kicker">STREAMLINED COLLABORATION</span>
          <h2>How NexusStudy transforms your study group</h2>
          <p className="landing-section-sub">
            Move from fragmented messages and missed deadlines to effortless teamwork in 3 simple steps.
          </p>
        </div>

        <div className="landing-steps-grid">
          {steps.map((step, idx) => (
            <div className="landing-step-card" key={idx}>
              <div className="step-badge-row">
                <span className="step-num">{step.num}</span>
                <span className="step-tag">{step.badge}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              <div className="step-connector" aria-hidden="true" />
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Workspace Tour (Tabs Switcher) */}
      <section className="landing-tour" id="tour">
        <div className="landing-section-heading">
          <span className="landing-kicker">ALL-IN-ONE WORKSPACE</span>
          <h2>Everything your group needs, in one seamless flow</h2>
          <p className="landing-section-sub">
            Click through the core features below to see how NexusStudy keeps everyone focused and in sync.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="tour-tabs-nav" role="tablist">
          {tourTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`tour-tab-button ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className="tour-tab-tag">{tab.tag}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Display */}
        <div className="tour-display-card">
          <div className="tour-display-info">
            {tourTabs
              .filter((t) => t.id === activeTab)
              .map((tab) => (
                <div key={tab.id} className="tour-info-body">
                  <span className="landing-kicker">{tab.tag.toUpperCase()} WORKSPACE</span>
                  <h3>{tab.title}</h3>
                  <p>{tab.desc}</p>
                  <div className="tour-feature-checklist">
                    <div className="checklist-item">
                      <CheckCircle2 size={16} className="checklist-icon" />
                      <span>Instant sync across all group members</span>
                    </div>
                    <div className="checklist-item">
                      <CheckCircle2 size={16} className="checklist-icon" />
                      <span>Searchable history and pinned important items</span>
                    </div>
                    <div className="checklist-item">
                      <CheckCircle2 size={16} className="checklist-icon" />
                      <span>Zero clutter, clean distraction-free interface</span>
                    </div>
                  </div>
                  <Link to="/register" className="landing-button landing-button-small">
                    Try this feature free <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
          </div>

          <div className="tour-display-preview">
            {activeTab === 'notes' && (
              <div className="preview-mockup-window">
                <div className="mockup-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="mockup-title">📝 Shared Notes · Biology Chapter 4.md</span>
                </div>
                <div className="mockup-body mockup-notes-body">
                  <div className="mockup-note-title"># Photosynthesis & Light Reactions</div>
                  <div className="mockup-note-meta">
                    <span className="live-pill">🔴 3 editing now</span>
                    <small>Last saved 2 minutes ago</small>
                  </div>
                  <p className="mockup-note-text">
                    Light-dependent reactions take place on the <code>thylakoid membrane</code> of chloroplasts.
                    Photons excite electrons inside Photosystem II, driving the synthesis of ATP and NADPH.
                  </p>
                  <div className="mockup-highlight-box">
                    <strong>💡 Key Exam Takeaway (AI generated):</strong>
                    <p>Water photolysis produces oxygen as a byproduct while replenishing electrons for P680.</p>
                  </div>
                  <div className="mockup-note-collabs">
                    <span className="avatar-chip">Maya is typing...</span>
                    <span className="avatar-chip">Alex highlighted line 14</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="preview-mockup-window">
                <div className="mockup-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="mockup-title">💬 #cell-biology-channel</span>
                </div>
                <div className="mockup-body mockup-chat-body">
                  <div className="chat-bubble left">
                    <div className="chat-avatar">MK</div>
                    <div className="chat-content">
                      <b>Maya Kowalski <small>3:15 PM</small></b>
                      <p>Has everyone reviewed the practice quiz for tomorrow’s seminar?</p>
                    </div>
                  </div>
                  <div className="chat-bubble left">
                    <div className="chat-avatar" style={{ background: '#7198a5' }}>JT</div>
                    <div className="chat-content">
                      <b>James Thorne <small>3:17 PM</small></b>
                      <p>Yes! The flashcards on question 8 really helped clarify the Krebs cycle.</p>
                    </div>
                  </div>
                  <div className="chat-bubble right">
                    <div className="chat-content">
                      <p>Awesome, let's do a 25-minute Pomodoro sprint at 4:00 PM in the group room! 🎯</p>
                      <small>3:19 PM · Read by 4</small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="preview-mockup-window">
                <div className="mockup-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="mockup-title">📋 Kanban Board · Midterm Sprint</span>
                </div>
                <div className="mockup-body mockup-kanban-body">
                  <div className="kanban-col">
                    <div className="kanban-col-header">
                      <span>To Do</span> <b>3</b>
                    </div>
                    <div className="kanban-card">
                      <strong>Read Chapter 5 Summary</strong>
                      <div className="kanban-tag blue">High Priority</div>
                      <small>Due tomorrow · Assigned to Alex</small>
                    </div>
                    <div className="kanban-card">
                      <strong>Draft 10 Quiz Questions</strong>
                      <div className="kanban-tag">Normal</div>
                      <small>Due in 2 days</small>
                    </div>
                  </div>
                  <div className="kanban-col">
                    <div className="kanban-col-header">
                      <span>In Progress</span> <b>1</b>
                    </div>
                    <div className="kanban-card active-card">
                      <strong>Lab Report Slide Deck</strong>
                      <div className="kanban-tag orange">In Review</div>
                      <small>Maya & James editing</small>
                    </div>
                  </div>
                  <div className="kanban-col">
                    <div className="kanban-col-header">
                      <span>Done</span> <b>5</b>
                    </div>
                    <div className="kanban-card completed-card">
                      <strong>Practice Test 1 Review</strong>
                      <div className="kanban-tag green">Completed</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="preview-mockup-window">
                <div className="mockup-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="mockup-title">📅 Study Sessions & Milestones</span>
                </div>
                <div className="mockup-body mockup-cal-body">
                  <div className="cal-event-card highlight">
                    <div className="cal-time">
                      <span>TODAY</span>
                      <strong>3:30 PM</strong>
                    </div>
                    <div className="cal-info">
                      <h4>Cell Biology Final Prep Session</h4>
                      <p>Focus on Glycolysis, Electron Transport Chain, and Practice Midterm</p>
                      <div className="cal-attendees">
                        <span className="badge-going">4 going</span>
                        <span>Google Meet linked · Room #2</span>
                      </div>
                    </div>
                  </div>
                  <div className="cal-event-card">
                    <div className="cal-time">
                      <span>OCT 24</span>
                      <strong>10:00 AM</strong>
                    </div>
                    <div className="cal-info">
                      <h4>Weekly Group Check-in & Task Assignment</h4>
                      <p>Sprint retrospective and assignment distribution</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="preview-mockup-window">
                <div className="mockup-header">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="mockup-title">🤖 AI Study Copilot · Document Analyzer</span>
                </div>
                <div className="mockup-body mockup-ai-body">
                  <div className="ai-prompt-box">
                    <Sparkles size={16} className="ai-spark" />
                    <span>"Summarize key definitions from the Biochemistry lecture notes and create 3 test questions."</span>
                  </div>
                  <div className="ai-response-box">
                    <div className="ai-response-header">
                      <strong>AI Copilot</strong>
                      <span className="ai-badge">Instant generation</span>
                    </div>
                    <p>Here are the 3 most likely exam concepts:</p>
                    <ol>
                      <li><b>Allosteric Regulation:</b> Effector binding changes protein conformation.</li>
                      <li><b>Feedback Inhibition:</b> End-product regulates the pathway's committed step.</li>
                      <li><b>Gibbs Free Energy:</b> Negative ΔG indicates spontaneous exergonic reaction.</li>
                    </ol>
                    <div className="ai-actions-row">
                      <button className="ai-btn-pill">✨ Convert to Flashcards</button>
                      <button className="ai-btn-pill">📥 Save to Notes</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid: Core Superpowers */}
      <section className="landing-bento" id="features">
        <div className="landing-section-heading">
          <span className="landing-kicker">ENGINEERED FOR SERIOUS RESULTS</span>
          <h2>Everything your group needs to move forward</h2>
          <p className="landing-section-sub">
            Built from the ground up for students who value focus, teamwork, and high performance.
          </p>
        </div>

        <div className="bento-grid">
          {/* Bento Card 1: Interactive Flashcard Flip */}
          <div className="bento-card bento-wide">
            <div className="bento-card-header">
              <span className="bento-tag purple">
                <Bot size={14} /> AI Flashcard Generator
              </span>
              <h3>Turn lengthy reading into instant memory cards</h3>
              <p>
                Click the interactive demo card below to test how our AI creates instant active-recall flashcards from
                any lecture or document.
              </p>
            </div>

            <div className="interactive-flashcard-wrap" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`interactive-flashcard ${isFlipped ? 'flipped' : ''}`}>
                <div className="flashcard-front">
                  <div className="card-topline">
                    <span className="card-badge">QUESTION · BIOLOGY 101</span>
                    <span className="card-hint">Click to flip 🔄</span>
                  </div>
                  <p className="card-prompt">
                    "What is the primary role of ATP synthase during oxidative phosphorylation?"
                  </p>
                  <small className="card-footer-tip">Active Recall Exercise · Click to reveal answer</small>
                </div>
                <div className="flashcard-back">
                  <div className="card-topline">
                    <span className="card-badge green">ANSWER & EXPLANATION</span>
                    <span className="card-hint">Click to flip back 🔄</span>
                  </div>
                  <p className="card-answer">
                    ATP synthase utilizes the potential energy stored in the <b>proton electrochemical gradient</b>{' '}
                    across the inner mitochondrial membrane to catalyze the synthesis of ATP from ADP and inorganic
                    phosphate (Pi).
                  </p>
                  <small className="card-footer-tip">✨ High confidence exam concept</small>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 2: Interactive Focus Room & Pomodoro */}
          <div className="bento-card bento-timer">
            <span className="bento-tag orange">
              <Clock size={14} /> Focus Rooms
            </span>
            <h3>Live Pomodoro & Accountability</h3>
            <p>Study in sync with your team. Put on focus mode, track time, and eliminate distractions together.</p>

            <div className="mini-pomodoro-widget">
              <div className="timer-display">{formatTimer(timerSeconds)}</div>
              <div className="timer-status">
                {timerRunning ? (
                  <span className="status-focusing">🔥 Focus session in progress</span>
                ) : (
                  <span className="status-idle">Ready to sprint (25m)</span>
                )}
              </div>
              <div className="timer-controls">
                <button className="timer-btn primary" onClick={toggleTimer}>
                  {timerRunning ? 'Pause' : 'Start Focus'}
                </button>
                <button className="timer-btn secondary" onClick={resetTimer}>
                  <RotateCcw size={14} />
                </button>
              </div>
              <div className="timer-attendees">
                <Music size={13} className="lofi-icon" />
                <span>Lofi study session · 4 crew members active</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3: Polls & Decision Making */}
          <div className="bento-card">
            <span className="bento-tag blue">
              <BarChart3 size={14} /> Group Polls
            </span>
            <h3>Quick consensus without 50 messages</h3>
            <p>Vote on review session times, choose project topics, and collect peer evaluations instantly.</p>
            <div className="mini-poll-widget">
              <strong>"When should we meet for midterm review?"</strong>
              <div className="poll-option">
                <div className="poll-option-bar" style={{ width: '68%' }} />
                <span>Friday, 4:00 PM</span>
                <b>68% (5 votes)</b>
              </div>
              <div className="poll-option">
                <div className="poll-option-bar" style={{ width: '32%' }} />
                <span>Saturday, 10:00 AM</span>
                <b>32% (2 votes)</b>
              </div>
            </div>
          </div>

          {/* Bento Card 4: Built for Security & Performance */}
          <div className="bento-card">
            <span className="bento-tag teal">
              <ShieldCheck size={14} /> Private & Secure
            </span>
            <h3>Your study materials stay yours</h3>
            <p>
              Invite-only workspace permissions, encrypted WebSocket real-time sync, and safe storage for all documents.
            </p>
            <div className="trust-list">
              <div className="trust-item">
                <CheckCircle2 size={16} /> <span>End-to-end workspace isolation</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} /> <span>Role-based access (Owner, Leader, Member)</span>
              </div>
              <div className="trust-item">
                <CheckCircle2 size={16} /> <span>Instant automated cloud backups</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Testimonials ("Wall of Love") */}
      <section className="landing-testimonials">
        <div className="landing-section-heading">
          <span className="landing-kicker">LOVED BY STUDY GROUPS</span>
          <h2>Built for students who want to learn together</h2>
          <p className="landing-section-sub">
            Here is what high-performing students and study crews have to say about NexusStudy.
          </p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div className="testimonial-card" key={i}>
              <div className="testimonial-stars">
                {[...Array(t.stars)].map((_, idx) => (
                  <Star key={idx} size={15} fill="#e1a74b" color="#e1a74b" />
                ))}
              </div>
              <p className="testimonial-quote">"{t.quote}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar" style={{ background: t.avatarBg }}>
                  {t.avatar}
                </div>
                <div>
                  <strong>{t.name}</strong>
                  <small>{t.role}</small>
                  <span className="author-school">{t.school}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive FAQ Section (Accordion) */}
      <section className="landing-faq" id="faq">
        <div className="landing-section-heading">
          <span className="landing-kicker">FREQUENTLY ASKED QUESTIONS</span>
          <h2>Everything you need to know</h2>
          <p className="landing-section-sub">Got questions about NexusStudy? We have answers.</p>
        </div>

        <div className="faq-accordion">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index
            return (
              <div className={`faq-item ${isOpen ? 'open' : ''}`} key={index}>
                <button
                  className="faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown size={18} className={`faq-chevron ${isOpen ? 'rotate' : ''}`} />
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* High-Impact Modern CTA Banner */}
      <section className="landing-cta-banner">
        <div className="cta-banner-card">
          <div className="cta-badge">
            <Sparkles size={14} /> YOUR NEXT STUDY SESSION STARTS HERE
          </div>
          <h2>Good things happen when you learn together.</h2>
          <p>
            Create your shared study space today. No credit card required. Free forever for students.
          </p>
          <div className="cta-buttons-row">
            <Link className="landing-button landing-button-glow" to="/register">
              Create your free account <ArrowRight size={17} />
            </Link>
            <Link className="landing-button-secondary-light" to="/login">
              Already have an account? Log in
            </Link>
          </div>
          <div className="cta-perks">
            <span>✓ Instant workspace setup</span>
            <span>✓ Unlimited group members</span>
            <span>✓ AI study tools included</span>
          </div>
        </div>
      </section>

      {/* Rich Multi-Column Modern Footer */}
      <footer className="landing-footer-rich">
        <div className="footer-columns-wrap">
          <div className="footer-col-brand">
            <Link className="landing-brand" to="/">
              <BrandLogo markOnly className="landing-brand-image" />
              <span>
                NEXUS<span className="landing-brand-light">STUDY</span>
              </span>
            </Link>
            <p>
              The all-in-one collaborative workspace engineered for students and study groups to think, sync, and succeed
              together.
            </p>
            <div className="footer-status-pill">
              <span className="status-live-dot" /> All systems operational
            </div>
          </div>

          <div className="footer-col">
            <h4>WORKSPACE</h4>
            <a href="#tour">Collaborative Notes</a>
            <a href="#tour">Group Chat & Threads</a>
            <a href="#tour">Kanban & Deadlines</a>
            <a href="#tour">Study Calendar</a>
            <a href="#tour">AI Study Copilot</a>
          </div>

          <div className="footer-col">
            <h4>RESOURCES</h4>
            <a href="#features">Pomodoro Focus Timer</a>
            <a href="#features">Active Recall Flashcards</a>
            <a href="#faq">Student FAQ</a>
            <a href="#how-it-works">Study Group Best Practices</a>
          </div>

          <div className="footer-col">
            <h4>COMMUNITY</h4>
            <Link to="/register">Join Student Discord</Link>
            <Link to="/register">Campus Ambassadors</Link>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Create Free Account</Link>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>© 2026 NexusStudy. Designed for better study sessions.</span>
          <div className="footer-bottom-links">
            <a href="#faq">Privacy</a>
            <span className="dot-divider">·</span>
            <a href="#faq">Terms</a>
            <span className="dot-divider">·</span>
            <a href="#faq">Security</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
