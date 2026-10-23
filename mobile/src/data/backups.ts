import { Directory, File, Paths } from 'expo-file-system'
import { backupDatabaseSync, openDatabaseSync } from 'expo-sqlite'
import { runMigrations } from '@desktop/db/migrations'
import { seedDatabase } from '@desktop/db/seed'
import { logActivity } from '@desktop/services/activity'
import { getSetting, getSettings, setSetting } from '@desktop/services/settings'
import { AppError } from '@shared/errors'

import {
  backupFileName,
  backupWasMadeToday,
  isBackupFileName,
  selectBackupsToPrune,
  type BackupFileInfo
} from './backup-format'
import { getMobileDatabase, getMobileSqlite } from './db'

const BACKUP_FOLDER = 'backups'

export interface MobileBackup extends BackupFileInfo {
  uri: string
}

function toPlainPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri
}

function assertBackupIsRestorable(fileName: string): void {
  const directory = getBackupsDirectory()
  let backupDatabase: ReturnType<typeof openDatabaseSync> | null = null

  try {
    backupDatabase = openDatabaseSync(
      fileName,
      { useNewConnection: true },
      toPlainPath(directory.uri)
    )
    backupDatabase.execSync('PRAGMA query_only = ON')

    const integrity = backupDatabase.getFirstSync<{
      integrity_check: string
    }>('PRAGMA integrity_check')

    if (integrity?.integrity_check !== 'ok') {
      throw new AppError(
        'VALIDATION_ERROR',
        'El backup está dañado y no se puede restaurar'
      )
    }

    const users = backupDatabase.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM users'
    )

    if (!users || Number(users.count) < 1) {
      throw new AppError(
        'VALIDATION_ERROR',
        'El backup no contiene usuarios y no se puede restaurar'
      )
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      'VALIDATION_ERROR',
      'El backup está dañado o no es compatible'
    )
  } finally {
    backupDatabase?.closeSync()
  }
}

function copyBackupIntoLiveDatabase(fileName: string): void {
  const directory = getBackupsDirectory()
  const backupDatabase = openDatabaseSync(
    fileName,
    { useNewConnection: true },
    toPlainPath(directory.uri)
  )

  try {
    backupDatabase.execSync('PRAGMA query_only = ON')
    backupDatabase.execSync('PRAGMA busy_timeout = 5000')
    backupDatabaseSync({
      sourceDatabase: backupDatabase,
      destDatabase: getMobileSqlite()
    })
  } finally {
    backupDatabase.closeSync()
  }

  const db = getMobileDatabase()
  runMigrations(db)
  seedDatabase(db)
}

function tryRestoreSafetyBackup(safety: MobileBackup): boolean {
  try {
    copyBackupIntoLiveDatabase(safety.fileName)
    return true
  } catch {
    return false
  }
}

export function getBackupsDirectory(): Directory {
  const directory = new Directory(Paths.document, BACKUP_FOLDER)

  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true })
  }

  return directory
}

export function listBackups(): MobileBackup[] {
  const directory = getBackupsDirectory()

  const backups = directory
    .list()
    .filter((entry): entry is File => entry instanceof File)
    .filter((entry) => isBackupFileName(entry.name))
    .map((entry) => {
      const info = entry.info()

      return {
        fileName: entry.name,
        uri: entry.uri,
        sizeBytes: info.size ?? 0,
        createdAt: new Date(info.modificationTime ?? Date.now()).toISOString()
      }
    })

  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function pruneBackups(retention: number): void {
  const backups = listBackups()

  for (const backup of selectBackupsToPrune(backups, retention)) {
    const file = new File(backup.uri)

    if (file.exists) {
      file.delete()
    }
  }
}

export function createBackup(userId: number | null = null): MobileBackup {
  const db = getMobileDatabase()
  const directory = getBackupsDirectory()
  const fileName = backupFileName()
  const destination = new File(directory, fileName)

  if (destination.exists) {
    destination.delete()
  }

  const destinationDb = openDatabaseSync(
    fileName,
    undefined,
    toPlainPath(directory.uri)
  )

  try {
    backupDatabaseSync({
      sourceDatabase: getMobileSqlite(),
      destDatabase: destinationDb
    })
  } finally {
    destinationDb.closeSync()
  }

  const info = destination.info()
  const now = new Date().toISOString()

  setSetting(db, 'backup.last_run', now)
  pruneBackups(getSettings(db).backupRetention)

  logActivity(db, {
    userId,
    action: 'backup.create',
    entityType: 'backup',
    details: { fileName }
  })

  return {
    fileName,
    uri: destination.uri,
    sizeBytes: info.size ?? 0,
    createdAt: new Date(info.modificationTime ?? Date.now()).toISOString()
  }
}

export function deleteBackup(fileName: string): void {
  if (!isBackupFileName(fileName)) {
    throw new AppError('VALIDATION_ERROR', 'El archivo indicado no es un backup')
  }

  const file = new File(getBackupsDirectory(), fileName)

  if (!file.exists) {
    throw new AppError('NOT_FOUND', 'El backup ya no existe')
  }

  file.delete()

  logActivity(getMobileDatabase(), {
    userId: null,
    action: 'backup.delete',
    entityType: 'backup',
    details: { fileName }
  })
}

export async function restoreBackup(fileName: string): Promise<void> {
  if (!isBackupFileName(fileName)) {
    throw new AppError('VALIDATION_ERROR', 'El archivo indicado no es un backup')
  }

  const source = new File(getBackupsDirectory(), fileName)

  if (!source.exists) {
    throw new AppError('NOT_FOUND', 'El backup ya no existe')
  }

  assertBackupIsRestorable(fileName)

  const safety = createBackup(null)

  try {
    await Promise.resolve()
    copyBackupIntoLiveDatabase(fileName)
  } catch (error) {
    const safetyRestored = tryRestoreSafetyBackup(safety)

    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      'INTERNAL_ERROR',
      safetyRestored
        ? 'No se pudo restaurar el backup. Se conservó la base anterior.'
        : 'No se pudo restaurar el backup ni recuperar la base anterior. Usá el backup de seguridad más reciente.'
    )
  }

  logActivity(getMobileDatabase(), {
    userId: null,
    action: 'backup.restore',
    entityType: 'backup',
    details: { fileName, safetyBackup: safety.fileName }
  })
}

export function runAutomaticBackup(userId: number | null = null): MobileBackup | null {
  const db = getMobileDatabase()
  const settings = getSettings(db)

  if (!settings.backupEnabled) {
    return null
  }

  if (backupWasMadeToday(settings.lastBackupAt)) {
    return null
  }

  return createBackup(userId)
}

export function getBackupStatus(): {
  enabled: boolean
  retention: number
  lastRunAt: string
  folder: string
} {
  const settings = getSettings(getMobileDatabase())

  return {
    enabled: settings.backupEnabled,
    retention: settings.backupRetention,
    lastRunAt: settings.lastBackupAt,
    folder: getSetting(getMobileDatabase(), 'backup.folder', '') ?? ''
  }
}
