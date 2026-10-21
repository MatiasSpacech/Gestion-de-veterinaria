import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import type {
  CreateMedicalRecordInput,
  CreatePetInput
} from '@shared/schemas'
import { createDatabase } from '@main/db/connection'
import { createClient } from './clients'
import {
  createMedicalRecord,
  createPet,
  getPet,
  getWeightHistory,
  listMedicalRecords,
  listPets,
  listUpcomingVaccines,
  setPetActive,
  updatePet
} from './pets'

const basePet: Omit<CreatePetInput, 'clientId'> = {
  name: 'Firulais',
  species: 'Perro',
  breed: 'Mestizo',
  sex: 'macho',
  birthDate: '2022-04-15',
  color: 'Marrón',
  weightKg: 12.5,
  sterilized: false,
  allergies: 'Ninguna',
  chronicConditions: null,
  notes: null,
  photoFileName: null
}

function dateOffset(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function medicalInput(
  petId: number,
  overrides: Partial<CreateMedicalRecordInput>
): CreateMedicalRecordInput {
  return {
    petId,
    type: 'consulta',
    date: dateOffset(0),
    title: 'Consulta general',
    description: null,
    diagnosis: null,
    treatment: null,
    vetName: null,
    weightKg: null,
    nextDueDate: null,
    ...overrides
  }
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

describe('mascotas e historial clínico', () => {
  let database: Database.Database
  let tempDirectory: string
  let clientId: number
  let petId: number

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-pets-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
    clientId = createClient(database, {
      name: 'María López',
      docNumber: null,
      phone: null,
      email: null,
      address: null,
      notes: null
    }).id
    petId = createPet(database, { ...basePet, clientId }, null).id
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('crea mascotas con peso inicial y las encuentra por distintos campos', () => {
    const pet = getPet(database, petId)
    const weights = getWeightHistory(database, petId)

    expect(pet.clientName).toBe('María López')
    expect(pet.weightKg).toBe(12.5)
    expect(pet.active).toBe(true)
    expect(weights).toHaveLength(1)
    expect(weights[0]?.title).toBe('Peso inicial')
    expect(listPets(database, { search: 'firu', clientId: null, includeInactive: false })).toHaveLength(1)
    expect(listPets(database, { search: 'maría', clientId: null, includeInactive: false })).toHaveLength(1)
    expect(listPets(database, { search: '', clientId, includeInactive: false })).toHaveLength(1)
  })

  it('actualiza la mascota, la desactiva y respeta los filtros', () => {
    const updated = updatePet(database, {
      id: petId,
      clientId,
      ...basePet,
      name: 'Firulais II',
      weightKg: 13.1,
      sterilized: true
    })

    expect(updated.name).toBe('Firulais II')
    expect(updated.sterilized).toBe(true)
    expect(updated.weightKg).toBe(13.1)

    setPetActive(database, { id: petId, active: false })
    expect(listPets(database, { search: '', clientId: null, includeInactive: false })).toHaveLength(0)
    expect(listPets(database, { search: '', clientId: null, includeInactive: true })).toHaveLength(1)
  })

  it('registra historial, actualiza el peso más reciente y filtra por tipo', () => {
    createMedicalRecord(
      database,
      medicalInput(petId, {
        type: 'peso',
        date: dateOffset(-10),
        title: 'Control de peso',
        weightKg: 11.9
      }),
      null
    )
    createMedicalRecord(
      database,
      medicalInput(petId, {
        type: 'consulta',
        title: 'Revisión general',
        description: 'Sin novedades',
        vetName: 'Dra. Gómez',
        weightKg: 13.4
      }),
      null
    )

    const allRecords = listMedicalRecords(database, { petId, type: null })
    const consultations = listMedicalRecords(database, { petId, type: 'consulta' })
    const weights = getWeightHistory(database, petId)

    expect(allRecords).toHaveLength(3)
    expect(consultations).toHaveLength(1)
    expect(consultations[0]?.vetName).toBe('Dra. Gómez')
    expect(weights).toHaveLength(3)
    expect(weights.at(-1)?.weightKg).toBe(13.4)
    expect(getPet(database, petId).weightKg).toBe(13.4)
  })

  it('genera recordatorios con la última dosis de cada vacuna', () => {
    createMedicalRecord(
      database,
      medicalInput(petId, {
        type: 'vacuna',
        date: dateOffset(-60),
        title: 'Rabia',
        nextDueDate: dateOffset(-30)
      }),
      null
    )
    createMedicalRecord(
      database,
      medicalInput(petId, {
        type: 'vacuna',
        date: dateOffset(-10),
        title: 'Rabia',
        nextDueDate: dateOffset(15)
      }),
      null
    )
    createMedicalRecord(
      database,
      medicalInput(petId, {
        type: 'vacuna',
        date: dateOffset(-5),
        title: 'Moquillo',
        nextDueDate: dateOffset(50)
      }),
      null
    )

    const secondPetId = createPet(
      database,
      { ...basePet, clientId, name: 'Michi', species: 'Gato' },
      null
    ).id
    createMedicalRecord(
      database,
      medicalInput(secondPetId, {
        type: 'vacuna',
        date: dateOffset(-20),
        title: 'Rabia',
        nextDueDate: dateOffset(100)
      }),
      null
    )

    const reminders = listUpcomingVaccines(database, 60)

    expect(reminders).toHaveLength(2)
    expect(reminders.map((reminder) => reminder.title)).toEqual(['Rabia', 'Moquillo'])
    expect(reminders[0]?.petId).toBe(petId)
    expect(reminders[0]?.nextDueDate).toBe(dateOffset(15))
  })

  it('excluye mascotas inactivas de los recordatorios', () => {
    createMedicalRecord(
      database,
      medicalInput(petId, {
        type: 'vacuna',
        title: 'Rabia',
        nextDueDate: dateOffset(10)
      }),
      null
    )
    setPetActive(database, { id: petId, active: false })

    expect(listUpcomingVaccines(database, 30)).toHaveLength(0)
  })

  it('rechaza mascotas asociadas a clientes inexistentes', () => {
    expectAppError(
      () => createPet(database, { ...basePet, clientId: 9999 }, null),
      'NOT_FOUND'
    )
    expectAppError(
      () => createMedicalRecord(database, medicalInput(9999, {}), null),
      'NOT_FOUND'
    )
  })
})
