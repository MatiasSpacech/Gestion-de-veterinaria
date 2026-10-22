import type Database from 'better-sqlite3'
import {
  chargeAppointment,
  createAppointment,
  getAppointmentSummary,
  listAppointments,
  listGroomers,
  listServices,
  setAppointmentStatus
} from '@desktop/services/grooming'
import {
  chargeAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsSchema,
  listGroomersSchema,
  listServicesSchema,
  setAppointmentStatusSchema,
  type ChargeAppointmentInput,
  type CreateAppointmentInput,
  type ListAppointmentsInput,
  type SetAppointmentStatusInput
} from '@shared/schemas'
import type {
  AppointmentRecord,
  AppointmentSummary,
  GroomerRecord,
  ServiceRecord
} from '@shared/types'

import { recordActivity } from '../../data/controllers/audit'
import { requirePermission } from '../../data/controllers/permissions'
import { getSessionUser } from '../../data/controllers/session'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'
import { localDateKey } from '../dashboard/dashboard-service'

export function listDayAppointments(
  date: string = localDateKey(),
  input: Partial<ListAppointmentsInput> = {},
  db: Database.Database = getMobileDatabase()
): AppointmentRecord[] {
  return listAppointments(
    db,
    parseInput(listAppointmentsSchema, {
      dateFrom: date,
      dateTo: date,
      groomerId: null,
      status: 'all',
      ...input
    })
  )
}

export function getAppointmentsOverview(
  db: Database.Database = getMobileDatabase()
): AppointmentSummary {
  return getAppointmentSummary(db)
}

export function listGroomingServices(
  db: Database.Database = getMobileDatabase()
): ServiceRecord[] {
  return listServices(db, parseInput(listServicesSchema, { includeInactive: false }))
}

export function listActiveGroomers(
  db: Database.Database = getMobileDatabase()
): GroomerRecord[] {
  return listGroomers(db, parseInput(listGroomersSchema, { includeInactive: false }))
}

export function createTurn(
  input: CreateAppointmentInput,
  db: Database.Database = getMobileDatabase()
): AppointmentRecord {
  requirePermission('peluqueria', db)

  const parsed = parseInput(createAppointmentSchema, input)
  const appointment = createAppointment(db, parsed)

  recordActivity(
    {
      action: 'turno.creado',
      entityType: 'appointment',
      entityId: appointment.id,
      details: { date: parsed.date, startMinutes: parsed.startMinutes }
    },
    db
  )

  return appointment
}

export function changeAppointmentStatus(
  input: SetAppointmentStatusInput,
  db: Database.Database = getMobileDatabase()
): AppointmentRecord {
  requirePermission('peluqueria', db)

  const parsed = parseInput(setAppointmentStatusSchema, input)
  const appointment = setAppointmentStatus(db, parsed)

  recordActivity(
    {
      action: 'turno.estado',
      entityType: 'appointment',
      entityId: parsed.id,
      details: { status: parsed.status }
    },
    db
  )

  return appointment
}

export function chargeTurn(
  input: ChargeAppointmentInput,
  db: Database.Database = getMobileDatabase()
): void {
  requirePermission('peluqueria', db)

  const parsed = parseInput(chargeAppointmentSchema, input)
  const user = getSessionUser()

  chargeAppointment(db, parsed, user?.id ?? 0)

  recordActivity(
    {
      action: 'turno.cobrado',
      entityType: 'appointment',
      entityId: parsed.id,
      details: { paymentMethod: parsed.paymentMethod }
    },
    db
  )
}
