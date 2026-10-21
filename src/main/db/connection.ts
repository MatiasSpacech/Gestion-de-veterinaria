import Database from 'better-sqlite3'
import { runMigrations } from './migrations'
import { seedDatabase } from './seed'

export function createDatabase(filePath: string): Database.Database {
  const db = new Database(filePath)

  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  if (filePath !== ':memory:') {
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
  }

  runMigrations(db)
  seedDatabase(db)

  return db
}
