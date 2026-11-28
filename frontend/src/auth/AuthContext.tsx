import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as api from './api'
import type { User } from './api'

type AuthState =
  | { kind: 'loading' }
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: User }
  | { kind: 'error' }

type AuthContextValue = {
  state: AuthState
  refresh: () => void
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const revision = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const requestRevision = ++revision.current
    api.currentUser(controller.signal).then((user) => {
      if (active && requestRevision === revision.current) setState(user ? { kind: 'authenticated', user } : { kind: 'anonymous' })
    }).catch(() => {
      if (active && requestRevision === revision.current) setState({ kind: 'error' })
    })
    return () => {
      active = false
      controller.abort()
    }
  }, [attempt])

  function refresh() {
    setState({ kind: 'loading' })
    setAttempt((previous) => previous + 1)
  }

  async function signIn(username: string, password: string) {
    const user = await api.login(username, password)
    revision.current += 1
    setState({ kind: 'authenticated', user })
  }

  async function signOut() {
    await api.logout()
    revision.current += 1
    setState({ kind: 'anonymous' })
  }

  return (
    <AuthContext.Provider value={{ state, refresh, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
