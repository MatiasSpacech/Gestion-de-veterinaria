import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getPermissionsForRole } from '@main/services/auth'
import { createDatabase } from './connection'

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

    expect(migrations).toEqual([{ version: 1, name: 'initial_schema' }])
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
