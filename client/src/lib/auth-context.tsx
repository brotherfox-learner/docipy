'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react'
import { api, setAccessToken, clearAccessToken } from './api'

export interface User {
  id: string
  email: string
  name: string
  plan: 'free' | 'pro'
  is_verified: boolean
  avatar_url: string | null
  oauth_provider: string | null
  /** False for OAuth-only accounts (no password_hash). */
  has_password: boolean
  /** From `usage_limits`; refreshed on login, refresh, and GET /api/auth/me */
  ai_queries_today: number
  flashcards_generated: number
  documents_count: number
  quiz_generated: number
  /** Server: true when email is in ADMIN_EMAILS */
  is_admin?: boolean
}

interface AuthContextType {
  user: User | null
  /** True until the first `POST /api/auth/refresh` (bootstrap) finishes — use for global session gate */
  isLoadingSession: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  restoreSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const isFirstBootstrap = useRef(true)

  useEffect(() => {
    try {
      localStorage.removeItem('access_token')
    } catch {
      /* ignore */
    }
  }, [])

  const restoreSession = useCallback(async () => {
    try {
      const { data } = await api.post('/api/auth/refresh')
      setAccessToken(data.data.accessToken)
      setUser(data.data.user)
    } catch (err: unknown) {
      setUser(null)
      clearAccessToken()
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 401 || status === 403) {
        try {
          await api.post('/api/auth/logout')
        } catch {
          /* ignore — still clear client state */
        }
      }
    } finally {
      if (isFirstBootstrap.current) {
        isFirstBootstrap.current = false
        setIsLoadingSession(false)
      }
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  async function login(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password })
    setAccessToken(data.data.accessToken)
    setUser(data.data.user)
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } finally {
      clearAccessToken()
      setUser(null)
    }
  }

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/api/auth/me')
    setUser(data.data)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, isLoadingSession, login, logout, refreshUser, restoreSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
