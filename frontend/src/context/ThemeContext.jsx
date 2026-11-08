import { createContext, useContext, useEffect, useState } from 'react'
const ThemeContext = createContext(null)
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('nexus.workspace.theme') === 'dark' ? 'dark' : 'light')
  useEffect(() => {
    document.body.dataset.workspaceTheme = theme
    localStorage.setItem('nexus.workspace.theme', theme)
    return () => { delete document.body.dataset.workspaceTheme }
  }, [theme])
  useEffect(() => {
    function syncTheme(event) {
      if (event.key === 'nexus.workspace.theme') setTheme(event.newValue === 'dark' ? 'dark' : 'light')
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])
  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((value) => value === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>
}
export function useTheme() { return useContext(ThemeContext) }
