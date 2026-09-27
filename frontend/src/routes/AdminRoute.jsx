import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

export default function AdminRoute() {
  const { user } = useAuth()
  return user?.systemRole === 'ADMIN' ? <Outlet /> : <Navigate to="/dashboard" replace />
}