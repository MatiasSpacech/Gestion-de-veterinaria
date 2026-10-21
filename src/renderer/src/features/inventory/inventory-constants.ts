import type { StockMovementType } from '@shared/types'

export const UNIT_OPTIONS = [
  'unidad',
  'caja',
  'frasco',
  'sobre',
  'dosis',
  'kg',
  'g',
  'litro',
  'ml'
]

export const STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'Todo el stock' },
  { value: 'low', label: 'Stock bajo' },
  { value: 'out', label: 'Sin stock' },
  { value: 'expiring', label: 'Por vencer' }
]

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
  venta: 'Venta',
  anulacion: 'Anulación'
}

export const MOVEMENT_COLORS: Record<StockMovementType, string> = {
  entrada: 'vetGreen',
  salida: 'orange',
  ajuste: 'violet',
  devolucion: 'blue',
  venta: 'teal',
  anulacion: 'red'
}
