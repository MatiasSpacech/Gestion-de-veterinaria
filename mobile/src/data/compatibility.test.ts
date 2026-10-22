import { describe, expect, it } from 'vitest'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { MIGRATIONS, runMigrations } from '@desktop/db/migrations'
import { seedDatabase } from '@desktop/db/seed'
import { createClient, listClients } from '@desktop/services/clients'
import { hashPassword, verifyPassword } from '@desktop/services/auth'
import { getPermissionsForRole } from '@desktop/services/auth'

import { createMigratedTestDatabase, createTestDatabase } from './testing/database'

/**
 * Comprueba que la base y los servicios del escritorio funcionan igual sobre el
 * adaptador móvil y que una base creada por el escritorio se puede leer desde el
 * móvil sin conversiones.
 */
describe('compatibilidad con el escritorio', () => {
  it('aplica el mismo esquema y version que el escritorio', () => {
    const mobile = createMigratedTestDatabase()

    const mobileVersions = (
      mobile
        .prepare('SELECT version, name FROM schema_migrations ORDER BY version')
        .all() as Array<{ version: number; name: string }>
    ).map((row) => row.version)

    expect(mobileVersions).toEqual(MIGRATIONS.map((migration) => migration.version))

    const desktop = new Database(':memory:')
    runMigrations(desktop)

    const desktopVersions = (
      desktop
        .prepare('SELECT version FROM schema_migrations ORDER BY version')
        .all() as Array<{ version: number }>
    ).map((row) => row.version)

    expect(mobileVersions).toEqual(desktopVersions)
  })

  it('crea las mismas tablas en el móvil que en el escritorio', () => {
    const mobile = createMigratedTestDatabase()
    const desktop = new Database(':memory:')
    runMigrations(desktop)

    const tableNames = (db: Database.Database) =>
      (
        db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
          )
          .all() as Array<{ name: string }>
      ).map((row) => row.name)

    expect(tableNames(mobile)).toEqual(tableNames(desktop))
  })

  it('carga los mismos datos iniciales que el escritorio', () => {
    const mobile = createMigratedTestDatabase()
    const desktop = new Database(':memory:')
    runMigrations(desktop)
    seedDatabase(desktop)

    const settings = (db: Database.Database) =>
      db.prepare('SELECT key, value FROM settings ORDER BY key').all()

    expect(settings(mobile)).toEqual(settings(desktop))

    const categories = (db: Database.Database) =>
      db.prepare('SELECT name FROM product_categories ORDER BY name').all()

    expect(categories(mobile)).toEqual(categories(desktop))

    const services = (db: Database.Database) =>
      db.prepare('SELECT name, category, duration_minutes FROM services ORDER BY name').all()

    expect(services(mobile)).toEqual(services(desktop))
  })

  it('abre una base creada por el escritorio sin convertir datos', () => {
    const filePath = join(
      tmpdir(),
      `vetgestion-compat-${Date.now()}.db`
    )

    try {
      const desktop = new Database(filePath)
      runMigrations(desktop)
      seedDatabase(desktop)

      const client = createClient(desktop, {
        name: 'Dueño de prueba',
        phone: '11 5555 0000',
        email: 'prueba@vetgestion.local',
        address: 'Calle 123',
        docNumber: '20-12345678-9',
        notes: ''
      })

      desktop.close()

      const mobile = createTestDatabase(filePath)
      const migrated = listClients(mobile, {
        search: 'Dueño',
        includeInactive: true
      })

      expect(migrated).toHaveLength(1)
      expect(migrated[0].id).toBe(client.id)
      expect(migrated[0].name).toBe('Dueño de prueba')
      expect(migrated[0].phone).toBe('11 5555 0000')

      ;(mobile as unknown as { close: () => void }).close()
    } finally {
      rmSync(filePath, { force: true })
    }
  })

  it('usa los mismos permisos por rol que el escritorio', () => {
    const mobile = createMigratedTestDatabase()
    const desktop = new Database(':memory:')
    runMigrations(desktop)
    seedDatabase(desktop)

    for (const role of ['admin', 'vendedor', 'peluquero'] as const) {
      expect(getPermissionsForRole(mobile, role)).toEqual(
        getPermissionsForRole(desktop, role)
      )
    }
  })

  it('verifica contraseñas con los mismos hashes que el escritorio', () => {
    const hash = hashPassword('clave-segura')

    expect(verifyPassword('clave-segura', hash)).toBe(true)
    expect(verifyPassword('otra-clave', hash)).toBe(false)
    expect(hash.startsWith('scrypt$')).toBe(true)
  })
})
