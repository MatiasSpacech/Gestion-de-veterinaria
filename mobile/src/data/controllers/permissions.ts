import type Database from 'better-sqlite3'
import { hasPermission } from '@desktop/services/auth'
import { AppError } from '@shared/errors'
import { MODULE_LABELS, type PermissionModule } from '@shared/roles'

import { getMobileDatabase } from '../db'
import { getSessionUser } from './session'

export function canAccess(
  module: PermissionModule,
  db: Database.Database = getMobileDatabase()
): boolean {
  const user = getSessionUser()

  if (!user) {
    return false
  }

  return hasPermission(db, user.role, module)
}

export function requirePermission(
  module: PermissionModule,
  db: Database.Database = getMobileDatabase()
): void {
  if (!canAccess(module, db)) {
    throw new AppError(
      'FORBIDDEN',
      `No tenés permiso para ${MODULE_LABELS[module].toLowerCase()}`
    )
  }
}
