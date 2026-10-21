import type { PaymentMethod, SaleStatus } from '@shared/types'

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
}

export const PAYMENT_OPTIONS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' }
]

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  completada: 'Completada',
  anulada: 'Anulada'
}

export const SALE_STATUS_COLORS: Record<SaleStatus, string> = {
  completada: 'vetGreen',
  anulada: 'red'
}
