import type Database from 'better-sqlite3'
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUser
} from '@desktop/services/users'
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
  type CreateUserInput,
  type ResetPasswordInput,
  type UpdateUserInput
} from '@shared/schemas'
import type { UserRecord } from '@shared/types'

import { recordActivity } from '../../data/controllers/audit'
import { requirePermission } from '../../data/controllers/permissions'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'

export function listUserDirectory(
  db: Database.Database = getMobileDatabase()
): UserRecord[] {
  requirePermission('usuarios', db)

  return listUsers(db)
}

export function registerUser(
  input: CreateUserInput,
  db: Database.Database = getMobileDatabase()
): UserRecord {
  requirePermission('usuarios', db)

  const parsed = parseInput(createUserSchema, input)
  const user = createUser(db, parsed)

  recordActivity(
    {
      action: 'usuario.creado',
      entityType: 'user',
      entityId: user.id,
      details: { username: user.username, role: user.role }
    },
    db
  )

  return user
}

export function editUser(
  input: UpdateUserInput,
  db: Database.Database = getMobileDatabase()
): UserRecord {
  requirePermission('usuarios', db)

  const parsed = parseInput(updateUserSchema, input)
  const user = updateUser(db, parsed)

  recordActivity(
    {
      action: 'usuario.actualizado',
      entityType: 'user',
      entityId: user.id,
      details: { role: user.role, active: user.active }
    },
    db
  )

  return user
}

export function resetPassword(
  input: ResetPasswordInput,
  db: Database.Database = getMobileDatabase()
): void {
  requirePermission('usuarios', db)

  const parsed = parseInput(resetPasswordSchema, input)

  resetUserPassword(db, parsed)

  recordActivity(
    {
      action: 'usuario.password',
      entityType: 'user',
      entityId: parsed.id
    },
    db
  )
}
