import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MODULES,
  type PermissionModule,
  type Role
} from '@shared/roles'
import type { AuthUser } from '@shared/types'
import type { SetupAdminInput } from '@shared/schemas'

const HASH_ALGORITHM = 'scrypt'
const KEY_LENGTH = 64

export interface UserRow {
  id: number
  name: string
  username: string
  password_hash: string
  role: Role
  active: number
  created_at: string
  updated_at: string
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${HASH_ALGORITHM}$${salt}$${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, hash] = storedHash.split('$')

  if (algorithm !== HASH_ALGORITHM || !salt || !hash) {
    return false
  }

  const expected = Buffer.from(hash, 'hex')

  if (expected.length !== KEY_LENGTH) {
    return false
  }

  const actual = scryptSync(password, salt, expected.length)
  return timingSafeEqual(actual, expected)
}

export function countUsers(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }
  return row.count
}

export function isInitialized(db: Database.Database): boolean {
  return countUsers(db) > 0
}

export function getPermissionsForRole(
  db: Database.Database,
  role: Role
): PermissionModule[] {
  if (role === 'admin') {
    return [...PERMISSION_MODULES]
  }

  const rows = db
    .prepare('SELECT module, allowed FROM role_permissions WHERE role = ?')
    .all(role) as Array<{ module: string; allowed: number }>

  if (rows.length === 0) {
    return [...DEFAULT_ROLE_PERMISSIONS[role]]
  }

  const allowed = new Set(rows.filter((row) => row.allowed === 1).map((row) => row.module))
  return PERMISSION_MODULES.filter((module) => allowed.has(module))
}

export function hasPermission(
  db: Database.Database,
  role: Role,
  module: PermissionModule
): boolean {
  return getPermissionsForRole(db, role).includes(module)
}

export function getUserRowById(db: Database.Database, id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function getUserRowByUsername(
  db: Database.Database,
  username: string
): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
    | UserRow
    | undefined
}

function toAuthUser(db: Database.Database, row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    permissions: getPermissionsForRole(db, row.role)
  }
}

export function getAuthUser(db: Database.Database, id: number): AuthUser | null {
  const row = getUserRowById(db, id)

  if (!row || row.active !== 1) {
    return null
  }

  return toAuthUser(db, row)
}

export function setupAdmin(db: Database.Database, input: SetupAdminInput): AuthUser {
  if (isInitialized(db)) {
    throw new AppError(
      'SETUP_ALREADY_COMPLETED',
      'La aplicación ya tiene usuarios configurados'
    )
  }

  const now = new Date().toISOString()

  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, ?, ?)`
      )
      .run(input.name, input.username, hashPassword(input.password), now, now)

    return Number(result.lastInsertRowid)
  })

  const userId = create()
  const user = getAuthUser(db, userId)

  if (!user) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo crear el administrador')
  }

  return user
}

export function authenticate(
  db: Database.Database,
  username: string,
  password: string
): AuthUser {
  const row = getUserRowByUsername(db, username)

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new AppError('INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos')
  }

  if (row.active !== 1) {
    throw new AppError('USER_DISABLED', 'Este usuario está desactivado')
  }

  return toAuthUser(db, row)
}

export function changePassword(
  db: Database.Database,
  userId: number,
  currentPassword: string,
  newPassword: string
): void {
  const row = getUserRowById(db, userId)

  if (!row || row.active !== 1) {
    throw new AppError('UNAUTHORIZED', 'Tu usuario ya no está disponible')
  }

  if (!verifyPassword(currentPassword, row.password_hash)) {
    throw new AppError('INVALID_CREDENTIALS', 'La contraseña actual no es correcta')
  }

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(newPassword),
    new Date().toISOString(),
    userId
  )
}
