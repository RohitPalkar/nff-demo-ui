import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  getStoredSession,
  login as loginRequest,
  switchRole as switchRoleRequest,
  verifySignInCode,
} from '@/services/auth'
import type { Role, SessionUser } from '@/types'

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  /** Email + one-time code sign-in (SOW v1.3). */
  signInWithCode: (email: string, code: string) => Promise<SessionUser>
  logout: () => void
  switchRole: (role: Role) => void
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(
    () => getStoredSession()?.user ?? null,
  )

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginRequest(email, password)
    setUser(session.user)
    return session.user
  }, [])

  const signInWithCode = useCallback(async (email: string, code: string) => {
    const session = await verifySignInCode(email, code)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const switchRole = useCallback((role: Role) => {
    const session = switchRoleRequest(role)
    setUser(session?.user ?? null)
    window.location.assign(role === 'visitor' ? '/' : '/cms')
  }, [])

  const refresh = useCallback(() => {
    setUser(getStoredSession()?.user ?? null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      signInWithCode,
      logout,
      switchRole,
      refresh,
    }),
    [user, login, signInWithCode, logout, switchRole, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
