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
    (input) => createService(getDb(), input),
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<UpdateServiceInput, ServiceRecord>(
    IPC.grooming.updateService,
    updateServiceSchema,
    (input) => updateService(getDb(), input),
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<SetActiveInput, ServiceRecord>(
    IPC.grooming.setServiceActive,
    setActiveSchema,
    (input) => setServiceActive(getDb(), input),
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
    (input) => createGroomer(getDb(), input),
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<UpdateGroomerInput, GroomerRecord>(
    IPC.grooming.updateGroomer,
    updateGroomerSchema,
    (input) => updateGroomer(getDb(), input),
    { permission: 'peluqueria', adminOnly: true }
  )

  registerProtectedHandler<SetActiveInput, GroomerRecord>(
    IPC.grooming.setGroomerActive,
    setActiveSchema,
    (input) => setGroomerActive(getDb(), input),
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
    (input) => createAppointment(getDb(), input),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<UpdateAppointmentInput, AppointmentRecord>(
    IPC.grooming.updateAppointment,
    updateAppointmentSchema,
    (input) => updateAppointment(getDb(), input),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<SetAppointmentStatusInput, AppointmentRecord>(
    IPC.grooming.setAppointmentStatus,
    setAppointmentStatusSchema,
    (input) => setAppointmentStatus(getDb(), input),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<
    ChargeAppointmentInput,
    ChargeAppointmentResult
  >(
    IPC.grooming.chargeAppointment,
    chargeAppointmentSchema,
    (input, user) => chargeAppointment(getDb(), input, user.id),
    { permission: 'peluqueria' }
  )

  registerProtectedHandler<void, AppointmentSummary>(
    IPC.grooming.summary,
    null,
    () => getAppointmentSummary(getDb()),
    { permission: 'peluqueria' }
  )
}
