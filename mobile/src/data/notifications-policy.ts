import type { AppointmentStatus } from '@shared/types'

export const APPOINTMENT_REMINDER_MINUTES = 60

export function appointmentStartDate(date: string, startMinutes: number): Date {
  const [year, month, day] = date.split('-').map(Number)

  return new Date(
    year,
    (month ?? 1) - 1,
    day ?? 1,
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0,
    0
  )
}

export function appointmentReminderDate(
  date: string,
  startMinutes: number,
  minutesBefore: number = APPOINTMENT_REMINDER_MINUTES
): Date {
  return new Date(
    appointmentStartDate(date, startMinutes).getTime() - minutesBefore * 60_000
  )
}

export function shouldCancelAppointmentReminder(
  status: AppointmentStatus
): boolean {
  return status === 'completado' || status === 'cancelado' || status === 'no_asistio'
}

export function appointmentReminderIdentifier(appointmentId: number): string {
  return `turno-${appointmentId}`
}
