import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import PlaceholderPage from '../components/common/PlaceholderPage.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import AdminRoute from './AdminRoute.jsx'
import PublicRoute from './PublicRoute.jsx'

const AIAssistantPage = lazy(() => import('../pages/ai/AIAssistantPage.jsx'))
const AdminPage = lazy(() => import('../pages/admin/AdminPage.jsx'))
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage.jsx'))
const ChatPage = lazy(() => import('../pages/chat/ChatPage.jsx'))
const DashboardRoute = lazy(() => import('./DashboardRoute.jsx'))
const DocumentsPage = lazy(() => import('../pages/document/DocumentsPage.jsx'))
const EvaluationPage = lazy(() => import('../pages/evaluation/EvaluationPage.jsx'))
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx'))
const PollPage = lazy(() => import('../pages/poll/PollPage.jsx'))
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage.jsx'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.jsx'))
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage.jsx'))
const TaskPage = lazy(() => import('../pages/task/TaskPage.jsx'))
const WorkspaceDetailPage = lazy(() => import('../pages/workspace/WorkspaceDetailPage.jsx'))
const WorkspaceListPage = lazy(() => import('../pages/workspace/WorkspaceListPage.jsx'))
const DeletedSpacesPage = lazy(() => import('../pages/workspace/DeletedSpacesPage.jsx'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Loading page...</div>}>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/workspaces" element={<WorkspaceListPage />} />
            <Route path="/deleted-spaces" element={<DeletedSpacesPage />} />
            <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
            <Route path="/workspaces/:workspaceId/tasks" element={<TaskPage />} />
            <Route path="/tasks" element={<TaskPage />} />
            <Route path="/workspaces/:workspaceId/chat" element={<ChatPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/workspaces/:workspaceId/polls" element={<PollPage />} />
            <Route path="/polls" element={<PollPage />} />
            <Route path="/workspaces/:workspaceId/documents" element={<DocumentsPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/workspaces/:workspaceId/evaluations" element={<EvaluationPage />} />
            <Route path="/evaluations" element={<EvaluationPage />} />
            <Route path="/workspaces/:workspaceId/ai" element={<AIAssistantPage />} />
            <Route path="/ai" element={<AIAssistantPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route
              path="/workspaces/:workspaceId/*"
              element={<PlaceholderPage title="Workspace module" description="This workspace module will be connected in a later phase." />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
