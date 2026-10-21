import { IPC } from '@shared/ipc'
import {
  chargeAppointmentSchema,
  createAppointmentSchema,
  createGroomerSchema,
  createServiceSchema,
  getByIdSchema,
  listAppointmentsSchema,
  listGroomersSchema,
  listServicesSchema,
  setActiveSchema,
  setAppointmentStatusSchema,
  updateAppointmentSchema,
  updateGroomerSchema,
  updateServiceSchema,
  type ChargeAppointmentInput,
  type CreateAppointmentInput,
  type CreateGroomerInput,
  type CreateServiceInput,
  type GetByIdInput,
  type ListAppointmentsInput,
  type ListGroomersInput,
  type ListServicesInput,
  type SetActiveInput,
  type SetAppointmentStatusInput,
  type UpdateAppointmentInput,
  type UpdateGroomerInput,
  type UpdateServiceInput
} from '@shared/schemas'
import type {
  AppointmentRecord,
  AppointmentSummary,
  ChargeAppointmentResult,
  GroomerRecord,
  ServiceRecord
} from '@shared/types'
import { getDb } from '@main/db'
import { logActivity } from '@main/services/activity'
import {
  chargeAppointment,
  createAppointment,
  createGroomer,
  createService,
  getAppointment,
  getAppointmentSummary,
  listAppointments,
  listGroomers,
  listServices,
  setAppointmentStatus,
  setGroomerActive,
  setServiceActive,
  updateAppointment,
  updateGroomer,
  updateService
} from '@main/services/grooming'
import { registerProtectedHandler } from './handle'

export function registerGroomingHandlers(): void {
  registerProtectedHandler<ListServicesInput, ServiceRecord[]>(
    IPC.grooming.listServices,
    listServicesSchema,
    (input) => listServices(getDb(), input),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<CreateServiceInput, ServiceRecord>(
    IPC.grooming.createService,
    createServiceSchema,
    (input, user) => {
      const db = getDb()
      const service = createService(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'service.create',
        entityType: 'service',
        entityId: service.id,
        details: { name: service.name }
      })
      return service
    },
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<UpdateServiceInput, ServiceRecord>(
    IPC.grooming.updateService,
    updateServiceSchema,
    (input, user) => {
      const db = getDb()
      const service = updateService(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'service.update',
        entityType: 'service',
        entityId: service.id,
        details: { name: service.name }
      })
      return service
    },
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<SetActiveInput, ServiceRecord>(
    IPC.grooming.setServiceActive,
    setActiveSchema,
    (input, user) => {
      const db = getDb()
      const service = setServiceActive(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'service.set-active',
        entityType: 'service',
        entityId: service.id,
        details: { name: service.name, active: service.active }
      })
      return service
    },
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<ListGroomersInput, GroomerRecord[]>(
    IPC.grooming.listGroomers,
    listGroomersSchema,
    (input) => listGroomers(getDb(), input),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<CreateGroomerInput, GroomerRecord>(
    IPC.grooming.createGroomer,
    createGroomerSchema,
    (input, user) => {
      const db = getDb()
      const groomer = createGroomer(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'groomer.create',
        entityType: 'groomer',
        entityId: groomer.id,
        details: { name: groomer.name }
      })
      return groomer
    },
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<UpdateGroomerInput, GroomerRecord>(
    IPC.grooming.updateGroomer,
    updateGroomerSchema,
    (input, user) => {
      const db = getDb()
      const groomer = updateGroomer(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'groomer.update',
        entityType: 'groomer',
        entityId: groomer.id,
        details: { name: groomer.name }
      })
      return groomer
    },
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<SetActiveInput, GroomerRecord>(
    IPC.grooming.setGroomerActive,
    setActiveSchema,
    (input, user) => {
      const db = getDb()
      const groomer = setGroomerActive(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'groomer.set-active',
        entityType: 'groomer',
        entityId: groomer.id,
        details: { name: groomer.name, active: groomer.active }
      })
      return groomer
    },
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<ListAppointmentsInput, AppointmentRecord[]>(
    IPC.grooming.listAppointments,
    listAppointmentsSchema,
    (input) => listAppointments(getDb(), input),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<GetByIdInput, AppointmentRecord>(
    IPC.grooming.getAppointment,
    getByIdSchema,
    (input) => getAppointment(getDb(), input.id),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<CreateAppointmentInput, AppointmentRecord>(
    IPC.grooming.createAppointment,
    createAppointmentSchema,
    (input, user) => {
      const db = getDb()
      const appointment = createAppointment(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'appointment.create',
        entityType: 'appointment',
        entityId: appointment.id,
        details: {
          date: appointment.date,
          startMinutes: appointment.startMinutes,
          petName: appointment.petName
        }
      })
      return appointment
    },
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<UpdateAppointmentInput, AppointmentRecord>(
    IPC.grooming.updateAppointment,
    updateAppointmentSchema,
    (input, user) => {
      const db = getDb()
      const appointment = updateAppointment(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'appointment.update',
        entityType: 'appointment',
        entityId: appointment.id,
        details: {
          date: appointment.date,
          startMinutes: appointment.startMinutes,
          petName: appointment.petName
        }
      })
      return appointment
    },
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<SetAppointmentStatusInput, AppointmentRecord>(
    IPC.grooming.setAppointmentStatus,
    setAppointmentStatusSchema,
    (input, user) => {
      const db = getDb()
      const appointment = setAppointmentStatus(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'appointment.status',
        entityType: 'appointment',
        entityId: appointment.id,
        details: { status: appointment.status, petName: appointment.petName }
      })
      return appointment
    },
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<
    ChargeAppointmentInput,
    ChargeAppointmentResult
  >(
    IPC.grooming.chargeAppointment,
    chargeAppointmentSchema,
    (input, user) => {
      const db = getDb()
      const result = chargeAppointment(db, input, user.id)
      logActivity(db, {
        userId: user.id,
        action: 'appointment.charge',
        entityType: 'appointment',
        entityId: result.appointment.id,
        details: {
          saleNumber: result.sale.number,
          totalCents: result.sale.totalCents
        }
      })
      return result
    },
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<void, AppointmentSummary>(
    IPC.grooming.summary,
    null,
    () => getAppointmentSummary(getDb()),
    { permission: 'peluqueria' }
  )
}
