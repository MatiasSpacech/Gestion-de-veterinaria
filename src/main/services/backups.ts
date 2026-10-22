import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type Database from 'better-sqlite3'
import type { BackupRecord } from '@shared/types'
import { logActivity } from './activity'
import { getSetting, getSettings, setSetting } from './settings'

const BACKUP_PREFIX = 'vetgestion-'
const BACKUP_EXTENSION = '.db'

function timestampForFile(date = new Date()): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-')
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function backupWasMadeToday(lastBackupAt: string): boolean {
  if (lastBackupAt === '') {
    return false
  }

  const lastBackup = new Date(lastBackupAt)

  if (Number.isNaN(lastBackup.getTime())) {
    return false
  }

  return localDateKey(lastBackup) === localDateKey(new Date())
}

export function resolveBackupFolder(
  db: Database.Database,
  defaultFolder: string
): string {
  const configured = (getSetting(db, 'backup.folder', '') ?? '').trim()
  return resolve(configured.length > 0 ? configured : defaultFolder)
}

export async function listBackups(folder: string): Promise<BackupRecord[]> {
  await mkdir(folder, { recursive: true })
  const entries = await readdir(folder, { withFileTypes: true })
  const records = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.startsWith(BACKUP_PREFIX) &&
          entry.name.endsWith(BACKUP_EXTENSION)
      )
      .map(async (entry) => {
        const filePath = join(folder, entry.name)
        const info = await stat(filePath)

        return {
          fileName: entry.name,
          filePath,
          sizeBytes: info.size,
          createdAt: info.mtime.toISOString()
        }
      })
  )

  return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function pruneBackups(folder: string, retention: number): Promise<void> {
  const backups = await listBackups(folder)

  for (const backup of backups.slice(retention)) {
    await rm(backup.filePath, { force: true })
  }
}

export async function createBackup(
  db: Database.Database,
  folder: string,
  userId: number | null
): Promise<BackupRecord> {
  await mkdir(folder, { recursive: true })
  const fileName = `${BACKUP_PREFIX}${timestampForFile()}${BACKUP_EXTENSION}`
  const filePath = join(folder, fileName)

  await db.backup(filePath)

  const info = await stat(filePath)
  const now = new Date().toISOString()
  setSetting(db, 'backup.last_run', now)
  await pruneBackups(folder, getSettings(db).backupRetention)
  logActivity(db, {
    userId,
    action: 'backup.create',
    entityType: 'backup',
    details: { fileName }
  })

  return {
    fileName,
    filePath,
    sizeBytes: info.size,
    createdAt: info.mtime.toISOString()
  }
}

export async function runAutomaticBackup(
  db: Database.Database,
  defaultFolder: string
): Promise<BackupRecord | null> {
  const settings = getSettings(db)

  if (!settings.backupEnabled) {
    return null
  }

  if (backupWasMadeToday(settings.lastBackupAt)) {
    return null
  }

  const folder = resolveBackupFolder(db, defaultFolder)
  return createBackup(db, folder, null)
}
