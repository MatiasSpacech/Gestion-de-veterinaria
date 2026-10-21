import { IPC } from '@shared/ipc'
import {
  createUserSchema,
  resetPasswordSchema,
  updateRolePermissionsSchema,
  updateUserSchema,
  type CreateUserInput,
  type ResetPasswordInput,
  type UpdateRolePermissionsInput,
  type UpdateUserInput
} from '@shared/schemas'
import type { RolePermissionsRecord, UserRecord } from '@shared/types'
import { getDb } from '@main/db'
import { logActivity } from '@main/services/activity'
import { getAuthUser } from '@main/services/auth'
import {
  createUser,
  listRolePermissions,
  listUsers,
  resetUserPassword,
  updateRolePermissions,
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
    (input, user) => {
      const db = getDb()
      const created = createUser(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'user.create',
        entityType: 'user',
        entityId: created.id,
        details: { username: created.username, role: created.role }
      })
      return created
    },
    { adminOnly: true }
  )

  registerProtectedHandler<UpdateUserInput, UserRecord>(
    IPC.users.update,
    updateUserSchema,
    (input, user) => {
      const db = getDb()
      const updated = updateUserRecord(db, input)
      const sessionUser = getSessionUser()

      if (sessionUser?.id === updated.id) {
        const refreshed = getAuthUser(db, updated.id)

        if (refreshed) {
          setSessionUser(refreshed)
        }
      }

      logActivity(db, {
        userId: user.id,
        action: 'user.update',
        entityType: 'user',
        entityId: updated.id,
        details: {
          username: updated.username,
          role: updated.role,
          active: updated.active
        }
      })

      return updated
    },
    { adminOnly: true }
  )

  registerProtectedHandler<ResetPasswordInput, null>(
    IPC.users.resetPassword,
    resetPasswordSchema,
    (input, user) => {
      const db = getDb()
      resetUserPassword(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'user.reset-password',
        entityType: 'user',
        entityId: input.id
      })
      return null
    },
    { adminOnly: true }
  )

  registerProtectedHandler<void, RolePermissionsRecord[]>(
    IPC.users.permissions,
    null,
    () => listRolePermissions(getDb()),
    { adminOnly: true }
  )

  registerProtectedHandler<
    UpdateRolePermissionsInput,
    RolePermissionsRecord[]
  >(
    IPC.users.updatePermissions,
    updateRolePermissionsSchema,
    (input, user) => {
      const db = getDb()
      const permissions = updateRolePermissions(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'user.update-permissions',
        entityType: 'role',
        details: { role: input.role, permissions: input.permissions }
      })
      return permissions
    },
    { adminOnly: true }
  )
}
