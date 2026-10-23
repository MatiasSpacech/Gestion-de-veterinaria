import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'

vi.mock('../data/db', () => ({
  getMobileDatabase: () => {
    throw new Error('La base real no se usa en los tests')
  }
}))

import { DEFAULT_ROLE_PERMISSIONS } from '@shared/roles'
import { setupAdmin } from '@desktop/services/auth'
import { setSessionUser } from '../data/controllers/session'
import { createMigratedTestDatabase } from '../data/testing/database'
import {
  editUser,
  listUserDirectory,
  registerUser
} from './users/users-service'
import {
  getAppointmentRemindersEnabled,
  getBusinessSettings,
  saveBusinessSettings,
  setAppointmentRemindersEnabled
} from './settings/settings-service'
import { getReportData } from './reports/reports-service'

function signInAsAdmin(db: Database.Database): void {
  const admin = setupAdmin(db, {
    name: 'Administrador',
    username: 'admin',
    password: 'claveSegura123',
    confirmPassword: 'claveSegura123'
  })

  setSessionUser({
    id: admin.id,
    name: admin.name,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions
  })
}

describe('administración desde la app móvil', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createMigratedTestDatabase()
    signInAsAdmin(db)
  })

  it('crea usuarios y los lista', () => {
    const user = registerUser(
      {
        name: 'Vendedor Uno',
        username: 'vendedor1',
        password: 'claveSegura123',
        role: 'vendedor'
      },
      db
    )

    const users = listUserDirectory(db)

    expect(users).toHaveLength(2)
    expect(users.map((entry) => entry.id)).toContain(user.id)
  })

  it('edita el rol y el estado de un usuario', () => {
    const user = registerUser(
      {
        name: 'Peluquero Uno',
        username: 'peluquero1',
        password: 'claveSegura123',
        role: 'peluquero'
      },
      db
    )

    const updated = editUser(
      {
        id: user.id,
        name: user.name,
        username: user.username,
        role: 'peluquero',
        active: false
      },
      db
    )

    expect(updated.active).toBe(false)
    expect(updated.role).toBe('peluquero')
  })

  it('bloquea la administración de usuarios a un vendedor', () => {
    const user = registerUser(
      {
        name: 'Vendedor Dos',
        username: 'vendedor2',
        password: 'claveSegura123',
        role: 'vendedor'
      },
      db
    )

    setSessionUser({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      permissions: DEFAULT_ROLE_PERMISSIONS.vendedor
    })

    expect(() => listUserDirectory(db)).toThrowError()
  })

  it('guarda los datos del negocio y el horario', () => {
    const current = getBusinessSettings(db)
    const saved = saveBusinessSettings(
      {
        name: 'Veterinaria Nueva',
        address: current.address,
        phone: current.phone,
        email: current.email,
        currency: 'ARS',
        openDays: ['1', '2', '3', '4', '5'],
        openTime: current.openTime,
        closeTime: current.closeTime,
        slotMinutes: 45,
        expiryAlertDays: current.expiryAlertDays,
        vaccineAlertDays: current.vaccineAlertDays,
        whatsappTemplate: current.whatsappTemplate,
        backupEnabled: current.backupEnabled,
        backupFolder: current.backupFolder,
        backupRetention: current.backupRetention
      },
      db
    )

    expect(saved.name).toBe('Veterinaria Nueva')
    expect(saved.openDays).toEqual(['1', '2', '3', '4', '5'])
    expect(saved.slotMinutes).toBe(45)
  })

  it('persiste la preferencia de recordatorios', () => {
    expect(getAppointmentRemindersEnabled(db)).toBe(true)

    setAppointmentRemindersEnabled(false, db)

    expect(getAppointmentRemindersEnabled(db)).toBe(false)
  })

  it('obtiene el resumen de reportes del período', () => {
    const report = getReportData(
      { dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      db
    )

    expect(report.dateFrom).toBe('2026-10-01')
    expect(report.dateTo).toBe('2026-10-31')
    expect(report.salesCount).toBe(0)
    expect(report.netSalesCents).toBe(0)
  })
})
