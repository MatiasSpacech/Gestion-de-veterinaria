export const BACKUP_PREFIX = 'vetgestion-'
export const BACKUP_EXTENSION = '.db'

export interface BackupFileInfo {
  fileName: string
  createdAt: string
  sizeBytes: number
}

/**
 * Mismo formato de nombre que usa la app de escritorio:
 * `vetgestion-2026-10-22T11-30-00-000Z.db`.
 */
export function backupFileName(date: Date = new Date()): string {
  const timestamp = date
    .toISOString()
    .replaceAll(':', '-')
    .replaceAll('.', '-')

  return `${BACKUP_PREFIX}${timestamp}${BACKUP_EXTENSION}`
}

export function isBackupFileName(fileName: string): boolean {
  return fileName.startsWith(BACKUP_PREFIX) && fileName.endsWith(BACKUP_EXTENSION)
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function backupWasMadeToday(lastBackupAt: string, now: Date = new Date()): boolean {
  if (lastBackupAt === '') {
    return false
  }

  const lastBackup = new Date(lastBackupAt)

  if (Number.isNaN(lastBackup.getTime())) {
    return false
  }

  return localDateKey(lastBackup) === localDateKey(now)
}

/**
 * Backups que hay que borrar para respetar la retención, del más nuevo al más viejo.
 */
export function selectBackupsToPrune<T extends BackupFileInfo>(
  backups: T[],
  retention: number
): T[] {
  if (retention <= 0) {
    return []
  }

  return backups.slice(retention)
}
