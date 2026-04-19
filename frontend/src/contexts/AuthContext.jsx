import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = 'http://127.0.0.1:5000/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)
  const [refreshToken, setRefreshToken] = useState(null)

  useEffect(() => {
    const at = localStorage.getItem('access_token')
    const rt = localStorage.getItem('refresh_token')
    const su = localStorage.getItem('user')
    if (at && rt && su) {
      try { setAccessToken(at); setRefreshToken(rt); setUser(JSON.parse(su)) } 
      catch { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user') }
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { username, password })
    const { access_token, refresh_token, user: u } = res.data
    setAccessToken(access_token); setRefreshToken(refresh_token); setUser(u)
    localStorage.setItem('access_token', access_token); localStorage.setItem('refresh_token', refresh_token); localStorage.setItem('user', JSON.stringify(u))
    return u
  }, [])

  const register = useCallback(async (username, password, email, nickname) => {
    const res = await axios.post(`${API_BASE}/auth/register`, { username, password, email, nickname })
    const { access_token, refresh_token, user: u } = res.data
    setAccessToken(access_token); setRefreshToken(refresh_token); setUser(u)
    localStorage.setItem('access_token', access_token); localStorage.setItem('refresh_token', refresh_token); localStorage.setItem('user', JSON.stringify(u))
    return u
  }, [])

  const logout = useCallback(async () => {
    try { if (accessToken) await axios.post(`${API_BASE}/auth/logout`, {}, { headers: { Authorization: `Bearer ${accessToken}` } }) } catch {}
    setAccessToken(null); setRefreshToken(null); setUser(null)
    localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user')
  }, [accessToken])

  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) { logout(); return null }
    try {
      const res = await axios.post(`${API_BASE}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${refreshToken}` } })
      const { access_token, user: u } = res.data
      setAccessToken(access_token); if (u) setUser(u)
      localStorage.setItem('access_token', access_token); if (u) localStorage.setItem('user', JSON.stringify(u))
      return access_token
    } catch { logout(); return null }
  }, [refreshToken, logout])

  const updateUser = useCallback((u) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)) }, [])

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, refreshToken, isAuthenticated: !!user, login, register, logout, refreshAccessToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
