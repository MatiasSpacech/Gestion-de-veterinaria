import type Database from 'better-sqlite3'
import {
  getSetting,
  getSettings,
  setSetting,
  updateSettings
} from '@desktop/services/settings'
import {
  updateSettingsSchema,
  type UpdateSettingsInput
} from '@shared/schemas'
import type { BusinessSettings } from '@shared/types'

import { recordActivity } from '../../data/controllers/audit'
import { requirePermission } from '../../data/controllers/permissions'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'

const APPOINTMENT_REMINDERS_KEY = 'mobile.notifications.appointments'

export interface BusinessProfile {
  name: string
  whatsappTemplate: string
}

export function getBusinessSettings(
  db: Database.Database = getMobileDatabase()
): BusinessSettings {
  requirePermission('configuracion', db)

  return getSettings(db)
}

export function getBusinessProfile(
  db: Database.Database = getMobileDatabase()
): BusinessProfile {
  const settings = getSettings(db)

  return {
    name: settings.name,
    whatsappTemplate: settings.whatsappTemplate
  }
}

export function saveBusinessSettings(
  input: UpdateSettingsInput,
  db: Database.Database = getMobileDatabase()
): BusinessSettings {
  requirePermission('configuracion', db)

  const parsed = parseInput(updateSettingsSchema, input)
  const settings = updateSettings(db, parsed)

  recordActivity(
    {
      action: 'configuracion.actualizada',
      entityType: 'settings'
    },
    db
  )

  return settings
}

export function getAppointmentRemindersEnabled(
  db: Database.Database = getMobileDatabase()
): boolean {
  return getSetting(db, APPOINTMENT_REMINDERS_KEY, '1') !== '0'
}

export function setAppointmentRemindersEnabled(
  enabled: boolean,
  db: Database.Database = getMobileDatabase()
): void {
  setSetting(db, APPOINTMENT_REMINDERS_KEY, enabled ? '1' : '0')
}
