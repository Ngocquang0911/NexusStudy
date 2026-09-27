import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'
import DashboardPage from '../pages/dashboard/DashboardPage.jsx'

export default function DashboardRoute() {
  const { user } = useAuth()
  return user?.systemRole === 'ADMIN' ? <Navigate to="/admin" replace /> : <DashboardPage />
}