import { describe, expect, it } from 'vitest'

import {
  BACKUP_EXTENSION,
  BACKUP_PREFIX,
  backupFileName,
  backupWasMadeToday,
  isBackupFileName,
  localDateKey,
  selectBackupsToPrune
} from './backup-format'

describe('formato de backups', () => {
  it('usa el mismo nombre de archivo que la app de escritorio', () => {
    const name = backupFileName(new Date('2026-10-22T11:30:00.000Z'))

    expect(name).toBe('vetgestion-2026-10-22T11-30-00-000Z.db')
    expect(name.startsWith(BACKUP_PREFIX)).toBe(true)
    expect(name.endsWith(BACKUP_EXTENSION)).toBe(true)
  })

  it('reconoce solo los archivos de backup', () => {
    expect(isBackupFileName('vetgestion-2026-10-22T11-30-00-000Z.db')).toBe(true)
    expect(isBackupFileName('veterinaria.db')).toBe(false)
    expect(isBackupFileName('foto.png')).toBe(false)
  })

  it('detecta si el backup del día ya se hizo', () => {
    const now = new Date('2026-10-22T15:00:00.000Z')

    expect(backupWasMadeToday('', now)).toBe(false)
    expect(backupWasMadeToday('no-es-una-fecha', now)).toBe(false)
    expect(backupWasMadeToday('2026-10-22T08:00:00.000Z', now)).toBe(true)
    expect(backupWasMadeToday('2026-10-21T08:00:00.000Z', now)).toBe(false)
  })

  it('usa la fecha local para comparar días', () => {
    expect(localDateKey(new Date(2026, 9, 22))).toBe('2026-10-22')
    expect(localDateKey(new Date(2026, 11, 5))).toBe('2026-12-05')
  })
})

describe('retención de backups', () => {
  const backups = [
    { fileName: 'a', createdAt: '2026-10-22T10:00:00.000Z', sizeBytes: 10 },
    { fileName: 'b', createdAt: '2026-10-21T10:00:00.000Z', sizeBytes: 10 },
    { fileName: 'c', createdAt: '2026-10-20T10:00:00.000Z', sizeBytes: 10 }
  ]

  it('borra los más viejos cuando supera la retención', () => {
    expect(selectBackupsToPrune(backups, 2).map((item) => item.fileName)).toEqual([
      'c'
    ])
  })

  it('no borra nada cuando la retención alcanza', () => {
    expect(selectBackupsToPrune(backups, 3)).toHaveLength(0)
    expect(selectBackupsToPrune(backups, 0)).toHaveLength(0)
  })
})
