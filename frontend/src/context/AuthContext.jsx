import { createContext, useEffect, useState } from 'react'
import { getCurrentUser, login as loginRequest, register as registerRequest } from '../services/authService.js'
import { clearToken, getToken, setRefreshToken, setToken } from '../utils/storage.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null)
	const [token, setAccessToken] = useState(() => getToken())
	const [loading, setLoading] = useState(Boolean(token))

	useEffect(() => {
		function handleUnauthorized() {
			setUser(null)
			setAccessToken(null)
		}
		window.addEventListener('nexus:unauthorized', handleUnauthorized)
		return () => window.removeEventListener('nexus:unauthorized', handleUnauthorized)
	}, [])

	useEffect(() => {
		if (!token) {
			setLoading(false)
			return undefined
		}
		let active = true
		getCurrentUser()
			.then(({ data }) => { if (active) setUser(data.data) })
			.catch(() => { if (active) { clearToken(); setUser(null); setAccessToken(null) } })
			.finally(() => { if (active) setLoading(false) })
		return () => { active = false }
	}, [token])

	async function authenticate(request) {
		const { data } = await request
		setToken(data.data.accessToken)
		setRefreshToken(data.data.refreshToken)
		setAccessToken(data.data.accessToken)
		setUser(data.data.user)
		return data.data.user
	}

	async function login(credentials) { return authenticate(loginRequest(credentials)) }
	async function register(details) { return authenticate(registerRequest(details)) }
	function logout() { clearToken(); setUser(null); setAccessToken(null) }
	function updateUser(newUser) { setUser(newUser) }

	return <AuthContext.Provider value={{ user, token, isAuthenticated: Boolean(user && token), loading, login, register, logout, updateUser }}>{children}</AuthContext.Provider>
}
