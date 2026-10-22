import { Directory, File, Paths } from 'expo-file-system'
import { backupDatabaseSync, openDatabaseSync } from 'expo-sqlite'
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
import {
  closeMobileDatabase,
  getMobileDatabase,
  getMobileSqlite
} from './db'

const BACKUP_FOLDER = 'backups'

export interface MobileBackup extends BackupFileInfo {
  uri: string
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`
}

function toPlainPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri
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

  const db = getMobileDatabase()

  // Backup de seguridad del estado actual antes de reemplazar la base.
  createBackup(null)

  const databasePath = getMobileSqlite().databasePath
  const target = new File(toFileUri(databasePath))

  closeMobileDatabase()

  await source.copy(target, { overwrite: true })

  for (const suffix of ['-wal', '-shm']) {
    const sidecar = new File(toFileUri(`${databasePath}${suffix}`))

    if (sidecar.exists) {
      sidecar.delete()
    }
  }

  getMobileDatabase()

  logActivity(db, {
    userId: null,
    action: 'backup.restore',
    entityType: 'backup',
    details: { fileName }
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
