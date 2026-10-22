import type Database from 'better-sqlite3'
import { createClient, getClientDetail, listClients, updateClient } from '@desktop/services/clients'
import { listMedicalRecords, listPets } from '@desktop/services/pets'
import {
  createClientSchema,
  listClientsSchema,
  listMedicalRecordsSchema,
  listPetsSchema,
  updateClientSchema,
  type CreateClientInput,
  type ListClientsInput,
  type ListMedicalRecordsInput,
  type ListPetsInput,
  type UpdateClientInput
} from '@shared/schemas'
import type { ClientDetail, ClientRecord, MedicalRecord, PetRecord } from '@shared/types'

import { recordActivity } from '../../data/controllers/audit'
import { requirePermission } from '../../data/controllers/permissions'
import { getSessionUser } from '../../data/controllers/session'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'

export function listClientsDirectory(
  input: Partial<ListClientsInput> = {},
  db: Database.Database = getMobileDatabase()
): ClientRecord[] {
  return listClients(
    db,
    parseInput(listClientsSchema, {
      search: '',
      includeInactive: false,
      ...input
    })
  )
}

export function getClient(
  id: number,
  db: Database.Database = getMobileDatabase()
): ClientDetail {
  requirePermission('clientes', db)

  return getClientDetail(db, id)
}

export function listClientPets(
  clientId: number,
  db: Database.Database = getMobileDatabase()
): PetRecord[] {
  return listPets(
    db,
    parseInput(listPetsSchema, { clientId, search: '', includeInactive: false })
  )
}

export function listPetRecords(
  input: Partial<ListPetsInput>,
  db: Database.Database = getMobileDatabase()
): PetRecord[] {
  return listPets(
    db,
    parseInput(listPetsSchema, {
      search: '',
      clientId: null,
      includeInactive: false,
      ...input
    })
  )
}

export function listPetHistory(
  input: Partial<ListMedicalRecordsInput>,
  db: Database.Database = getMobileDatabase()
): MedicalRecord[] {
  if (!input.petId) {
    return []
  }

  return listMedicalRecords(
    db,
    parseInput(listMedicalRecordsSchema, { petId: input.petId, type: null })
  )
}

export function createClientRecord(
  input: CreateClientInput,
  db: Database.Database = getMobileDatabase()
): ClientRecord {
  requirePermission('clientes', db)

  const parsed = parseInput(createClientSchema, input)
  const client = createClient(db, parsed)

  recordActivity(
    {
      action: 'cliente.creado',
      entityType: 'client',
      entityId: client.id
    },
    db
  )

  return client
}

export function updateClientRecord(
  input: UpdateClientInput,
  db: Database.Database = getMobileDatabase()
): ClientRecord {
  requirePermission('clientes', db)

  const parsed = parseInput(updateClientSchema, input)
  const client = updateClient(db, parsed)

  recordActivity(
    {
      action: 'cliente.actualizado',
      entityType: 'client',
      entityId: client.id
    },
    db
  )

  return client
}

export function getCurrentUserName(): string {
  return getSessionUser()?.name ?? ''
}
