import { app } from 'electron'
import {
  changePasswordSchema,
  loginSchema,
  setupAdminSchema,
  type ChangePasswordInput,
  type LoginInput,
  type SetupAdminInput
} from '@shared/schemas'
import { IPC } from '@shared/ipc'
import type { AuthStatus } from '@shared/types'
import { getDb } from '@main/db'
import {
  authenticate,
  changePassword,
  countUsers,
  getAuthUser,
  setupAdmin
} from '@main/services/auth'
import { getBusinessName } from '@main/services/settings'
import {
  clearSession,
  getSessionUser,
  setSessionUser
} from '@main/session'
import { registerProtectedHandler, registerPublicHandler } from './handle'

function buildAuthStatus(): AuthStatus {
  const db = getDb()
  let user = getSessionUser()

  if (user) {
    const refreshed = getAuthUser(db, user.id)

    if (refreshed) {
      user = refreshed
      setSessionUser(refreshed)
    } else {
      clearSession()
      user = null
    }
  }

  return {
    initialized: countUsers(db) > 0,
    user,
    businessName: getBusinessName(db),
    version: app.getVersion()
  }
}

export function registerAuthHandlers(): void {
  registerPublicHandler<void, AuthStatus>(IPC.auth.status, null, () => buildAuthStatus())

  registerPublicHandler<SetupAdminInput, AuthStatus>(
    IPC.auth.setup,
    setupAdminSchema,
    (input) => {
      const user = setupAdmin(getDb(), input)
      setSessionUser(user)
      return buildAuthStatus()
    }
  )

  registerPublicHandler<LoginInput, AuthStatus>(
    IPC.auth.login,
    loginSchema,
    (input) => {
      const user = authenticate(getDb(), input.username, input.password)
      setSessionUser(user)
      return buildAuthStatus()
    }
  )

  registerPublicHandler<void, AuthStatus>(IPC.auth.logout, null, () => {
    clearSession()
    return buildAuthStatus()
  })

  registerProtectedHandler<ChangePasswordInput, null>(
    IPC.auth.changePassword,
    changePasswordSchema,
    (input, user) => {
      changePassword(getDb(), user.id, input.currentPassword, input.newPassword)
      return null
    }
  )
}
