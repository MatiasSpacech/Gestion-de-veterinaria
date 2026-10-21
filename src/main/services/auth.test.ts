import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import { createDatabase } from '@main/db/connection'
import {
  authenticate,
  changePassword,
  getAuthUser,
  hashPassword,
  isInitialized,
  setupAdmin,
  verifyPassword
} from './auth'

function expectAppError(callback: () => void, code: string): void {
  try {
    callback()
    throw new Error('Se esperaba un AppError')
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)

    if (error instanceof AppError) {
      expect(error.code).toBe(code)
    }
  }
}

describe('autenticación', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-auth-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('genera hashes distintos y verifica correctamente la contraseña', () => {
    const firstHash = hashPassword('secreto123')
    const secondHash = hashPassword('secreto123')

    expect(firstHash).not.toBe(secondHash)
    expect(verifyPassword('secreto123', firstHash)).toBe(true)
    expect(verifyPassword('incorrecta', firstHash)).toBe(false)
    expect(verifyPassword('secreto123', 'hash-invalido')).toBe(false)
  })

  it('crea el administrador inicial y no permite repetir la configuración', () => {
    expect(isInitialized(database)).toBe(false)

    const admin = setupAdmin(database, {
      name: 'Ana Pérez',
      username: 'ana',
      password: 'secreto123',
      confirmPassword: 'secreto123'
    })

    expect(admin.role).toBe('admin')
    expect(admin.permissions).toContain('usuarios')
    expect(isInitialized(database)).toBe(true)

    expectAppError(
      () =>
        setupAdmin(database, {
          name: 'Otro',
          username: 'otro',
          password: 'secreto123',
          confirmPassword: 'secreto123'
        }),
      'SETUP_ALREADY_COMPLETED'
    )
  })

  it('autentica con contraseña correcta y rechaza credenciales inválidas', () => {
    setupAdmin(database, {
      name: 'Ana Pérez',
      username: 'ana',
      password: 'secreto123',
      confirmPassword: 'secreto123'
    })

    const user = authenticate(database, 'ANA', 'secreto123')
    expect(user.username).toBe('ana')

    expectAppError(
      () => authenticate(database, 'ana', 'incorrecta'),
      'INVALID_CREDENTIALS'
    )
    expectAppError(
      () => authenticate(database, 'desconocido', 'secreto123'),
      'INVALID_CREDENTIALS'
    )
  })

  it('rechaza el acceso de un usuario desactivado', () => {
    const now = new Date().toISOString()

    database
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'vendedor', 0, ?, ?)`
      )
      .run('Vendedor', 'vendedor', hashPassword('secreto123'), now, now)

    expectAppError(
      () => authenticate(database, 'vendedor', 'secreto123'),
      'USER_DISABLED'
    )
  })

  it('cambia la contraseña y deja de aceptar la anterior', () => {
    const admin = setupAdmin(database, {
      name: 'Ana Pérez',
      username: 'ana',
      password: 'secreto123',
      confirmPassword: 'secreto123'
    })

    expectAppError(
      () => changePassword(database, admin.id, 'incorrecta', 'nuevaClave123'),
      'INVALID_CREDENTIALS'
    )

    changePassword(database, admin.id, 'secreto123', 'nuevaClave123')

    expectAppError(
      () => authenticate(database, 'ana', 'secreto123'),
      'INVALID_CREDENTIALS'
    )
    expect(authenticate(database, 'ana', 'nuevaClave123').id).toBe(admin.id)
    expect(getAuthUser(database, admin.id)?.permissions).toContain('configuracion')
  })
})
