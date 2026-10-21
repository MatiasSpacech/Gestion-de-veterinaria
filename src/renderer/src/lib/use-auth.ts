import { createContext, useContext } from 'react'
import type { ChangePasswordInput, LoginInput, SetupAdminInput } from '@shared/schemas'
import type { PermissionModule } from '@shared/roles'
import type { AuthStatus, AuthUser } from '@shared/types'

export const AUTH_QUERY_KEY = ['auth', 'status'] as const

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  permissions: PermissionModule[]
  businessName: string
  hasPermission: (module: PermissionModule) => boolean
  login: (input: LoginInput) => Promise<AuthStatus>
  setup: (input: SetupAdminInput) => Promise<AuthStatus>
  logout: () => Promise<AuthStatus>
  changePassword: (input: ChangePasswordInput) => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }

  return context
}
