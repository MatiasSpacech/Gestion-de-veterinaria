import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type {
  CreateMedicalRecordInput,
  CreatePetInput,
  ListMedicalRecordsInput,
  ListPetsInput,
  SetActiveInput,
  UpdatePetInput
} from '@shared/schemas'
import type {
  MedicalRecord,
  MedicalRecordType,
  PetRecord,
  PetSex,
  UpcomingVaccine,
  WeightEntry
} from '@shared/types'

interface PetRow {
  id: number
  client_id: number
  client_name: string
  client_active: number
  name: string
  species: string
  breed: string | null
  sex: PetSex
  birth_date: string | null
  color: string | null
  weight_kg: number | null
  sterilized: number
  allergies: string | null
  chronic_conditions: string | null
  notes: string | null
  photo_path: string | null
  active: number
  next_vaccine_due: string | null
  last_record_date: string | null
  created_at: string
  updated_at: string
}

interface MedicalRecordRow {
  id: number
  pet_id: number
  type: MedicalRecordType
  date: string
  title: string
  description: string | null
  diagnosis: string | null
  treatment: string | null
  vet_name: string | null
  weight_kg: number | null
  next_due_date: string | null
  created_by_name: string | null
  created_at: string
}

interface UpcomingVaccineRow {
  pet_id: number
  pet_name: string
  client_id: number
  client_name: string
  title: string
  last_dose_date: string
  next_due_date: string
  days_until: number
}

const PET_SELECT = `
  SELECT p.*,
    c.name AS client_name,
    c.active AS client_active,
    (
      SELECT mr.next_due_date
      FROM medical_records mr
      WHERE mr.pet_id = p.id
        AND mr.type = 'vacuna'
        AND mr.next_due_date IS NOT NULL
      ORDER BY mr.date DESC, mr.id DESC
      LIMIT 1
    ) AS next_vaccine_due,
    (
      SELECT MAX(mr.date)
      FROM medical_records mr
      WHERE mr.pet_id = p.id
    ) AS last_record_date
  FROM pets p
  JOIN clients c ON c.id = p.client_id
`

const MEDICAL_RECORD_SELECT = `
  SELECT mr.*, u.name AS created_by_name
  FROM medical_records mr
  LEFT JOIN users u ON u.id = mr.created_by
`

function toPetRecord(row: PetRow): PetRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientActive: row.client_active === 1,
    name: row.name,
    species: row.species,
    breed: row.breed,
    sex: row.sex,
    birthDate: row.birth_date,
    color: row.color,
    weightKg: row.weight_kg,
    sterilized: row.sterilized === 1,
    allergies: row.allergies,
    chronicConditions: row.chronic_conditions,
    notes: row.notes,
    photoFileName: row.photo_path,
    active: row.active === 1,
    nextVaccineDue: row.next_vaccine_due,
    lastRecordDate: row.last_record_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toMedicalRecord(row: MedicalRecordRow): MedicalRecord {
  return {
    id: row.id,
    petId: row.pet_id,
    type: row.type,
    date: row.date,
    title: row.title,
    description: row.description,
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    vetName: row.vet_name,
    weightKg: row.weight_kg,
    nextDueDate: row.next_due_date,
    createdByName: row.created_by_name,
    createdAt: row.created_at
  }
}

function getPetRow(db: Database.Database, id: number): PetRow | undefined {
  return db.prepare(`${PET_SELECT} WHERE p.id = ?`).get(id) as PetRow | undefined
}

function queryPets(db: Database.Database, input: ListPetsInput): PetRecord[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (!input.includeInactive) {
    clauses.push('p.active = 1')
  }

  if (input.clientId !== null) {
    clauses.push('p.client_id = ?')
    params.push(input.clientId)
  }

  if (input.search) {
    const term = `%${input.search}%`
    clauses.push(
      '(p.name LIKE ? OR p.breed LIKE ? OR p.species LIKE ? OR c.name LIKE ?)'
    )
    params.push(term, term, term, term)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `${PET_SELECT} ${where}
       ORDER BY p.active DESC, p.name COLLATE NOCASE`
    )
    .all(...params) as PetRow[]

  return rows.map(toPetRecord)
}

export function listPets(db: Database.Database, input: ListPetsInput): PetRecord[] {
  return queryPets(db, input)
}

export function listPetsByClient(db: Database.Database, clientId: number): PetRecord[] {
  return queryPets(db, {
    search: '',
    clientId,
    includeInactive: true
  })
}

export function getPet(db: Database.Database, id: number): PetRecord {
  const row = getPetRow(db, id)

  if (!row) {
    throw new AppError('NOT_FOUND', 'La mascota no existe')
  }

  return toPetRecord(row)
}

function assertClientExists(db: Database.Database, clientId: number): void {
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(clientId)

  if (!client) {
    throw new AppError('NOT_FOUND', 'El cliente no existe')
  }
}

function assertClientActive(db: Database.Database, clientId: number): void {
  const client = db
    .prepare('SELECT active FROM clients WHERE id = ?')
    .get(clientId) as { active: number } | undefined

  if (!client) {
    throw new AppError('NOT_FOUND', 'El cliente no existe')
  }

  if (client.active !== 1) {
    throw new AppError('VALIDATION_ERROR', 'El cliente seleccionado está inactivo')
  }
}

const insertInitialWeight = (
  db: Database.Database,
  petId: number,
  weightKg: number,
  createdBy: number | null
): void => {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  db.prepare(
    `INSERT INTO medical_records
      (pet_id, type, date, title, description, weight_kg, created_by, created_at, updated_at)
     VALUES (?, 'peso', ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    petId,
    date,
    'Peso inicial',
    'Registro creado al dar de alta la mascota.',
    weightKg,
    createdBy,
    now.toISOString(),
    now.toISOString()
  )
}

export function createPet(
  db: Database.Database,
  input: CreatePetInput,
  createdBy: number | null
): PetRecord {
  assertClientActive(db, input.clientId)

  const now = new Date().toISOString()
  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO pets
          (client_id, name, species, breed, sex, birth_date, color, weight_kg,
           sterilized, allergies, chronic_conditions, notes, photo_path, active,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        input.clientId,
        input.name,
        input.species,
        input.breed,
        input.sex,
        input.birthDate,
        input.color,
        input.weightKg,
        input.sterilized ? 1 : 0,
        input.allergies,
        input.chronicConditions,
        input.notes,
        input.photoFileName,
        now,
        now
      )

    const petId = Number(result.lastInsertRowid)

    if (input.weightKg !== null) {
      insertInitialWeight(db, petId, input.weightKg, createdBy)
    }

    return petId
  })

  const petId = create()
  return getPet(db, petId)
}

export function updatePet(
  db: Database.Database,
  input: UpdatePetInput
): PetRecord {
  const existing = getPetRow(db, input.id)

  if (!existing) {
    throw new AppError('NOT_FOUND', 'La mascota no existe')
  }

  assertClientExists(db, input.clientId)

  if (input.clientId !== existing.client_id) {
    assertClientActive(db, input.clientId)
  }

  db.prepare(
    `UPDATE pets
     SET client_id = ?, name = ?, species = ?, breed = ?, sex = ?, birth_date = ?,
         color = ?, weight_kg = ?, sterilized = ?, allergies = ?,
         chronic_conditions = ?, notes = ?, photo_path = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.clientId,
    input.name,
    input.species,
    input.breed,
    input.sex,
    input.birthDate,
    input.color,
    input.weightKg,
    input.sterilized ? 1 : 0,
    input.allergies,
    input.chronicConditions,
    input.notes,
    input.photoFileName,
    new Date().toISOString(),
    input.id
  )

  return getPet(db, input.id)
}

export function setPetActive(
  db: Database.Database,
  input: SetActiveInput
): PetRecord {
  if (!getPetRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'La mascota no existe')
  }

  db.prepare('UPDATE pets SET active = ?, updated_at = ? WHERE id = ?').run(
    input.active ? 1 : 0,
    new Date().toISOString(),
    input.id
  )

  return getPet(db, input.id)
}

export function listMedicalRecords(
  db: Database.Database,
  input: ListMedicalRecordsInput
): MedicalRecord[] {
  getPet(db, input.petId)

  const rows = input.type
    ? (db
        .prepare(
          `${MEDICAL_RECORD_SELECT}
           WHERE mr.pet_id = ? AND mr.type = ?
           ORDER BY mr.date DESC, mr.id DESC`
        )
        .all(input.petId, input.type) as MedicalRecordRow[])
    : (db
        .prepare(
          `${MEDICAL_RECORD_SELECT}
           WHERE mr.pet_id = ?
           ORDER BY mr.date DESC, mr.id DESC`
        )
        .all(input.petId) as MedicalRecordRow[])

  return rows.map(toMedicalRecord)
}

export function createMedicalRecord(
  db: Database.Database,
  input: CreateMedicalRecordInput,
  createdBy: number | null
): MedicalRecord {
  getPet(db, input.petId)

  const now = new Date().toISOString()
  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO medical_records
          (pet_id, type, date, title, description, diagnosis, treatment, vet_name,
           weight_kg, next_due_date, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.petId,
        input.type,
        input.date,
        input.title,
        input.description,
        input.diagnosis,
        input.treatment,
        input.vetName,
        input.weightKg,
        input.nextDueDate,
        createdBy,
        now,
        now
      )

    let currentWeight: number | null = null

    if (input.weightKg !== null) {
      const latestWeight = db
        .prepare(
          `SELECT weight_kg FROM medical_records
           WHERE pet_id = ? AND weight_kg IS NOT NULL
           ORDER BY date DESC, id DESC
           LIMIT 1`
        )
        .get(input.petId) as { weight_kg: number } | undefined

      currentWeight = latestWeight?.weight_kg ?? null
    }

    db.prepare(
      `UPDATE pets
       SET weight_kg = COALESCE(?, weight_kg), updated_at = ?
       WHERE id = ?`
    ).run(currentWeight, now, input.petId)

    return Number(result.lastInsertRowid)
  })

  const recordId = create()
  const row = db
    .prepare(`${MEDICAL_RECORD_SELECT} WHERE mr.id = ?`)
    .get(recordId) as MedicalRecordRow | undefined

  if (!row) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo guardar el registro clínico')
  }

  return toMedicalRecord(row)
}

export function getWeightHistory(
  db: Database.Database,
  petId: number
): WeightEntry[] {
  getPet(db, petId)

  const rows = db
    .prepare(
      `SELECT id, date, weight_kg, title
       FROM medical_records
       WHERE pet_id = ? AND weight_kg IS NOT NULL
       ORDER BY date ASC, id ASC`
    )
    .all(petId) as Array<{
    id: number
    date: string
    weight_kg: number
    title: string
  }>

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    title: row.title
  }))
}

export function listUpcomingVaccines(
  db: Database.Database,
  daysAhead: number
): UpcomingVaccine[] {
  const safeDays = Math.min(Math.max(Math.trunc(daysAhead), 1), 365)
  const rows = db
    .prepare(
      `WITH ranked AS (
         SELECT mr.*,
           ROW_NUMBER() OVER (
             PARTITION BY mr.pet_id, lower(mr.title)
             ORDER BY mr.date DESC, mr.id DESC
           ) AS position
         FROM medical_records mr
         WHERE mr.type = 'vacuna' AND mr.next_due_date IS NOT NULL
       )
       SELECT r.pet_id, p.name AS pet_name, c.id AS client_id, c.name AS client_name,
         r.title, r.date AS last_dose_date, r.next_due_date,
         CAST(
           julianday(r.next_due_date) - julianday(date('now', 'localtime'))
           AS INTEGER
         ) AS days_until
       FROM ranked r
       JOIN pets p ON p.id = r.pet_id
       JOIN clients c ON c.id = p.client_id
       WHERE r.position = 1
         AND p.active = 1
         AND c.active = 1
         AND date(r.next_due_date) <= date('now', 'localtime', ?)
       ORDER BY date(r.next_due_date), p.name COLLATE NOCASE`
    )
    .all(`+${safeDays} days`) as UpcomingVaccineRow[]

  return rows.map((row) => ({
    petId: row.pet_id,
    petName: row.pet_name,
    clientId: row.client_id,
    clientName: row.client_name,
    title: row.title,
    lastDoseDate: row.last_dose_date,
    nextDueDate: row.next_due_date,
    daysUntil: row.days_until
  }))
}
