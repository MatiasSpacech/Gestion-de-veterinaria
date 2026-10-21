import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { UpdateSettingsInput } from '@shared/schemas'
import { createDatabase } from '@main/db/connection'
import { logActivity, listActivity } from './activity'
import { getSettings, updateSettings } from './settings'
import { listRolePermissions, updateRolePermissions } from './users'

function settingsInput(): UpdateSettingsInput {
  return {
    name: 'Veterinaria San Patricio',
    address: 'Av. Siempre Viva 123',
    phone: '11 5555-1234',
    email: 'contacto@vet.com',
    currency: 'ARS',
    openDays: ['1', '2', '3', '4', '5', '6'],
    openTime: '08:30',
    closeTime: '20:00',
    slotMinutes: 45,
    expiryAlertDays: 45,
    vaccineAlertDays: 20,
    whatsappTemplate: 'Hola {cliente}, turno de {mascota} el {fecha}.',
    backupEnabled: true,
    backupFolder: '',
    backupRetention: 15
  }
}

describe('configuración y auditoría', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-settings-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('devuelve valores por defecto y guarda la configuración completa', () => {
    const defaults = getSettings(database)
    expect(defaults.name).toBe('Veterinaria')
    expect(defaults.currency).toBe('ARS')
    expect(defaults.openDays).toEqual(['1', '2', '3', '4', '5', '6'])

    const updated = updateSettings(database, settingsInput())

    expect(updated.name).toBe('Veterinaria San Patricio')
    expect(updated.email).toBe('contacto@vet.com')
    expect(updated.openDays).toHaveLength(6)
    expect(updated.openTime).toBe('08:30')
    expect(updated.closeTime).toBe('20:00')
    expect(updated.slotMinutes).toBe(45)
    expect(updated.expiryAlertDays).toBe(45)
    expect(updated.vaccineAlertDays).toBe(20)
    expect(updated.whatsappTemplate).toContain('{mascota}')
    expect(updated.backupRetention).toBe(15)
  })

  it('actualiza permisos de roles no administradores', () => {
    const before = listRolePermissions(database)
    expect(before.find((item) => item.role === 'vendedor')?.permissions).toContain(
      'ventas'
    )

    const updated = updateRolePermissions(database, {
      role: 'vendedor',
      permissions: ['dashboard', 'clientes', 'reportes']
    })

    expect(updated.find((item) => item.role === 'vendedor')?.permissions).toEqual([
      'dashboard',
      'clientes',
      'reportes'
    ])
    expect(updated.find((item) => item.role === 'admin')?.permissions).toContain(
      'configuracion'
    )
  })

  it('registra y busca eventos de auditoría', () => {
    logActivity(database, {
      userId: null,
      action: 'settings.update',
      entityType: 'settings',
      details: { name: 'Veterinaria San Patricio' }
    })
    logActivity(database, {
      userId: null,
      action: 'backup.create',
      entityType: 'backup',
      details: { fileName: 'backup.db' }
    })

    const all = listActivity(database, { limit: 10, search: null })
    const filtered = listActivity(database, {
      limit: 10,
      search: 'backup'
    })

    expect(all).toHaveLength(2)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.action).toBe('backup.create')
  })
})
