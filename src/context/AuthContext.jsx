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
        const normalizedEmail = String(email).trim().toLowerCase()
        const isAdmin = normalizedEmail === 'admin@spacebook.com'
        const demoUser = {
          id: 'demo',
          name: isAdmin ? 'SpaceBook Administrator' : 'Demo Employee',
          email: normalizedEmail,
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

  const register = useCallback(async (form) => {
    setLoading(true); setError(null)
    try {
      const users = JSON.parse(localStorage.getItem('spacebook_registered_users') || '[]')
      if (users.some((user) => user.employeeId.toLowerCase() === form.employeeId.toLowerCase())) throw new Error('Employee ID is already registered.')
      if (users.some((user) => user.email === form.email.toLowerCase())) throw new Error('This email is already registered.')
      users.push({ ...form, email: form.email.toLowerCase() })
      localStorage.setItem('spacebook_registered_users', JSON.stringify(users))
      return true
    } catch (err) { setError(err.message); return false } finally { setLoading(false) }
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
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, error, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
