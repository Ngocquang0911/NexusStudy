import { Navigate, Outlet } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'
import useAuth from '../hooks/useAuth.js'

export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuth()
  const themeContext = useTheme()
  if (loading) return <div className="route-loading">Loading...</div>
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <><Outlet />{themeContext && <button type="button" className="public-theme-toggle" aria-label={themeContext.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={themeContext.toggleTheme}>{themeContext.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{themeContext.theme === 'dark' ? 'Light' : 'Dark'}</span></button>}</>
}
