import { logActivity } from '@desktop/services/activity'
import type Database from 'better-sqlite3'

import { getMobileDatabase } from '../db'
import { getSessionUser } from './session'

export interface ActivityEntry {
  action: string
  entityType?: string | null
  entityId?: number | null
  details?: unknown
}

export function recordActivity(
  entry: ActivityEntry,
  db: Database.Database = getMobileDatabase()
): void {
  const user = getSessionUser()

  logActivity(db, {
    userId: user?.id ?? null,
    action: entry.action,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    details: entry.details
  })
}
