import type Database from 'better-sqlite3'
import { createDatabase } from './connection'

let database: Database.Database | null = null

export function initDatabase(filePath: string): Database.Database {
  if (database) {
    database.close()
  }

  database = createDatabase(filePath)
  return database
}

export function getDb(): Database.Database {
  if (!database) {
    throw new Error('La base de datos todavía no fue inicializada')
  }

  return database
}

export function closeDatabase(): void {
  if (database?.open) {
    database.close()
  }

  database = null
}
