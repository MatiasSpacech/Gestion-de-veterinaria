import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { AppState } from 'react-native'

import type { LoginInput, SetupAdminInput } from '@shared/schemas'
import type { AuthUser } from '@shared/types'

import { runAutomaticBackup } from './backups'
import {
  createFirstAdmin,
  isDatabaseInitialized,
  signIn,
  signOut,
  subscribeToSession,
  verifySessionPassword
} from './controllers/session'
import {
  authenticateWithBiometrics,
  isAutoLockSuppressed,
  isBiometricLockEnabled,
  setBiometricLockEnabled
} from './lock'

interface SessionContextValue {
  user: AuthUser | null
  ready: boolean
  needsSetup: boolean
  locked: boolean
  biometricEnabled: boolean
  signIn: (input: LoginInput) => void
  signOut: () => void
  createFirstAdmin: (input: SetupAdminInput) => void
  unlockWithPassword: (password: string) => boolean
  unlockWithBiometrics: () => Promise<boolean>
  enableBiometricLock: () => Promise<boolean>
  disableBiometricLock: () => Promise<void>
  lockNow: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  const userRef = useRef<AuthUser | null>(null)
  const biometricEnabledRef = useRef(false)
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    biometricEnabledRef.current = biometricEnabled
  }, [biometricEnabled])

  useEffect(() => {
    let mounted = true

    void isBiometricLockEnabled().then((enabled) => {
      if (mounted) {
        biometricEnabledRef.current = enabled
        setBiometricEnabled(enabled)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const leavingApp = appStateRef.current === 'active' && nextState !== 'active'

      if (
        leavingApp &&
        userRef.current &&
        biometricEnabledRef.current &&
        !isAutoLockSuppressed()
      ) {
        setLocked(true)
      }

      appStateRef.current = nextState
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSession(setUser)

    try {
      setNeedsSetup(!isDatabaseInitialized())

      if (isDatabaseInitialized()) {
        runAutomaticBackup()
      }
    } catch {
      setNeedsSetup(false)
    } finally {
      setReady(true)
    }

    return unsubscribe
  }, [])

  const handleSignIn = useCallback((input: LoginInput) => {
    setUser(signIn(input))
    setLocked(false)
  }, [])

  const handleSignOut = useCallback(() => {
    signOut()
    setLocked(false)
  }, [])

  const handleCreateFirstAdmin = useCallback((input: SetupAdminInput) => {
    setUser(createFirstAdmin(input))
    setNeedsSetup(false)
    setLocked(false)
  }, [])

  const handleUnlockWithPassword = useCallback((password: string) => {
    if (!verifySessionPassword(password)) {
      return false
    }

    setLocked(false)
    return true
  }, [])

  const handleUnlockWithBiometrics = useCallback(async () => {
    const success = await authenticateWithBiometrics()

    if (success) {
      setLocked(false)
    }

    return success
  }, [])

  const handleEnableBiometricLock = useCallback(async () => {
    if (biometricEnabledRef.current) {
      return true
    }

    const success = await authenticateWithBiometrics()

    if (!success) {
      return false
    }

    await setBiometricLockEnabled(true)
    biometricEnabledRef.current = true
    setBiometricEnabled(true)

    return true
  }, [])

  const handleDisableBiometricLock = useCallback(async () => {
    await setBiometricLockEnabled(false)
    biometricEnabledRef.current = false
    setBiometricEnabled(false)
    setLocked(false)
  }, [])

  const handleLockNow = useCallback(() => {
    if (userRef.current && biometricEnabledRef.current) {
      setLocked(true)
    }
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      ready,
      needsSetup,
      locked: locked && user !== null && biometricEnabled,
      biometricEnabled,
      signIn: handleSignIn,
      signOut: handleSignOut,
      createFirstAdmin: handleCreateFirstAdmin,
      unlockWithPassword: handleUnlockWithPassword,
      unlockWithBiometrics: handleUnlockWithBiometrics,
      enableBiometricLock: handleEnableBiometricLock,
      disableBiometricLock: handleDisableBiometricLock,
      lockNow: handleLockNow
    }),
    [
      user,
      ready,
      needsSetup,
      locked,
      biometricEnabled,
      handleSignIn,
      handleSignOut,
      handleCreateFirstAdmin,
      handleUnlockWithPassword,
      handleUnlockWithBiometrics,
      handleEnableBiometricLock,
      handleDisableBiometricLock,
      handleLockNow
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
