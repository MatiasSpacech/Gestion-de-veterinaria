import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type {
  ChargeAppointmentInput,
  CreateAppointmentInput,
  CreateGroomerInput,
  CreateServiceInput,
  ListAppointmentsInput,
  ListGroomersInput,
  ListServicesInput,
  SetAppointmentStatusInput,
  SetActiveInput,
  UpdateAppointmentInput,
  UpdateGroomerInput,
  UpdateServiceInput
} from '@shared/schemas'
import type {
  AppointmentRecord,
  AppointmentServiceRecord,
  AppointmentStatus,
  AppointmentSummary,
  ChargeAppointmentResult,
  GroomerRecord,
  SaleDetail,
  SaleStatus,
  ServiceCategory,
  ServiceRecord
} from '@shared/types'
import { createServiceSale, getSaleDetail } from './sales'

interface ServiceRow {
  id: number
  name: string
  category: ServiceCategory
  price_cents: number
  duration_minutes: number
  active: number
  created_at: string
}

interface GroomerRow {
  id: number
  name: string
  phone: string | null
  color: string
  active: number
  created_at: string
}

interface AppointmentRow {
  id: number
  client_id: number
  client_name: string
  client_phone: string | null
  pet_id: number
  pet_name: string
  groomer_id: number
  groomer_name: string
  groomer_color: string
  date: string
  start_minutes: number
  end_minutes: number
  duration_minutes: number
  total_cents: number
  status: AppointmentStatus
  notes: string | null
  sale_id: number | null
  sale_number: string | null
  sale_status: SaleStatus | null
  created_at: string
  updated_at: string
}

interface AppointmentServiceRow {
  id: number
  appointment_id: number
  service_id: number | null
  name: string
  price_cents: number
  duration_minutes: number
}

interface AvailableServiceRow {
  id: number
  name: string
  price_cents: number
  duration_minutes: number
}

const APPOINTMENT_SELECT = `
  SELECT a.id, a.client_id, c.name AS client_name, c.phone AS client_phone,
    a.pet_id, p.name AS pet_name, a.groomer_id, g.name AS groomer_name,
    g.color AS groomer_color, a.date, a.start_minutes,
    a.start_minutes + a.duration_minutes AS end_minutes, a.duration_minutes,
    a.total_cents, a.status, a.notes, a.sale_id, s.number AS sale_number,
    s.status AS sale_status, a.created_at, a.updated_at
  FROM appointments a
  JOIN clients c ON c.id = a.client_id
  JOIN pets p ON p.id = a.pet_id
  JOIN groomers g ON g.id = a.groomer_id
  LEFT JOIN sales s ON s.id = a.sale_id
`

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pendiente: ['confirmado', 'cancelado', 'no_asistio'],
  confirmado: ['en_proceso', 'cancelado', 'no_asistio'],
  en_proceso: ['completado', 'cancelado'],
  completado: [],
  cancelado: [],
  no_asistio: []
}

function toServiceRecord(row: ServiceRow): ServiceRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes,
    active: row.active === 1,
    createdAt: row.created_at
  }
}

function toGroomerRecord(row: GroomerRow): GroomerRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    color: row.color,
    active: row.active === 1,
    createdAt: row.created_at
  }
}

function toAppointmentServiceRecord(
  row: AppointmentServiceRow
): AppointmentServiceRecord {
  return {
    id: row.id,
    serviceId: row.service_id,
    name: row.name,
    priceCents: row.price_cents,
    durationMinutes: row.duration_minutes
  }
}

function toAppointmentRecord(
  row: AppointmentRow,
  services: AppointmentServiceRecord[]
): AppointmentRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    petId: row.pet_id,
    petName: row.pet_name,
    groomerId: row.groomer_id,
    groomerName: row.groomer_name,
    groomerColor: row.groomer_color,
    date: row.date,
    startMinutes: row.start_minutes,
    endMinutes: row.end_minutes,
    durationMinutes: row.duration_minutes,
    totalCents: row.total_cents,
    status: row.status,
    notes: row.notes,
    saleId: row.sale_id,
    saleNumber: row.sale_number,
    saleStatus: row.sale_status,
    services,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function isUniqueConstraint(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes('UNIQUE constraint failed')
  )
}

function getServiceRow(db: Database.Database, id: number): ServiceRow | undefined {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id) as
    | ServiceRow
    | undefined
}

function getGroomerRow(db: Database.Database, id: number): GroomerRow | undefined {
  return db.prepare('SELECT * FROM groomers WHERE id = ?').get(id) as
    | GroomerRow
    | undefined
}

function getAppointmentRow(
  db: Database.Database,
  id: number
): AppointmentRow | undefined {
  return db
    .prepare(`${APPOINTMENT_SELECT} WHERE a.id = ?`)
    .get(id) as AppointmentRow | undefined
}

function listServicesForAppointments(
  db: Database.Database,
  appointmentIds: number[]
): Map<number, AppointmentServiceRecord[]> {
  const result = new Map<number, AppointmentServiceRecord[]>()

  if (appointmentIds.length === 0) {
    return result
  }

  const placeholders = appointmentIds.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT id, appointment_id, service_id, name, price_cents, duration_minutes
       FROM appointment_services
       WHERE appointment_id IN (${placeholders})
       ORDER BY id`
    )
    .all(...appointmentIds) as AppointmentServiceRow[]

  for (const row of rows) {
    const list = result.get(row.appointment_id) ?? []
    list.push(toAppointmentServiceRecord(row))
    result.set(row.appointment_id, list)
  }

  return result
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function localDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function assertDateRange(dateFrom: string, dateTo: string): void {
  if (dateFrom > dateTo) {
    throw new AppError(
      'VALIDATION_ERROR',
      'La fecha desde no puede ser posterior a la fecha hasta'
    )
  }

  const from = new Date(`${dateFrom}T00:00:00`)
  const to = new Date(`${dateTo}T00:00:00`)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'El rango de fechas no es válido')
  }

  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1

  if (days > 92) {
    throw new AppError(
      'VALIDATION_ERROR',
      'El rango de fechas no puede superar los 92 días'
    )
  }
}

function resolveServices(
  db: Database.Database,
  serviceIds: number[]
): AvailableServiceRow[] {
  const uniqueIds = [...new Set(serviceIds)]

  if (uniqueIds.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Agregá al menos un servicio')
  }

  const placeholders = uniqueIds.map(() => '?').join(', ')
  const rows = db
    .prepare(
      `SELECT id, name, price_cents, duration_minutes
       FROM services
       WHERE id IN (${placeholders}) AND active = 1 AND category = 'peluqueria'`
    )
    .all(...uniqueIds) as AvailableServiceRow[]

  if (rows.length !== uniqueIds.length) {
    throw new AppError(
      'CONFLICT',
      'Uno de los servicios no existe o está inactivo'
    )
  }

  return rows.sort(
    (a, b) => uniqueIds.indexOf(a.id) - uniqueIds.indexOf(b.id)
  )
}

function assertGroomerAvailable(
  db: Database.Database,
  groomerId: number,
  date: string,
  startMinutes: number,
  endMinutes: number,
  ignoreAppointmentId: number | null = null
): void {
  const params: unknown[] = [groomerId, date, endMinutes, startMinutes]
  let ignoreClause = ''

  if (ignoreAppointmentId !== null) {
    ignoreClause = 'AND a.id <> ?'
    params.push(ignoreAppointmentId)
  }

  const conflict = db
    .prepare(
      `SELECT a.id, a.start_minutes, a.duration_minutes
       FROM appointments a
       WHERE a.groomer_id = ? AND a.date = ?
         AND a.status NOT IN ('cancelado', 'no_asistio')
         AND a.start_minutes < ? AND a.start_minutes + a.duration_minutes > ?
         ${ignoreClause}
       LIMIT 1`
    )
    .get(...params) as
    | { id: number; start_minutes: number; duration_minutes: number }
    | undefined

  if (conflict) {
    throw new AppError(
      'CONFLICT',
      `El peluquero ya tiene un turno de ${formatMinutes(
        conflict.start_minutes
      )} a ${formatMinutes(conflict.start_minutes + conflict.duration_minutes)}`
    )
  }
}

function assertClientPetAndGroomer(
  db: Database.Database,
  clientId: number,
  petId: number,
  groomerId: number
): void {
  const client = db
    .prepare('SELECT id, active FROM clients WHERE id = ?')
    .get(clientId) as { id: number; active: number } | undefined

  if (!client) {
    throw new AppError('NOT_FOUND', 'El cliente no existe')
  }

  if (client.active === 0) {
    throw new AppError('CONFLICT', 'El cliente está inactivo')
  }

  const pet = db
    .prepare('SELECT id, client_id, active FROM pets WHERE id = ?')
    .get(petId) as
    | { id: number; client_id: number; active: number }
    | undefined

  if (!pet) {
    throw new AppError('NOT_FOUND', 'La mascota no existe')
  }

  if (pet.active === 0) {
    throw new AppError('CONFLICT', 'La mascota está inactiva')
  }

  if (pet.client_id !== clientId) {
    throw new AppError(
      'CONFLICT',
      'La mascota no pertenece al cliente seleccionado'
    )
  }

  const groomer = getGroomerRow(db, groomerId)

  if (!groomer) {
    throw new AppError('NOT_FOUND', 'El peluquero no existe')
  }

  if (groomer.active === 0) {
    throw new AppError('CONFLICT', 'El peluquero está inactivo')
  }
}

function getAppointmentRecordOrThrow(
  db: Database.Database,
  id: number
): AppointmentRecord {
  const row = getAppointmentRow(db, id)

  if (!row) {
    throw new AppError('NOT_FOUND', 'El turno no existe')
  }

  const services = listServicesForAppointments(db, [id]).get(id) ?? []
  return toAppointmentRecord(row, services)
}

export function listServices(
  db: Database.Database,
  input: ListServicesInput
): ServiceRecord[] {
  const rows = db
    .prepare(
      `SELECT * FROM services
       WHERE (? = 1 OR active = 1)
       ORDER BY active DESC, category, name`
    )
    .all(input.includeInactive ? 1 : 0) as ServiceRow[]

  return rows.map(toServiceRecord)
}

export function createService(
  db: Database.Database,
  input: CreateServiceInput
): ServiceRecord {
  try {
    const result = db
      .prepare(
        `INSERT INTO services
          (name, category, price_cents, duration_minutes, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        input.name,
        input.category,
        input.priceCents,
        input.durationMinutes,
        new Date().toISOString(),
        new Date().toISOString()
      )

    return toServiceRecord(getServiceRow(db, Number(result.lastInsertRowid))!)
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError('CONFLICT', 'Ese servicio ya existe')
    }

    throw new AppError('INTERNAL_ERROR', 'No se pudo crear el servicio')
  }
}

export function updateService(
  db: Database.Database,
  input: UpdateServiceInput
): ServiceRecord {
  if (!getServiceRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El servicio no existe')
  }

  try {
    db.prepare(
      `UPDATE services
       SET name = ?, category = ?, price_cents = ?, duration_minutes = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.name,
      input.category,
      input.priceCents,
      input.durationMinutes,
      new Date().toISOString(),
      input.id
    )
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppError('CONFLICT', 'Ese servicio ya existe')
    }

    throw new AppError('INTERNAL_ERROR', 'No se pudo actualizar el servicio')
  }

  return toServiceRecord(getServiceRow(db, input.id)!)
}

export function setServiceActive(
  db: Database.Database,
  input: SetActiveInput
): ServiceRecord {
  if (!getServiceRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El servicio no existe')
  }

  db.prepare('UPDATE services SET active = ?, updated_at = ? WHERE id = ?').run(
    input.active ? 1 : 0,
    new Date().toISOString(),
    input.id
  )

  return toServiceRecord(getServiceRow(db, input.id)!)
}

export function listGroomers(
  db: Database.Database,
  input: ListGroomersInput
): GroomerRecord[] {
  const rows = db
    .prepare(
      `SELECT * FROM groomers
       WHERE (? = 1 OR active = 1)
       ORDER BY active DESC, name`
    )
    .all(input.includeInactive ? 1 : 0) as GroomerRow[]

  return rows.map(toGroomerRecord)
}

export function createGroomer(
  db: Database.Database,
  input: CreateGroomerInput
): GroomerRecord {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO groomers (name, phone, color, active, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`
    )
    .run(input.name, input.phone, input.color, now, now)

  return toGroomerRecord(getGroomerRow(db, Number(result.lastInsertRowid))!)
}

export function updateGroomer(
  db: Database.Database,
  input: UpdateGroomerInput
): GroomerRecord {
  if (!getGroomerRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El peluquero no existe')
  }

  db.prepare(
    'UPDATE groomers SET name = ?, phone = ?, color = ?, updated_at = ? WHERE id = ?'
  ).run(
    input.name,
    input.phone,
    input.color,
    new Date().toISOString(),
    input.id
  )

  return toGroomerRecord(getGroomerRow(db, input.id)!)
}

export function setGroomerActive(
  db: Database.Database,
  input: SetActiveInput
): GroomerRecord {
  if (!getGroomerRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El peluquero no existe')
  }

  db.prepare('UPDATE groomers SET active = ?, updated_at = ? WHERE id = ?').run(
    input.active ? 1 : 0,
    new Date().toISOString(),
    input.id
  )

  return toGroomerRecord(getGroomerRow(db, input.id)!)
}

export function listAppointments(
  db: Database.Database,
  input: ListAppointmentsInput
): AppointmentRecord[] {
  assertDateRange(input.dateFrom, input.dateTo)

  const clauses = ['a.date >= ?', 'a.date <= ?']
  const params: unknown[] = [input.dateFrom, input.dateTo]

  if (input.groomerId !== null) {
    clauses.push('a.groomer_id = ?')
    params.push(input.groomerId)
  }

  if (input.status !== 'all') {
    clauses.push('a.status = ?')
    params.push(input.status)
  }

  const rows = db
    .prepare(
      `${APPOINTMENT_SELECT}
       WHERE ${clauses.join(' AND ')}
       ORDER BY a.date, a.start_minutes, g.name`
    )
    .all(...params) as AppointmentRow[]

  const services = listServicesForAppointments(
    db,
    rows.map((row) => row.id)
  )

  return rows.map((row) =>
    toAppointmentRecord(row, services.get(row.id) ?? [])
  )
}

export function getAppointment(
  db: Database.Database,
  id: number
): AppointmentRecord {
  return getAppointmentRecordOrThrow(db, id)
}

export function createAppointment(
  db: Database.Database,
  input: CreateAppointmentInput
): AppointmentRecord {
  assertClientPetAndGroomer(db, input.clientId, input.petId, input.groomerId)
  const services = resolveServices(db, input.serviceIds)
  const durationMinutes = services.reduce(
    (total, service) => total + service.duration_minutes,
    0
  )
  const endMinutes = input.startMinutes + durationMinutes

  if (endMinutes > 1440) {
    throw new AppError(
      'CONFLICT',
      'El turno no puede terminar después de las 24:00'
    )
  }

  assertGroomerAvailable(
    db,
    input.groomerId,
    input.date,
    input.startMinutes,
    endMinutes
  )

  const totalCents = services.reduce(
    (total, service) => total + service.price_cents,
    0
  )
  const now = new Date().toISOString()
  let appointmentId = 0

  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO appointments
          (client_id, pet_id, groomer_id, date, start_minutes, duration_minutes,
           status, notes, total_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?)`
      )
      .run(
        input.clientId,
        input.petId,
        input.groomerId,
        input.date,
        input.startMinutes,
        durationMinutes,
        input.notes,
        totalCents,
        now,
        now
      )

    appointmentId = Number(result.lastInsertRowid)
    const insertService = db.prepare(
      `INSERT INTO appointment_services
        (appointment_id, service_id, name, price_cents, duration_minutes)
       VALUES (?, ?, ?, ?, ?)`
    )

    for (const service of services) {
      insertService.run(
        appointmentId,
        service.id,
        service.name,
        service.price_cents,
        service.duration_minutes
      )
    }
  })

  create()

  return getAppointmentRecordOrThrow(db, appointmentId)
}

export function updateAppointment(
  db: Database.Database,
  input: UpdateAppointmentInput
): AppointmentRecord {
  const current = getAppointmentRecordOrThrow(db, input.id)

  if (current.status !== 'pendiente' && current.status !== 'confirmado') {
    throw new AppError(
      'CONFLICT',
      'Solo se pueden editar turnos pendientes o confirmados'
    )
  }

  assertClientPetAndGroomer(db, input.clientId, input.petId, input.groomerId)
  const services = resolveServices(db, input.serviceIds)
  const durationMinutes = services.reduce(
    (total, service) => total + service.duration_minutes,
    0
  )
  const endMinutes = input.startMinutes + durationMinutes

  if (endMinutes > 1440) {
    throw new AppError(
      'CONFLICT',
      'El turno no puede terminar después de las 24:00'
    )
  }

  assertGroomerAvailable(
    db,
    input.groomerId,
    input.date,
    input.startMinutes,
    endMinutes,
    input.id
  )

  const totalCents = services.reduce(
    (total, service) => total + service.price_cents,
    0
  )
  const now = new Date().toISOString()

  const update = db.transaction(() => {
    db.prepare(
      `UPDATE appointments
       SET client_id = ?, pet_id = ?, groomer_id = ?, date = ?, start_minutes = ?,
         duration_minutes = ?, notes = ?, total_cents = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.clientId,
      input.petId,
      input.groomerId,
      input.date,
      input.startMinutes,
      durationMinutes,
      input.notes,
      totalCents,
      now,
      input.id
    )

    db.prepare('DELETE FROM appointment_services WHERE appointment_id = ?').run(
      input.id
    )
    const insertService = db.prepare(
      `INSERT INTO appointment_services
        (appointment_id, service_id, name, price_cents, duration_minutes)
       VALUES (?, ?, ?, ?, ?)`
    )

    for (const service of services) {
      insertService.run(
        input.id,
        service.id,
        service.name,
        service.price_cents,
        service.duration_minutes
      )
    }
  })

  update()

  return getAppointmentRecordOrThrow(db, input.id)
}

export function setAppointmentStatus(
  db: Database.Database,
  input: SetAppointmentStatusInput
): AppointmentRecord {
  const current = getAppointmentRecordOrThrow(db, input.id)

  if (current.status === input.status) {
    return current
  }

  if (!STATUS_TRANSITIONS[current.status].includes(input.status)) {
    throw new AppError(
      'CONFLICT',
      `No se puede pasar un turno de ${current.status} a ${input.status}`
    )
  }

  db.prepare(
    'UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?'
  ).run(input.status, new Date().toISOString(), input.id)

  return getAppointmentRecordOrThrow(db, input.id)
}

export function chargeAppointment(
  db: Database.Database,
  input: ChargeAppointmentInput,
  userId: number
): ChargeAppointmentResult {
  const appointment = getAppointmentRecordOrThrow(db, input.id)

  if (appointment.status !== 'completado') {
    throw new AppError(
      'CONFLICT',
      'Completá el turno antes de registrar el cobro'
    )
  }

  if (appointment.saleId !== null && appointment.saleStatus !== 'anulada') {
    throw new AppError('CONFLICT', 'El turno ya tiene una venta registrada')
  }

  const items = appointment.services
    .filter(
      (service): service is AppointmentServiceRecord & { serviceId: number } =>
        service.serviceId !== null
    )
    .map((service) => ({
      serviceId: service.serviceId,
      name: service.name,
      priceCents: service.priceCents
    }))

  if (items.length === 0) {
    throw new AppError('CONFLICT', 'El turno no tiene servicios para cobrar')
  }

  let sale: SaleDetail | null = null

  const charge = db.transaction(() => {
    sale = createServiceSale(
      db,
      {
        clientId: appointment.clientId,
        petId: appointment.petId,
        paymentMethod: input.paymentMethod,
        notes: `Turno #${appointment.id}`,
        items
      },
      userId
    )

    db.prepare(
      'UPDATE appointments SET sale_id = ?, updated_at = ? WHERE id = ?'
    ).run(sale.id, new Date().toISOString(), appointment.id)
  })

  charge()

  return {
    appointment: getAppointmentRecordOrThrow(db, appointment.id),
    sale: getSaleDetail(db, sale!.id)
  }
}

export function getAppointmentSummary(
  db: Database.Database
): AppointmentSummary {
  const today = localDateString()
  const row = db
    .prepare(
      `SELECT COUNT(*) AS today_count,
        SUM(CASE WHEN status IN ('pendiente', 'confirmado', 'en_proceso')
          THEN 1 ELSE 0 END) AS active_count
       FROM appointments
       WHERE date = ?`
    )
    .get(today) as { today_count: number; active_count: number | null }

  return {
    todayCount: row.today_count,
    activeCount: row.active_count ?? 0
  }
}
