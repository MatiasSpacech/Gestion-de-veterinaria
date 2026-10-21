import type Database from 'better-sqlite3'
import type { ListActivityInput } from '@shared/schemas'
import type { ActivityRecord } from '@shared/types'

interface ActivityRow {
  id: number
  user_id: number | null
  user_name: string | null
  action: string
  entity_type: string | null
  entity_id: number | null
  details: string | null
  created_at: string
}

export function logActivity(
  db: Database.Database,
  input: {
    userId: number | null
    action: string
    entityType?: string | null
    entityId?: number | null
    details?: unknown
  }
): void {
  db.prepare(
    `INSERT INTO activity_log
      (user_id, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.userId,
    input.action,
    input.entityType ?? null,
    input.entityId ?? null,
    input.details === undefined ? null : JSON.stringify(input.details),
    new Date().toISOString()
  )
}

export function listActivity(
  db: Database.Database,
  input: ListActivityInput
): ActivityRecord[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (input.search) {
    const term = `%${input.search}%`
    clauses.push(
      `(a.action LIKE ? OR a.details LIKE ? OR a.entity_type LIKE ?
        OR u.name LIKE ?)`
    )
    params.push(term, term, term, term)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `SELECT a.id, a.user_id, u.name AS user_name, a.action, a.entity_type,
        a.entity_id, a.details, a.created_at
       FROM activity_log a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.id DESC
       LIMIT ?`
    )
    .all(...params, input.limit) as ActivityRow[]

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details,
    createdAt: row.created_at
  }))
}
