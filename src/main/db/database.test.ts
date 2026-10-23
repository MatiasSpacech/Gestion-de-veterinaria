import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import BetterSqlite3 from 'better-sqlite3'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getPermissionsForRole } from '@main/services/auth'
import { createDatabase } from './connection'
import { MIGRATIONS, runMigrations } from './migrations'

describe('base de datos', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-db-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('aplica las migraciones y crea las tablas principales', () => {
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name)

    expect(tables).toEqual(
      expect.arrayContaining([
        'schema_migrations',
        'users',
        'role_permissions',
        'settings',
        'clients',
        'pets',
        'medical_records',
        'products',
        'product_batches',
        'stock_movements',
        'sales',
        'sale_items',
        'appointments',
        'appointment_services',
        'activity_log'
      ])
    )
  })

  it('registra la versión de la migración aplicada', () => {
    const migrations = database
      .prepare('SELECT version, name FROM schema_migrations ORDER BY version')
      .all()

    expect(migrations).toEqual([
      { version: 1, name: 'initial_schema' },
      { version: 2, name: 'optional_appointment_groomer' }
    ])
  })

  it('migra turnos existentes y permite guardarlos sin peluquero', () => {
    const legacyPath = join(tempDirectory, 'legacy.db')
    const legacy = new BetterSqlite3(legacyPath)

    legacy.pragma('foreign_keys = ON')

    const initial = MIGRATIONS.find((migration) => migration.version === 1)

    if (!initial) {
      throw new Error('No se encontró la migración inicial')
    }

    legacy.exec(initial.sql)
    legacy.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `)
    legacy
      .prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
      .run(1, 'initial_schema')

    const groomerId = Number(
      legacy
        .prepare('INSERT INTO groomers (name, color) VALUES (?, ?)')
        .run('Carla Gómez', '#1971c2').lastInsertRowid
    )
    const clientId = Number(
      legacy
        .prepare('INSERT INTO clients (name) VALUES (?)')
        .run('Ana Pérez').lastInsertRowid
    )
    const petId = Number(
      legacy
        .prepare(
          "INSERT INTO pets (client_id, name, species) VALUES (?, ?, 'Perro')"
        )
        .run(clientId, 'Luna').lastInsertRowid
    )
    const appointmentId = Number(
      legacy
        .prepare(
          `INSERT INTO appointments
            (client_id, pet_id, groomer_id, date, start_minutes, duration_minutes)
           VALUES (?, ?, ?, '2026-10-22', 540, 45)`
        )
        .run(clientId, petId, groomerId).lastInsertRowid
    )

    legacy
      .prepare(
        `INSERT INTO appointment_services
          (appointment_id, name, price_cents, duration_minutes)
         VALUES (?, 'Baño', 1000, 45)`
      )
      .run(appointmentId)
    legacy.close()

    const upgraded = new BetterSqlite3(legacyPath)

    try {
      upgraded.pragma('foreign_keys = ON')
      runMigrations(upgraded)

      const groomerColumn = (
        upgraded.prepare('PRAGMA table_info(appointments)').all() as Array<{
          name: string
          notnull: number
        }>
      ).find((column) => column.name === 'groomer_id')

      expect(groomerColumn?.notnull).toBe(0)
      expect(
        upgraded
          .prepare('SELECT id, groomer_id FROM appointments WHERE id = ?')
          .get(appointmentId)
      ).toEqual({ id: appointmentId, groomer_id: groomerId })
      expect(
        (
          upgraded
            .prepare('SELECT COUNT(*) AS count FROM appointment_services')
            .get() as { count: number }
        ).count
      ).toBe(1)

      const unassignedId = Number(
        upgraded
          .prepare(
            `INSERT INTO appointments
              (client_id, pet_id, groomer_id, date, start_minutes, duration_minutes)
             VALUES (?, ?, NULL, '2026-10-22', 600, 30)`
          )
          .run(clientId, petId).lastInsertRowid
      )

      expect(
        upgraded
          .prepare('SELECT groomer_id FROM appointments WHERE id = ?')
          .get(unassignedId)
      ).toEqual({ groomer_id: null })

      upgraded.prepare('DELETE FROM groomers WHERE id = ?').run(groomerId)

      expect(
        upgraded
          .prepare('SELECT groomer_id FROM appointments WHERE id = ?')
          .get(appointmentId)
      ).toEqual({ groomer_id: null })
    } finally {
      upgraded.close()
    }
  })

  it('carga la configuración, categorías, servicios y permisos iniciales', () => {
    const settingsCount = database
      .prepare('SELECT COUNT(*) AS count FROM settings')
      .get() as { count: number }
    const categoriesCount = database
      .prepare('SELECT COUNT(*) AS count FROM product_categories')
      .get() as { count: number }
    const servicesCount = database
      .prepare('SELECT COUNT(*) AS count FROM services')
      .get() as { count: number }
    const permissionsCount = database
      .prepare('SELECT COUNT(*) AS count FROM role_permissions')
      .get() as { count: number }

    expect(settingsCount.count).toBeGreaterThan(0)
    expect(categoriesCount.count).toBe(5)
    expect(servicesCount.count).toBe(5)
    expect(permissionsCount.count).toBe(27)
  })

  it('otorga todos los permisos al administrador y limita al vendedor', () => {
    expect(getPermissionsForRole(database, 'admin')).toHaveLength(9)
    expect(getPermissionsForRole(database, 'vendedor')).toContain('ventas')
    expect(getPermissionsForRole(database, 'vendedor')).not.toContain('configuracion')
    expect(getPermissionsForRole(database, 'peluquero')).toContain('peluqueria')
    expect(getPermissionsForRole(database, 'peluquero')).not.toContain('ventas')
  })

  it('mantiene las claves foráneas activas', () => {
    expect(() =>
      database
        .prepare('INSERT INTO pets (client_id, name) VALUES (?, ?)')
        .run(9999, 'Mascota inexistente')
    ).toThrow()
  })

  it('evita códigos SKU duplicados sin distinguir mayúsculas', () => {
    database
      .prepare('INSERT INTO products (name, sku, price_cents) VALUES (?, ?, ?)')
      .run('Producto uno', 'SKU-001', 1000)

    expect(() =>
      database
        .prepare('INSERT INTO products (name, sku, price_cents) VALUES (?, ?, ?)')
        .run('Producto dos', 'sku-001', 1200)
    ).toThrow()
  })
})
