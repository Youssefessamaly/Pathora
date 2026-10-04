import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getCurrentUser, login as apiLogin, registerUnauthorizedHandler } from '../lib/api'
import { clearStoredToken, getStoredToken, storeToken } from '../lib/token'
import { AuthContext, type AdminUser, type AuthContextValue } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const logout = useCallback(() => {
    clearStoredToken()
    setAdmin(null)
  }, [])

  // Any 401 from anywhere in the app (not just a deliberate logout click) clears the session
  // the same way — see lib/api.ts's unauthorizedHandler.
  useEffect(() => {
    registerUnauthorizedHandler(logout)
    return () => registerUnauthorizedHandler(null)
  }, [logout])

  // Re-validate a stored token (and its role) against the backend on load, rather than trusting
  // an unverified, possibly-expired token left over from a previous visit to this tab.
  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setIsInitializing(false)
      return
    }

    getCurrentUser()
      .then((current) => {
        if (current.role !== 'ADMIN') {
          clearStoredToken()
          setAdmin(null)
          return
        }
        setAdmin(current)
      })
      .catch(() => {
        // An invalid/expired token already triggered the unauthorized handler above for a
        // 401; any other failure just leaves this tab logged out rather than guessing.
        setAdmin(null)
      })
      .finally(() => setIsInitializing(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin({ email, password })

    if (response.role !== 'ADMIN') {
      // Never store a token for a non-admin account, even momentarily.
      throw new Error('This account does not have admin access.')
    }

    storeToken(response.accessToken)
    setAdmin({ userId: response.userId, email: response.email, role: response.role })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ admin, isAuthenticated: admin !== null, isInitializing, login, logout }),
    [admin, isInitializing, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
