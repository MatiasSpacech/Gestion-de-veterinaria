import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import type { CreateAppointmentInput } from '@shared/schemas'
import { createDatabase } from '@main/db/connection'
import {
  chargeAppointment,
  createAppointment,
  createGroomer,
  createService,
  getAppointment,
  getAppointmentSummary,
  listAppointments,
  listGroomers,
  listServices,
  setAppointmentStatus,
  setGroomerActive,
  setServiceActive,
  updateAppointment,
  updateGroomer,
  updateService
} from './grooming'

function localDate(): string {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

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

describe('peluquería', () => {
  let database: Database.Database
  let tempDirectory: string
  let clientId: number
  let petId: number
  let groomerId: number
  let bathServiceId: number
  let cutServiceId: number

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-grooming-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
    const now = new Date().toISOString()
    database
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, ?, ?)`
      )
      .run('Usuario de prueba', 'admin', 'hash', now, now)

    clientId = Number(
      database
        .prepare(
          `INSERT INTO clients (name, phone, active, created_at, updated_at)
           VALUES (?, ?, 1, ?, ?)`
        )
        .run('Ana Pérez', '5491123456789', now, now).lastInsertRowid
    )
    petId = Number(
      database
        .prepare(
          `INSERT INTO pets (client_id, name, species, sex, active, created_at, updated_at)
           VALUES (?, ?, 'Perro', 'hembra', 1, ?, ?)`
        )
        .run(clientId, 'Luna', now, now).lastInsertRowid
    )

    groomerId = createGroomer(database, {
      name: 'Carla Gómez',
      phone: '5491176543210',
      color: '#1971c2'
    }).id
    bathServiceId = createService(database, {
      name: 'Baño completo',
      category: 'peluqueria',
      priceCents: 100000,
      durationMinutes: 45
    }).id
    cutServiceId = createService(database, {
      name: 'Corte premium',
      category: 'peluqueria',
      priceCents: 200000,
      durationMinutes: 60
    }).id
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  function appointmentInput(
    overrides: Partial<CreateAppointmentInput> = {}
  ): CreateAppointmentInput {
    return {
      clientId,
      petId,
      groomerId,
      date: localDate(),
      startMinutes: 9 * 60,
      serviceIds: [bathServiceId, cutServiceId],
      notes: null,
      ...overrides
    }
  }

  it('gestiona servicios y peluqueros', () => {
    expect(listServices(database, { includeInactive: true })).toHaveLength(7)
    expect(listGroomers(database, { includeInactive: false })).toContainEqual(
      expect.objectContaining({ name: 'Carla Gómez', active: true })
    )

    expectAppError(
      () =>
        createService(database, {
          name: 'baño completo',
          category: 'peluqueria',
          priceCents: 1000,
          durationMinutes: 20
        }),
      'CONFLICT'
    )

    const updatedService = updateService(database, {
      id: cutServiceId,
      name: 'Corte higiénico',
      category: 'peluqueria',
      priceCents: 250000,
      durationMinutes: 50
    })
    expect(updatedService).toMatchObject({
      name: 'Corte higiénico',
      priceCents: 250000,
      durationMinutes: 50
    })

    const updatedGroomer = updateGroomer(database, {
      id: groomerId,
      name: 'Carla Gómez Ruiz',
      phone: null,
      color: '#7048e8'
    })
    expect(updatedGroomer).toMatchObject({
      name: 'Carla Gómez Ruiz',
      phone: null,
      color: '#7048e8'
    })

    setServiceActive(database, { id: cutServiceId, active: false })
    expectAppError(
      () => createAppointment(database, appointmentInput()),
      'CONFLICT'
    )
    setServiceActive(database, { id: cutServiceId, active: true })

    setGroomerActive(database, { id: groomerId, active: false })
    expectAppError(
      () => createAppointment(database, appointmentInput()),
      'CONFLICT'
    )
  })

  it('agenda turnos, calcula totales y evita solapamientos', () => {
    const appointment = createAppointment(database, appointmentInput())

    expect(appointment).toMatchObject({
      clientName: 'Ana Pérez',
      clientPhone: '5491123456789',
      petName: 'Luna',
      groomerName: 'Carla Gómez',
      status: 'pendiente',
      startMinutes: 540,
      endMinutes: 645,
      durationMinutes: 105,
      totalCents: 300000
    })
    expect(appointment.services).toHaveLength(2)

    const list = listAppointments(database, {
      dateFrom: localDate(),
      dateTo: localDate(),
      groomerId: null,
      status: 'all'
    })
    expect(list).toHaveLength(1)

    expectAppError(
      () =>
        createAppointment(
          database,
          appointmentInput({ startMinutes: 10 * 60, serviceIds: [bathServiceId] })
        ),
      'CONFLICT'
    )

    const later = createAppointment(
      database,
      appointmentInput({ startMinutes: 13 * 60, serviceIds: [bathServiceId] })
    )
    expect(later.status).toBe('pendiente')

    const updated = updateAppointment(database, {
      id: appointment.id,
      clientId,
      petId,
      groomerId,
      date: localDate(),
      startMinutes: 11 * 60,
      serviceIds: [bathServiceId],
      notes: 'Cambio de horario'
    })
    expect(updated).toMatchObject({
      startMinutes: 660,
      endMinutes: 705,
      durationMinutes: 45,
      totalCents: 100000,
      notes: 'Cambio de horario'
    })
  })

  it('valida transiciones de estado y cobra el turno con una venta', () => {
    const appointment = createAppointment(database, appointmentInput())

    expectAppError(
      () =>
        setAppointmentStatus(database, {
          id: appointment.id,
          status: 'completado'
        }),
      'CONFLICT'
    )
    expectAppError(
      () =>
        chargeAppointment(
          database,
          { id: appointment.id, paymentMethod: 'efectivo' },
          1
        ),
      'CONFLICT'
    )

    setAppointmentStatus(database, {
      id: appointment.id,
      status: 'confirmado'
    })
    setAppointmentStatus(database, {
      id: appointment.id,
      status: 'en_proceso'
    })
    const completed = setAppointmentStatus(database, {
      id: appointment.id,
      status: 'completado'
    })
    expect(completed.status).toBe('completado')

    const result = chargeAppointment(
      database,
      { id: appointment.id, paymentMethod: 'tarjeta' },
      1
    )

    expect(result.sale).toMatchObject({
      number: 'V-000001',
      subtotalCents: 300000,
      totalCents: 300000,
      paymentMethod: 'tarjeta',
      itemCount: 2
    })
    expect(result.sale.items.map((item) => item.serviceId)).toEqual([
      bathServiceId,
      cutServiceId
    ])
    expect(result.appointment).toMatchObject({
      saleId: result.sale.id,
      saleNumber: 'V-000001',
      saleStatus: 'completada'
    })
    expect(getAppointment(database, appointment.id).saleId).toBe(result.sale.id)

    expectAppError(
      () =>
        chargeAppointment(
          database,
          { id: appointment.id, paymentMethod: 'efectivo' },
          1
        ),
      'CONFLICT'
    )

    const summary = getAppointmentSummary(database)
    expect(summary.todayCount).toBe(1)
    expect(summary.activeCount).toBe(0)
  })
})
