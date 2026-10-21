import type Database from 'better-sqlite3'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_MODULES,
  ROLES
} from '@shared/roles'

const DEFAULT_SETTINGS: Record<string, string> = {
  'business.name': 'Veterinaria',
  'business.address': '',
  'business.phone': '',
  'business.email': '',
  'business.currency': 'ARS',
  'business.open_days': '1,2,3,4,5,6',
  'business.open_time': '09:00',
  'business.close_time': '19:00',
  'business.slot_minutes': '30',
  'alerts.expiry_days': '60',
  'alerts.vaccine_days': '30',
  'grooming.whatsapp_template':
    'Hola {cliente}, te recordamos el turno de {mascota} para {servicio} el {fecha} a las {hora} en {negocio}. ¡Gracias!',
  'backup.enabled': '1',
  'backup.folder': '',
  'backup.retention': '30',
  'backup.last_run': ''
}

const DEFAULT_CATEGORIES = ['Alimentos', 'Medicamentos', 'Accesorios', 'Higiene', 'Vacunas']

const DEFAULT_SERVICES: Array<{
  name: string
  category: 'peluqueria' | 'consulta'
  duration: number
}> = [
  { name: 'Baño', category: 'peluqueria', duration: 45 },
  { name: 'Corte de pelo', category: 'peluqueria', duration: 60 },
  { name: 'Baño y corte', category: 'peluqueria', duration: 90 },
  { name: 'Corte de uñas', category: 'peluqueria', duration: 15 },
  { name: 'Consulta general', category: 'consulta', duration: 30 }
]

export function seedDatabase(db: Database.Database): void {
  const now = new Date().toISOString()

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
  )
  const insertPermission = db.prepare(
    'INSERT OR IGNORE INTO role_permissions (role, module, allowed) VALUES (?, ?, ?)'
  )
  const insertCategory = db.prepare(
    'INSERT OR IGNORE INTO product_categories (name, created_at) VALUES (?, ?)'
  )
  const insertService = db.prepare(
    `INSERT OR IGNORE INTO services (name, category, price_cents, duration_minutes, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?, ?)`
  )

  const seed = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value, now)
    }

    for (const role of ROLES) {
      const allowedModules = new Set<string>(DEFAULT_ROLE_PERMISSIONS[role])
      for (const module of PERMISSION_MODULES) {
        insertPermission.run(role, module, allowedModules.has(module) ? 1 : 0)
      }
    }

    for (const name of DEFAULT_CATEGORIES) {
      insertCategory.run(name, now)
    }

    for (const service of DEFAULT_SERVICES) {
      insertService.run(service.name, service.category, service.duration, now, now)
    }
  })

  seed()
}
