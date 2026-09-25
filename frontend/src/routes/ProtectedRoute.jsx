import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

export default function ProtectedRoute() {
  const location = useLocation()
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="route-loading">Loading your workspace...</div>
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />
}
