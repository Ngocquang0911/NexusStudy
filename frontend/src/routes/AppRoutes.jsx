import { Navigate, Route, Routes } from 'react-router-dom'
import PlaceholderPage from '../components/common/PlaceholderPage.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
import AIAssistantPage from '../pages/ai/AIAssistantPage.jsx'
import CalendarPage from '../pages/calendar/CalendarPage.jsx'
import ChatPage from '../pages/chat/ChatPage.jsx'
import DashboardPage from '../pages/dashboard/DashboardPage.jsx'
import DocumentsPage from '../pages/document/DocumentsPage.jsx'
import EvaluationPage from '../pages/evaluation/EvaluationPage.jsx'
import LoginPage from '../pages/auth/LoginPage.jsx'
import PollPage from '../pages/poll/PollPage.jsx'
import ProfilePage from '../pages/profile/ProfilePage.jsx'
import RegisterPage from '../pages/auth/RegisterPage.jsx'
import TaskPage from '../pages/task/TaskPage.jsx'
import WorkspaceDetailPage from '../pages/workspace/WorkspaceDetailPage.jsx'
import WorkspaceListPage from '../pages/workspace/WorkspaceListPage.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import PublicRoute from './PublicRoute.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspaces" element={<WorkspaceListPage />} />
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

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
