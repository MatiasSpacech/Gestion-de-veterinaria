import type Database from 'better-sqlite3'
import type { UpdateSettingsInput } from '@shared/schemas'
import type { BusinessSettings } from '@shared/types'

export function getSetting(
  db: Database.Database,
  key: string,
  fallback: string | null = null
): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  return row?.value ?? fallback
}

export function setSetting(db: Database.Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, new Date().toISOString())
}

export function getBusinessName(db: Database.Database): string {
  return getSetting(db, 'business.name', 'Veterinaria') ?? 'Veterinaria'
}

function integerSetting(
  db: Database.Database,
  key: string,
  fallback: number
): number {
  const value = Number(getSetting(db, key, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

export function getSettings(db: Database.Database): BusinessSettings {
  return {
    name: getBusinessName(db),
    address: getSetting(db, 'business.address', '') ?? '',
    phone: getSetting(db, 'business.phone', '') ?? '',
    email: getSetting(db, 'business.email', '') ?? '',
    currency: getSetting(db, 'business.currency', 'ARS') ?? 'ARS',
    openDays: (getSetting(db, 'business.open_days', '1,2,3,4,5,6') ?? '1,2,3,4,5,6')
      .split(',')
      .map((day) => day.trim())
      .filter((day) => /^[1-7]$/.test(day)),
    openTime: getSetting(db, 'business.open_time', '09:00') ?? '09:00',
    closeTime: getSetting(db, 'business.close_time', '19:00') ?? '19:00',
    slotMinutes: integerSetting(db, 'business.slot_minutes', 30),
    expiryAlertDays: integerSetting(db, 'alerts.expiry_days', 60),
    vaccineAlertDays: integerSetting(db, 'alerts.vaccine_days', 30),
    whatsappTemplate:
      getSetting(
        db,
        'grooming.whatsapp_template',
        'Hola {cliente}, te recordamos el turno de {mascota} para {servicio} el {fecha} a las {hora} en {negocio}. ¡Gracias!'
      ) ?? '',
    backupEnabled: getSetting(db, 'backup.enabled', '1') === '1',
    backupFolder: getSetting(db, 'backup.folder', '') ?? '',
    backupRetention: integerSetting(db, 'backup.retention', 30),
    lastBackupAt: getSetting(db, 'backup.last_run', '') ?? ''
  }
}

export function updateSettings(
  db: Database.Database,
  input: UpdateSettingsInput
): BusinessSettings {
  const values: Record<string, string> = {
    'business.name': input.name,
    'business.address': input.address,
    'business.phone': input.phone,
    'business.email': input.email,
    'business.currency': input.currency,
    'business.open_days': input.openDays.join(','),
    'business.open_time': input.openTime,
    'business.close_time': input.closeTime,
    'business.slot_minutes': String(input.slotMinutes),
    'alerts.expiry_days': String(input.expiryAlertDays),
    'alerts.vaccine_days': String(input.vaccineAlertDays),
    'grooming.whatsapp_template': input.whatsappTemplate,
    'backup.enabled': input.backupEnabled ? '1' : '0',
    'backup.folder': input.backupFolder,
    'backup.retention': String(input.backupRetention)
  }

  const save = db.transaction(() => {
    for (const [key, value] of Object.entries(values)) {
      setSetting(db, key, value)
    }
  })

  save()

  return getSettings(db)
}
