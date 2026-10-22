import { DatabaseSync } from 'node:sqlite'

import { runMigrations } from '@desktop/db/migrations'
import { seedDatabase } from '@desktop/db/seed'
import type Database from 'better-sqlite3'

interface StatementLike {
  get: (...params: unknown[]) => unknown
  all: (...params: unknown[]) => unknown[]
  run: (...params: unknown[]) => { changes: number; lastInsertRowid: number }
}

interface TestDatabase {
  prepare: (source: string) => StatementLike
  exec: (source: string) => void
  transaction: <Args extends unknown[], Result>(
    callback: (...args: Args) => Result
  ) => (...args: Args) => Result
  close: () => void
}

/**
 * Adaptador de pruebas con la misma interfaz que usa el backend del escritorio
 * (`prepare().get/all/run`, `exec()` y `transaction()`) sobre `node:sqlite`,
 * que viene incluido en Node 24 y no necesita dependencias extra.
 */
export function createTestDatabase(): Database.Database {
  const sqlite = new DatabaseSync(':memory:')

  let depth = 0

  const database: TestDatabase = {
    prepare: (source: string) => {
      const statement = sqlite.prepare(source)

      return {
        get: (...params: unknown[]) => statement.get(...(params as never[])),
        all: (...params: unknown[]) => statement.all(...(params as never[])),
        run: (...params: unknown[]) => {
          const result = statement.run(...(params as never[]))

          return {
            changes: Number(result.changes),
            lastInsertRowid: Number(result.lastInsertRowid)
          }
        }
      }
    },
    exec: (source: string) => {
      sqlite.exec(source)
    },
    transaction:
      <Args extends unknown[], Result>(callback: (...args: Args) => Result) =>
      (...args: Args): Result => {
        const isOuter = depth === 0
        const savepoint = `test_savepoint_${depth}`

        if (isOuter) {
          sqlite.exec('BEGIN IMMEDIATE')
        } else {
          sqlite.exec(`SAVEPOINT ${savepoint}`)
        }

        depth += 1

        try {
          const result = callback(...args)
          depth -= 1

          if (isOuter) {
            sqlite.exec('COMMIT')
          } else {
            sqlite.exec(`RELEASE ${savepoint}`)
          }

          return result
        } catch (error) {
          depth -= 1

          if (isOuter) {
            sqlite.exec('ROLLBACK')
          } else {
            sqlite.exec(`ROLLBACK TO ${savepoint}`)
            sqlite.exec(`RELEASE ${savepoint}`)
          }

          throw error
        }
      },
    close: () => {
      sqlite.close()
    }
  }

  return database as unknown as Database.Database
}

export function createMigratedTestDatabase(): Database.Database {
  const database = createTestDatabase()

  runMigrations(database)
  seedDatabase(database)

  return database
}
