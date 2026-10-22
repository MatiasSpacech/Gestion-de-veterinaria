import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'

vi.mock('../db', () => ({
  getMobileDatabase: () => {
    throw new Error('La base real no se usa en los tests')
  }
}))

import { createMigratedTestDatabase } from '../testing/database'
import { recordActivity } from './audit'
import { canAccess, requirePermission } from './permissions'
import {
  createFirstAdmin,
  getSessionUser,
  isDatabaseInitialized,
  setSessionUser,
  signIn,
  signOut
} from './session'

const adminInput = {
  name: 'Administrador Local',
  username: 'admin',
  password: 'claveSegura123',
  confirmPassword: 'claveSegura123'
}

describe('controladores de sesión', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createMigratedTestDatabase()
    signOut()
  })

  it('detecta que la base todavía no tiene usuarios', () => {
    expect(isDatabaseInitialized(db)).toBe(false)
  })

  it('crea el primer administrador y abre sesión', () => {
    const user = createFirstAdmin(adminInput, db)

    expect(user.username).toBe('admin')
    expect(user.role).toBe('admin')
    expect(user.permissions).toContain('ventas')
    expect(isDatabaseInitialized(db)).toBe(true)
    expect(getSessionUser()?.id).toBe(user.id)
  })

  it('rechaza credenciales incorrectas', () => {
    createFirstAdmin(adminInput, db)

    expect(() =>
      signIn({ username: 'admin', password: 'otraClave' }, db)
    ).toThrowError(AppError)

    try {
      signIn({ username: 'admin', password: 'otraClave' }, db)
    } catch (error) {
      expect((error as AppError).code).toBe('INVALID_CREDENTIALS')
    }
  })

  it('inicia sesión con credenciales válidas y la cierra', () => {
    createFirstAdmin(adminInput, db)

    const user = signIn({ username: 'admin', password: 'claveSegura123' }, db)

    expect(user.username).toBe('admin')
    expect(getSessionUser()).not.toBeNull()

    signOut()

    expect(getSessionUser()).toBeNull()
  })

  it('no permite el setup dos veces', () => {
    createFirstAdmin(adminInput, db)

    try {
      createFirstAdmin({ ...adminInput, username: 'otro' }, db)
      throw new Error('Debía fallar')
    } catch (error) {
      expect((error as AppError).code).toBe('SETUP_ALREADY_COMPLETED')
    }
  })
})

describe('controladores de permisos', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createMigratedTestDatabase()
    signOut()
  })

  it('niega el acceso cuando no hay sesión', () => {
    expect(canAccess('ventas', db)).toBe(false)
    expect(() => requirePermission('ventas', db)).toThrowError(AppError)
  })

  it('permite los módulos del rol administrador', () => {
    createFirstAdmin(adminInput, db)

    expect(canAccess('ventas', db)).toBe(true)
    expect(canAccess('usuarios', db)).toBe(true)
    expect(() => requirePermission('configuracion', db)).not.toThrow()
  })

  it('respeta los permisos de un vendedor', () => {
    createFirstAdmin(adminInput, db)

    const admin = getSessionUser()
    expect(admin).not.toBeNull()

    db.prepare(
      "UPDATE users SET role = 'vendedor' WHERE id = ?"
    ).run(admin?.id)

    setSessionUser({ ...admin!, role: 'vendedor' })

    expect(canAccess('ventas', db)).toBe(true)
    expect(canAccess('usuarios', db)).toBe(false)

    try {
      requirePermission('usuarios', db)
      throw new Error('debía fallar')
    } catch (error) {
      expect((error as AppError).code).toBe('FORBIDDEN')
    }
  })
})

describe('controladores de auditoría', () => {
  it('registra la actividad del usuario de la sesión', () => {
    const db = createMigratedTestDatabase()
    const user = createFirstAdmin(adminInput, db)

    recordActivity(
      { action: 'venta.creada', entityType: 'sale', entityId: 7 },
      db
    )

    const row = db
      .prepare('SELECT user_id, action, entity_type, entity_id FROM activity_log')
      .get() as {
      user_id: number | null
      action: string
      entity_type: string | null
      entity_id: number | null
    }

    expect(row.user_id).toBe(user.id)
    expect(row.action).toBe('venta.creada')
    expect(row.entity_type).toBe('sale')
    expect(row.entity_id).toBe(7)
  })
})
