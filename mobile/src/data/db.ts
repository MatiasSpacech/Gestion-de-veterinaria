import type Database from 'better-sqlite3'
import {
  openDatabaseSync,
  type SQLiteBindValue,
  type SQLiteDatabase
} from 'expo-sqlite'

import { runMigrations } from '@desktop/db/migrations'
import { seedDatabase } from '@desktop/db/seed'

const DATABASE_NAME = 'veterinaria.db'

class ExpoSqliteAdapter {
  private transactionDepth = 0

  constructor(private readonly sqlite: SQLiteDatabase) {}

  prepare(source: string) {
    return {
      get: (...params: SQLiteBindValue[]) =>
        this.sqlite.getFirstSync<Record<string, unknown>>(source, params) ?? undefined,
      all: (...params: SQLiteBindValue[]) =>
        this.sqlite.getAllSync<Record<string, unknown>>(source, params),
      run: (...params: SQLiteBindValue[]) => {
        const result = this.sqlite.runSync(source, params)

        return {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowId
        }
      }
    }
  }

  exec(source: string): void {
    this.sqlite.execSync(source)
  }

  transaction<Args extends unknown[], Result>(
    callback: (...args: Args) => Result
  ): (...args: Args) => Result {
    return (...args: Args) => this.runInTransaction(() => callback(...args))
  }

  private runInTransaction<Result>(callback: () => Result): Result {
    const isOuter = this.transactionDepth === 0
    const savepoint = `mobile_savepoint_${this.transactionDepth}`

    if (isOuter) {
      this.sqlite.execSync('BEGIN IMMEDIATE')
    } else {
      this.sqlite.execSync(`SAVEPOINT ${savepoint}`)
    }

    this.transactionDepth += 1

    try {
      const result = callback()
      this.transactionDepth -= 1

      if (isOuter) {
        this.sqlite.execSync('COMMIT')
      } else {
        this.sqlite.execSync(`RELEASE ${savepoint}`)
      }

      return result
    } catch (error) {
      this.transactionDepth -= 1

      if (isOuter) {
        this.sqlite.execSync('ROLLBACK')
      } else {
        this.sqlite.execSync(`ROLLBACK TO ${savepoint}`)
        this.sqlite.execSync(`RELEASE ${savepoint}`)
      }

      throw error
    }
  }
}

let database: Database.Database | null = null
let sqlite: SQLiteDatabase | null = null

export function getMobileDatabase(): Database.Database {
  if (database) {
    return database
  }

  const opened = openDatabaseSync(DATABASE_NAME)
  opened.execSync('PRAGMA foreign_keys = ON')
  opened.execSync('PRAGMA busy_timeout = 5000')
  opened.execSync('PRAGMA journal_mode = WAL')
  opened.execSync('PRAGMA synchronous = NORMAL')

  const adapter = new ExpoSqliteAdapter(opened) as unknown as Database.Database

  runMigrations(adapter)
  seedDatabase(adapter)

  database = adapter
  sqlite = opened

  return adapter
}

/**
 * Conexión nativa de SQLite, necesaria para el backup online de `expo-sqlite`.
 */
export function getMobileSqlite(): SQLiteDatabase {
  if (!sqlite) {
    getMobileDatabase()
  }

  return sqlite as SQLiteDatabase
}

/**
 * Ruta absoluta del archivo de base de datos, para poder reemplazarlo al restaurar.
 */
export function getDatabasePath(): string {
  return getMobileSqlite().databasePath
}

export function closeMobileDatabase(): void {
  if (sqlite) {
    sqlite.closeSync()
  }

  sqlite = null
  database = null
}
