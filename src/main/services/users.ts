import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type {
  CreateUserInput,
  ResetPasswordInput,
  UpdateRolePermissionsInput,
  UpdateUserInput
} from '@shared/schemas'
import { PERMISSION_MODULES, ROLES } from '@shared/roles'
import type { RolePermissionsRecord, UserRecord } from '@shared/types'
import { getPermissionsForRole, hashPassword, type UserRow } from './auth'

function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function getUserById(db: Database.Database, id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

function usernameTaken(
  db: Database.Database,
  username: string,
  excludeId?: number
): boolean {
  const row = db
    .prepare('SELECT id FROM users WHERE username = ? AND (? IS NULL OR id <> ?)')
    .get(username, excludeId ?? null, excludeId ?? null) as { id: number } | undefined

  return Boolean(row)
}

function countActiveAdmins(db: Database.Database, excludeId?: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM users
       WHERE role = 'admin' AND active = 1 AND (? IS NULL OR id <> ?)`
    )
    .get(excludeId ?? null, excludeId ?? null) as { count: number }

  return row.count
}

export function listUsers(db: Database.Database): UserRecord[] {
  const rows = db
    .prepare('SELECT * FROM users ORDER BY active DESC, name COLLATE NOCASE')
    .all() as UserRow[]

  return rows.map(toUserRecord)
}

export function createUser(db: Database.Database, input: CreateUserInput): UserRecord {
  if (usernameTaken(db, input.username)) {
    throw new AppError('CONFLICT', 'Ese nombre de usuario ya está en uso')
  }

  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .run(input.name, input.username, hashPassword(input.password), input.role, now, now)

  const created = getUserById(db, Number(result.lastInsertRowid))

  if (!created) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo crear el usuario')
  }

  return toUserRecord(created)
}

export function updateUser(db: Database.Database, input: UpdateUserInput): UserRecord {
  const existing = getUserById(db, input.id)

  if (!existing) {
    throw new AppError('NOT_FOUND', 'El usuario no existe')
  }

  if (usernameTaken(db, input.username, input.id)) {
    throw new AppError('CONFLICT', 'Ese nombre de usuario ya está en uso')
  }

  const losesAdmin = existing.role === 'admin' && existing.active === 1
  const remainsAdmin = input.role === 'admin' && input.active

  if (losesAdmin && !remainsAdmin && countActiveAdmins(db, input.id) === 0) {
    throw new AppError('LAST_ADMIN', 'Debe existir al menos un administrador activo')
  }

  db.prepare(
    `UPDATE users
     SET name = ?, username = ?, role = ?, active = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.name,
    input.username,
    input.role,
    input.active ? 1 : 0,
    new Date().toISOString(),
    input.id
  )

  const updated = getUserById(db, input.id)

  if (!updated) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo actualizar el usuario')
  }

  return toUserRecord(updated)
}

export function resetUserPassword(
  db: Database.Database,
  input: ResetPasswordInput
): void {
  const existing = getUserById(db, input.id)

  if (!existing) {
    throw new AppError('NOT_FOUND', 'El usuario no existe')
  }

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(input.newPassword),
    new Date().toISOString(),
    input.id
  )
}

export function listRolePermissions(
  db: Database.Database
): RolePermissionsRecord[] {
  return ROLES.map((role) => ({
    role,
    permissions: getPermissionsForRole(db, role)
  }))
}

export function updateRolePermissions(
  db: Database.Database,
  input: UpdateRolePermissionsInput
): RolePermissionsRecord[] {
  const allowed = new Set(input.permissions)
  const now = new Date().toISOString()
  const update = db.transaction(() => {
    for (const module of PERMISSION_MODULES) {
      db.prepare(
        `INSERT INTO role_permissions (role, module, allowed)
         VALUES (?, ?, ?)
         ON CONFLICT(role, module) DO UPDATE SET allowed = excluded.allowed`
      ).run(input.role, module, allowed.has(module) ? 1 : 0)
    }

    db.prepare('UPDATE users SET updated_at = ? WHERE role = ?').run(
      now,
      input.role
    )
  })

  update()
  return listRolePermissions(db)
}
