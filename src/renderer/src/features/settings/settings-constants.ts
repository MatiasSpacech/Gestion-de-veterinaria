export const DAY_OPTIONS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '7', label: 'Domingo' }
] as const

export const ACTION_LABELS: Record<string, string> = {
  'auth.setup': 'Configuración inicial',
  'auth.login': 'Inicio de sesión',
  'auth.change-password': 'Cambio de contraseña',
  'user.create': 'Usuario creado',
  'user.update': 'Usuario actualizado',
  'user.reset-password': 'Contraseña restablecida',
  'user.update-permissions': 'Permisos actualizados',
  'client.create': 'Cliente creado',
  'client.update': 'Cliente actualizado',
  'client.set-active': 'Estado de cliente',
  'pet.create': 'Mascota creada',
  'pet.update': 'Mascota actualizada',
  'pet.set-active': 'Estado de mascota',
  'medical.create': 'Consulta registrada',
  'weight.create': 'Peso registrado',
  'category.create': 'Categoría creada',
  'category.update': 'Categoría actualizada',
  'category.set-active': 'Estado de categoría',
  'product.create': 'Producto creado',
  'product.update': 'Producto actualizado',
  'product.set-active': 'Estado de producto',
  'inventory.entry': 'Ingreso de stock',
  'inventory.adjustment': 'Ajuste de stock',
  'sale.create': 'Venta registrada',
  'sale.cancel': 'Venta anulada',
  'service.create': 'Servicio creado',
  'service.update': 'Servicio actualizado',
  'service.set-active': 'Estado de servicio',
  'groomer.create': 'Peluquero creado',
  'groomer.update': 'Peluquero actualizado',
  'groomer.set-active': 'Estado de peluquero',
  'appointment.create': 'Turno creado',
  'appointment.update': 'Turno actualizado',
  'appointment.status': 'Estado de turno',
  'appointment.charge': 'Turno cobrado',
  'settings.update': 'Configuración actualizada',
  'backup.create': 'Backup creado',
  'backup.restore': 'Backup restaurado',
  'report.export': 'Reporte exportado'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
