import { describe, expect, it } from 'vitest'

import {
  APPOINTMENT_REMINDER_MINUTES,
  appointmentReminderDate,
  appointmentReminderIdentifier,
  appointmentStartDate,
  shouldCancelAppointmentReminder
} from './notifications-policy'

describe('appointmentStartDate', () => {
  it('combina la fecha con los minutos de inicio', () => {
    const start = appointmentStartDate('2026-10-22', 615)

    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(9)
    expect(start.getDate()).toBe(22)
    expect(start.getHours()).toBe(10)
    expect(start.getMinutes()).toBe(15)
  })
})

describe('appointmentReminderDate', () => {
  it('programa el recordatorio una hora antes por defecto', () => {
    const reminder = appointmentReminderDate('2026-10-22', 615)

    expect(APPOINTMENT_REMINDER_MINUTES).toBe(60)
    expect(reminder.getHours()).toBe(9)
    expect(reminder.getMinutes()).toBe(15)
  })

  it('permite cambiar la anticipación', () => {
    const reminder = appointmentReminderDate('2026-10-22', 615, 30)

    expect(reminder.getHours()).toBe(9)
    expect(reminder.getMinutes()).toBe(45)
  })
})

describe('shouldCancelAppointmentReminder', () => {
  it('cancela el recordatorio con estados finales', () => {
    expect(shouldCancelAppointmentReminder('completado')).toBe(true)
    expect(shouldCancelAppointmentReminder('cancelado')).toBe(true)
    expect(shouldCancelAppointmentReminder('no_asistio')).toBe(true)
  })

  it('mantiene el recordatorio con turnos pendientes o confirmados', () => {
    expect(shouldCancelAppointmentReminder('pendiente')).toBe(false)
    expect(shouldCancelAppointmentReminder('confirmado')).toBe(false)
  })
})

describe('appointmentReminderIdentifier', () => {
  it('usa un identificador estable por turno', () => {
    expect(appointmentReminderIdentifier(42)).toBe('turno-42')
  })
})
