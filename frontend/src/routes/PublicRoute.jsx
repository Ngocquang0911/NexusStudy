import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="route-loading">Loading...</div>
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
