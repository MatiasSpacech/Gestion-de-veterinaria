export const ROLES = ['admin', 'vendedor', 'peluquero'] as const

export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  peluquero: 'Peluquero'
}

export const PERMISSION_MODULES = [
  'dashboard',
  'clientes',
  'mascotas',
  'inventario',
  'ventas',
  'peluqueria',
  'reportes',
  'usuarios',
  'configuracion'
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: 'Panel',
  clientes: 'Clientes',
  mascotas: 'Mascotas',
  inventario: 'Inventario',
  ventas: 'Ventas',
  peluqueria: 'Peluquería',
  reportes: 'Reportes',
  usuarios: 'Usuarios',
  configuracion: 'Configuración'
}

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, PermissionModule[]> = {
  admin: [...PERMISSION_MODULES],
  vendedor: ['dashboard', 'clientes', 'mascotas', 'inventario', 'ventas'],
  peluquero: ['dashboard', 'clientes', 'mascotas', 'peluqueria']
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}
