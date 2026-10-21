import type {
  AppointmentStatus,
  PaymentMethod,
  ServiceCategory
} from '@shared/types'

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
  no_asistio: 'No asistió'
}

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  pendiente: 'yellow',
  confirmado: 'blue',
  en_proceso: 'violet',
  completado: 'vetGreen',
  cancelado: 'red',
  no_asistio: 'gray'
}

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  peluqueria: 'Peluquería',
  consulta: 'Consulta',
  otro: 'Otro'
}

export const SERVICE_CATEGORY_OPTIONS = [
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'otro', label: 'Otro' }
]

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

export const STATUS_ACTIONS: Partial<
  Record<
    AppointmentStatus,
    Array<{
      status: AppointmentStatus
      label: string
      color: string
      confirm?: boolean
    }>
  >
> = {
  pendiente: [
    { status: 'confirmado', label: 'Confirmar', color: 'blue' },
    { status: 'no_asistio', label: 'No asistió', color: 'gray', confirm: true },
    { status: 'cancelado', label: 'Cancelar', color: 'red', confirm: true }
  ],
  confirmado: [
    { status: 'en_proceso', label: 'Iniciar', color: 'violet' },
    { status: 'no_asistio', label: 'No asistió', color: 'gray', confirm: true },
    { status: 'cancelado', label: 'Cancelar', color: 'red', confirm: true }
  ],
  en_proceso: [
    { status: 'completado', label: 'Completar', color: 'vetGreen' },
    { status: 'cancelado', label: 'Cancelar', color: 'red', confirm: true }
  ]
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours > 23 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

export function buildWhatsAppUrl(
  appointment: {
    clientName: string
    clientPhone: string | null
    petName: string
    services: Array<{ name: string }>
    date: string
    startMinutes: number
  },
  businessName: string
): string | null {
  const phoneDigits = appointment.clientPhone?.replace(/\D/g, '') ?? ''

  if (phoneDigits.length < 6) {
    return null
  }

  const [year, month, day] = appointment.date.split('-')
  const serviceNames = appointment.services.map((service) => service.name).join(', ')
  const text = [
    `Hola ${appointment.clientName}, te recordamos el turno de ${appointment.petName}`,
    `para ${serviceNames} el ${day}/${month}/${year} a las ${formatMinutes(
      appointment.startMinutes
    )} en ${businessName}. ¡Gracias!`
  ].join(' ')

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`
}
