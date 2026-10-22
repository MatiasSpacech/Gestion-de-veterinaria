import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

import type { LoginInput, SetupAdminInput } from '@shared/schemas'
import type { AuthUser } from '@shared/types'

import {
  createFirstAdmin,
  isDatabaseInitialized,
  signIn,
  signOut,
  subscribeToSession
} from './controllers/session'

interface SessionContextValue {
  user: AuthUser | null
  ready: boolean
  needsSetup: boolean
  signIn: (input: LoginInput) => void
  signOut: () => void
  createFirstAdmin: (input: SetupAdminInput) => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToSession(setUser)

    try {
      setNeedsSetup(!isDatabaseInitialized())
    } catch {
      setNeedsSetup(false)
    } finally {
      setReady(true)
    }

    return unsubscribe
  }, [])

  const handleSignIn = useCallback((input: LoginInput) => {
    setUser(signIn(input))
  }, [])

  const handleSignOut = useCallback(() => {
    signOut()
  }, [])

  const handleCreateFirstAdmin = useCallback((input: SetupAdminInput) => {
    setUser(createFirstAdmin(input))
    setNeedsSetup(false)
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      ready,
      needsSetup,
      signIn: handleSignIn,
      signOut: handleSignOut,
      createFirstAdmin: handleCreateFirstAdmin
    }),
    [
      user,
      ready,
      needsSetup,
      handleSignIn,
      handleSignOut,
      handleCreateFirstAdmin
    ]
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSession debe usarse dentro de SessionProvider')
  }

  return context
}
