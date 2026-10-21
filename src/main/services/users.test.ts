import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import { createDatabase } from '@main/db/connection'
import { setupAdmin } from './auth'
import { createUser, listUsers, resetUserPassword, updateUser } from './users'

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

describe('usuarios', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-users-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
    setupAdmin(database, {
      name: 'Ana Pérez',
      username: 'ana',
      password: 'secreto123',
      confirmPassword: 'secreto123'
    })
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('crea usuarios y evita nombres de usuario duplicados', () => {
    const seller = createUser(database, {
      name: 'Carlos Gómez',
      username: 'carlos',
      password: 'secreto123',
      role: 'vendedor'
    })

    expect(seller.role).toBe('vendedor')
    expect(listUsers(database)).toHaveLength(2)

    expectAppError(
      () =>
        createUser(database, {
          name: 'Otra persona',
          username: 'CARLOS',
          password: 'secreto123',
          role: 'peluquero'
        }),
      'CONFLICT'
    )
  })

  it('protege al último administrador activo', () => {
    const admin = listUsers(database).find((user) => user.role === 'admin')

    if (!admin) {
      throw new Error('No se encontró el administrador de prueba')
    }

    expectAppError(
      () =>
        updateUser(database, {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          role: 'vendedor',
          active: true
        }),
      'LAST_ADMIN'
    )
  })

  it('actualiza datos y restablece contraseñas', () => {
    const seller = createUser(database, {
      name: 'Carlos Gómez',
      username: 'carlos',
      password: 'secreto123',
      role: 'vendedor'
    })

    const updated = updateUser(database, {
      id: seller.id,
      name: 'Carlos Pérez',
      username: 'carlos.perez',
      role: 'peluquero',
      active: false
    })

    expect(updated.name).toBe('Carlos Pérez')
    expect(updated.username).toBe('carlos.perez')
    expect(updated.role).toBe('peluquero')
    expect(updated.active).toBe(false)

    resetUserPassword(database, {
      id: seller.id,
      newPassword: 'otraClave123',
      confirmPassword: 'otraClave123'
    })

    expect(() => updateUser(database, { ...updated, id: 9999 })).toThrow()
  })
})
