import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type {
  CreateClientInput,
  ListClientsInput,
  SetActiveInput,
  UpdateClientInput
} from '@shared/schemas'
import type { ClientDetail, ClientRecord } from '@shared/types'
import { listPetsByClient } from './pets'

interface ClientRow {
  id: number
  name: string
  doc_number: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  active: number
  created_at: string
  updated_at: string
  pet_count: number
}

function toClientRecord(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    name: row.name,
    docNumber: row.doc_number,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    active: row.active === 1,
    petCount: row.pet_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

const CLIENT_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM pets p WHERE p.client_id = c.id AND p.active = 1) AS pet_count
  FROM clients c
`

function getClientRow(db: Database.Database, id: number): ClientRow | undefined {
  return db
    .prepare(`${CLIENT_SELECT} WHERE c.id = ?`)
    .get(id) as ClientRow | undefined
}

export function listClients(
  db: Database.Database,
  input: ListClientsInput
): ClientRecord[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (!input.includeInactive) {
    clauses.push('c.active = 1')
  }

  if (input.search) {
    const term = `%${input.search}%`
    clauses.push(
      '(c.name LIKE ? OR c.doc_number LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)'
    )
    params.push(term, term, term, term)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `${CLIENT_SELECT} ${where}
       ORDER BY c.active DESC, c.name COLLATE NOCASE`
    )
    .all(...params) as ClientRow[]

  return rows.map(toClientRecord)
}

export function getClientDetail(db: Database.Database, id: number): ClientDetail {
  const row = getClientRow(db, id)

  if (!row) {
    throw new AppError('NOT_FOUND', 'El cliente no existe')
  }

  return {
    ...toClientRecord(row),
    pets: listPetsByClient(db, id)
  }
}

export function createClient(
  db: Database.Database,
  input: CreateClientInput
): ClientRecord {
  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO clients
        (name, doc_number, phone, email, address, notes, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(
      input.name,
      input.docNumber,
      input.phone,
      input.email,
      input.address,
      input.notes,
      now,
      now
    )

  const created = getClientRow(db, Number(result.lastInsertRowid))

  if (!created) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo crear el cliente')
  }

  return toClientRecord(created)
}

export function updateClient(
  db: Database.Database,
  input: UpdateClientInput
): ClientRecord {
  if (!getClientRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El cliente no existe')
  }

  db.prepare(
    `UPDATE clients
     SET name = ?, doc_number = ?, phone = ?, email = ?, address = ?, notes = ?,
         updated_at = ?
     WHERE id = ?`
  ).run(
    input.name,
    input.docNumber,
    input.phone,
    input.email,
    input.address,
    input.notes,
    new Date().toISOString(),
    input.id
  )

  const updated = getClientRow(db, input.id)

  if (!updated) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo actualizar el cliente')
  }

  return toClientRecord(updated)
}

export function setClientActive(
  db: Database.Database,
  input: SetActiveInput
): ClientRecord {
  if (!getClientRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El cliente no existe')
  }

  db.prepare('UPDATE clients SET active = ?, updated_at = ? WHERE id = ?').run(
    input.active ? 1 : 0,
    new Date().toISOString(),
    input.id
  )

  const updated = getClientRow(db, input.id)

  if (!updated) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo actualizar el cliente')
  }

  return toClientRecord(updated)
}
