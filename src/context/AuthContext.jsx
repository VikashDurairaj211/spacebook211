import { createContext, useContext, useState, useCallback } from 'react'
import * as authApi from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('spacebook_user')
    return stored ? JSON.parse(stored) : null
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { token, user: loggedInUser } = await authApi.login(email, password)
      localStorage.setItem('spacebook_token', token)
      localStorage.setItem('spacebook_user', JSON.stringify(loggedInUser))
      setUser(loggedInUser)
      return true
    } catch (err) {
      // API not reachable yet (e.g. backend not running) — fall back to a
      // demo session so the frontend is usable on its own. Remove this
      // block once /api/auth/login is live.
      if (!err.response) {
        // Demo fallback: treat emails containing "admin" as Admin for demo purposes
        const isAdmin = String(email).toLowerCase().includes('admin')
        const demoUser = {
          id: 'demo',
          name: email.split('@')[0] || 'Employee',
          email,
          department: 'Engineering',
          role: isAdmin ? 'Admin' : 'Employee',
        }
        localStorage.setItem('spacebook_token', 'demo-token')
        localStorage.setItem('spacebook_user', JSON.stringify(demoUser))
        setUser(demoUser)
        return true
      }
      setError(
        err.response?.data?.message || 'Could not sign in. Check your email and password.'
      )
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    localStorage.removeItem('spacebook_token')
    localStorage.removeItem('spacebook_user')
    setUser(null)
  }, [])

  const updateProfile = useCallback((updates) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...updates }
      try {
        localStorage.setItem('spacebook_user', JSON.stringify(merged))
      } catch (e) {
        // ignore
      }
      return merged
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, error, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
