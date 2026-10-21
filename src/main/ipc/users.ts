import { IPC } from '@shared/ipc'
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  type CreateUserInput,
  type ResetPasswordInput,
  type UpdateUserInput
} from '@shared/schemas'
import type { UserRecord } from '@shared/types'
import { getDb } from '@main/db'
import { getAuthUser } from '@main/services/auth'
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUser as updateUserRecord
} from '@main/services/users'
import { getSessionUser, setSessionUser } from '@main/session'
import { registerProtectedHandler } from './handle'

export function registerUserHandlers(): void {
  registerProtectedHandler<void, UserRecord[]>(
    IPC.users.list,
    null,
    () => listUsers(getDb()),
    { adminOnly: true }
  )

  registerProtectedHandler<CreateUserInput, UserRecord>(
    IPC.users.create,
    createUserSchema,
    (input) => createUser(getDb(), input),
    { adminOnly: true }
  )

  registerProtectedHandler<UpdateUserInput, UserRecord>(
    IPC.users.update,
    updateUserSchema,
    (input) => {
      const db = getDb()
      const updated = updateUserRecord(db, input)
      const sessionUser = getSessionUser()

      if (sessionUser?.id === updated.id) {
        const refreshed = getAuthUser(db, updated.id)

        if (refreshed) {
          setSessionUser(refreshed)
        }
      }

      return updated
    },
    { adminOnly: true }
  )

  registerProtectedHandler<ResetPasswordInput, null>(
    IPC.users.resetPassword,
    resetPasswordSchema,
    (input) => {
      resetUserPassword(getDb(), input)
      return null
    },
    { adminOnly: true }
  )
}
