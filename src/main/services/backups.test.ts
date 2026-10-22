import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from '@main/db/connection'
import { listActivity } from './activity'
import {
  createBackup,
  listBackups,
  runAutomaticBackup
} from './backups'
import { getSettings, setSetting } from './settings'

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

describe('backups', () => {
  let database: Database.Database
  let tempDirectory: string
  let backupFolder: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-backups-'))
    backupFolder = join(tempDirectory, 'backups')
    database = createDatabase(join(tempDirectory, 'test.db'))
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('crea un backup, lo lista y registra el evento', async () => {
    const backup = await createBackup(database, backupFolder, null)
    const backups = await listBackups(backupFolder)
    const activity = listActivity(database, {
      limit: 10,
      search: 'backup.create'
    })

    expect(existsSync(backup.filePath)).toBe(true)
    expect(backup.sizeBytes).toBeGreaterThan(0)
    expect(backups).toHaveLength(1)
    expect(backups[0]?.fileName).toBe(backup.fileName)
    expect(getSettings(database).lastBackupAt).not.toBe('')
    expect(activity[0]?.action).toBe('backup.create')

    const automatic = await runAutomaticBackup(database, backupFolder)
    expect(automatic).toBeNull()
  })

  it('no repite el backup automático si ya se hizo hoy por la noche', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 21, 22, 0) })

    try {
      await createBackup(database, backupFolder, null)
      const automatic = await runAutomaticBackup(database, backupFolder)

      expect(automatic).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('respeta la retención configurada', async () => {
    setSetting(database, 'backup.retention', '1')

    const first = await createBackup(database, backupFolder, null)
    await delay(20)
    const second = await createBackup(database, backupFolder, null)
    const backups = await listBackups(backupFolder)

    expect(backups).toHaveLength(1)
    expect(backups[0]?.fileName).toBe(second.fileName)
    expect(existsSync(first.filePath)).toBe(false)
  })

  it('no crea backups automáticos si están desactivados', async () => {
    setSetting(database, 'backup.enabled', '0')

    const automatic = await runAutomaticBackup(database, backupFolder)

    expect(automatic).toBeNull()
    expect(await listBackups(backupFolder)).toHaveLength(0)
  })
})
