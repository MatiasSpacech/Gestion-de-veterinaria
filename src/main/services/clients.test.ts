import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import type { CreateClientInput } from '@shared/schemas'
import { createDatabase } from '@main/db/connection'
import {
  createClient,
  getClientDetail,
  listClients,
  setClientActive,
  updateClient
} from './clients'

const baseClient: CreateClientInput = {
  name: 'María López',
  docNumber: '30111222',
  phone: '11 5555-1234',
  email: 'maria@example.com',
  address: 'Av. Siempre Viva 123',
  notes: null
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

describe('clientes', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-clients-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('crea, busca y actualiza clientes', () => {
    const created = createClient(database, baseClient)

    expect(created.name).toBe('María López')
    expect(created.petCount).toBe(0)
    expect(listClients(database, { search: 'maría', includeInactive: false })).toHaveLength(1)
    expect(listClients(database, { search: '5555', includeInactive: false })).toHaveLength(1)
    expect(listClients(database, { search: '30111222', includeInactive: false })).toHaveLength(1)

    const updated = updateClient(database, {
      id: created.id,
      ...baseClient,
      name: 'María López de Pérez',
      phone: null
    })

    expect(updated.name).toBe('María López de Pérez')
    expect(updated.phone).toBeNull()

    const detail = getClientDetail(database, created.id)
    expect(detail.pets).toEqual([])
  })

  it('desactiva clientes sin eliminarlos y los puede incluir en la búsqueda', () => {
    const created = createClient(database, baseClient)
    const inactive = setClientActive(database, { id: created.id, active: false })

    expect(inactive.active).toBe(false)
    expect(listClients(database, { search: '', includeInactive: false })).toHaveLength(0)
    expect(listClients(database, { search: '', includeInactive: true })).toHaveLength(1)
  })

  it('informa cuando el cliente no existe', () => {
    expectAppError(() => getClientDetail(database, 9999), 'NOT_FOUND')
    expectAppError(() => setClientActive(database, { id: 9999, active: false }), 'NOT_FOUND')
  })
})
