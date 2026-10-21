import { copyFile, mkdir, rm, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { AppError } from '@shared/errors'
import { IPC } from '@shared/ipc'
import {
  listActivitySchema,
  restoreBackupSchema,
  updateSettingsSchema,
  type ListActivityInput,
  type RestoreBackupInput,
  type UpdateSettingsInput
} from '@shared/schemas'
import type {
  ActivityRecord,
  BackupRecord,
  BusinessSettings
} from '@shared/types'
import { closeDatabase, getDb, initDatabase } from '@main/db'
import { logActivity, listActivity } from '@main/services/activity'
import {
  createBackup,
  listBackups,
  resolveBackupFolder
} from '@main/services/backups'
import { getSettings, updateSettings } from '@main/services/settings'
import { clearSession } from '@main/session'
import { registerProtectedHandler } from './handle'

function defaultBackupFolder(): string {
  return join(app.getPath('documents'), 'VetGestión', 'Backups')
}

async function ensureBackupFolder(db: ReturnType<typeof getDb>): Promise<string> {
  const folder = resolveBackupFolder(db, defaultBackupFolder())
  await mkdir(folder, { recursive: true })
  return folder
}

export function registerSettingsHandlers(): void {
  registerProtectedHandler<void, BusinessSettings>(
    IPC.settings.get,
    null,
    () => getSettings(getDb())
  )

  registerProtectedHandler<UpdateSettingsInput, BusinessSettings>(
    IPC.settings.update,
    updateSettingsSchema,
    (input, user) => {
      const db = getDb()
      const settings = updateSettings(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'settings.update',
        entityType: 'settings',
        details: { businessName: settings.name }
      })
      return settings
    },
    { adminOnly: true }
  )

  registerProtectedHandler<void, string | null>(
    IPC.settings.pickBackupFolder,
    null,
    async (_input, _user, event) => {
      const parent = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.OpenDialogOptions = {
        title: 'Elegir carpeta de backups',
        properties: ['openDirectory', 'createDirectory']
      }
      const result = parent
        ? await dialog.showOpenDialog(parent, options)
        : await dialog.showOpenDialog(options)

      return result.canceled ? null : (result.filePaths[0] ?? null)
    },
    { adminOnly: true }
  )

  registerProtectedHandler<void, string | null>(
    IPC.settings.openBackupFolder,
    null,
    async () => {
      const folder = await ensureBackupFolder(getDb())
      const error = await shell.openPath(folder)

      if (error) {
        throw new AppError('INTERNAL_ERROR', 'No se pudo abrir la carpeta')
      }

      return folder
    },
    { adminOnly: true }
  )

  registerProtectedHandler<void, BackupRecord[]>(
    IPC.backups.list,
    null,
    async () => listBackups(await ensureBackupFolder(getDb())),
    { adminOnly: true }
  )

  registerProtectedHandler<void, BackupRecord>(
    IPC.backups.create,
    null,
    async (_input, user) => {
      const db = getDb()
      const folder = await ensureBackupFolder(db)
      return createBackup(db, folder, user.id)
    },
    { adminOnly: true }
  )

  registerProtectedHandler<RestoreBackupInput, null>(
    IPC.backups.restore,
    restoreBackupSchema,
    async (input, user) => {
      if (basename(input.fileName) !== input.fileName) {
        throw new AppError('VALIDATION_ERROR', 'El backup no es válido')
      }

      const db = getDb()
      const folder = await ensureBackupFolder(db)
      const source = join(folder, input.fileName)
      const sourceInfo = await stat(source).catch(() => null)

      if (!sourceInfo?.isFile()) {
        throw new AppError('NOT_FOUND', 'El backup seleccionado no existe')
      }

      const safety = await createBackup(db, folder, user.id)
      const databasePath = join(app.getPath('userData'), 'veterinaria.db')

      closeDatabase()

      try {
        await copyFile(source, databasePath)
        await Promise.all([
          rm(`${databasePath}-wal`, { force: true }),
          rm(`${databasePath}-shm`, { force: true })
        ])
        initDatabase(databasePath)
        logActivity(getDb(), {
          userId: user.id,
          action: 'backup.restore',
          entityType: 'backup',
          details: { fileName: input.fileName, safetyBackup: safety.fileName }
        })
        clearSession()
      } catch {
        await copyFile(safety.filePath, databasePath).catch(() => undefined)
        initDatabase(databasePath)
        throw new AppError(
          'INTERNAL_ERROR',
          'No se pudo restaurar el backup. Se conservó la base anterior.'
        )
      }

      setTimeout(() => {
        app.relaunch()
        app.exit(0)
      }, 800)

      return null
    },
    { adminOnly: true }
  )

  registerProtectedHandler<ListActivityInput, ActivityRecord[]>(
    IPC.activity.list,
    listActivitySchema,
    (input) => listActivity(getDb(), input),
    { adminOnly: true }
  )
}
