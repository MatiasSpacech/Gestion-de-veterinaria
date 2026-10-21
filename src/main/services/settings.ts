import type Database from 'better-sqlite3'

export function getSetting(
  db: Database.Database,
  key: string,
  fallback: string | null = null
): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  return row?.value ?? fallback
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, new Date().toISOString())
}

export function getBusinessName(db: Database.Database): string {
  return getSetting(db, 'business.name', 'Veterinaria') ?? 'Veterinaria'
}
