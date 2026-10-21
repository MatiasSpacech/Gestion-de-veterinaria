import { BrowserWindow } from 'electron'
import { IPC, type PetPhotoSelection } from '@shared/ipc'
import {
  createMedicalRecordSchema,
  createPetSchema,
  getByIdSchema,
  listMedicalRecordsSchema,
  listPetsSchema,
  setActiveSchema,
  updatePetSchema,
  weightHistorySchema,
  type CreateMedicalRecordInput,
  type CreatePetInput,
  type GetByIdInput,
  type ListMedicalRecordsInput,
  type ListPetsInput,
  type SetActiveInput,
  type UpdatePetInput,
  type WeightHistoryInput
} from '@shared/schemas'
import type {
  MedicalRecord,
  PetRecord,
  UpcomingVaccine,
  WeightEntry
} from '@shared/types'
import { getDb } from '@main/db'
import { deletePetPhotoFile, pickPetPhoto } from '@main/photos'
import { getSetting } from '@main/services/settings'
import {
  createMedicalRecord,
  createPet,
  getPet,
  getWeightHistory,
  listMedicalRecords,
  listPets,
  listUpcomingVaccines,
  setPetActive,
  updatePet
} from '@main/services/pets'
import { registerProtectedHandler } from './handle'

export function registerPetHandlers(): void {
  registerProtectedHandler<ListPetsInput, PetRecord[]>(
    IPC.pets.list,
    listPetsSchema,
    (input) => listPets(getDb(), input),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<GetByIdInput, PetRecord>(
    IPC.pets.get,
    getByIdSchema,
    (input) => getPet(getDb(), input.id),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<CreatePetInput, PetRecord>(
    IPC.pets.create,
    createPetSchema,
    (input, user) => createPet(getDb(), input, user.id),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<UpdatePetInput, PetRecord>(
    IPC.pets.update,
    updatePetSchema,
    async (input) => {
      const db = getDb()
      const existing = getPet(db, input.id)
      const updated = updatePet(db, input)

      if (
        existing.photoFileName &&
        existing.photoFileName !== updated.photoFileName
      ) {
        await deletePetPhotoFile(existing.photoFileName)
      }

      return updated
    },
    { permission: 'mascotas' }
  )

  registerProtectedHandler<SetActiveInput, PetRecord>(
    IPC.pets.setActive,
    setActiveSchema,
    (input) => setPetActive(getDb(), input),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<void, PetPhotoSelection | null>(
    IPC.pets.pickPhoto,
    null,
    (_input, _user, event) => {
      const parent = BrowserWindow.fromWebContents(event.sender)
      return pickPetPhoto(parent)
    },
    { permission: 'mascotas' }
  )

  registerProtectedHandler<ListMedicalRecordsInput, MedicalRecord[]>(
    IPC.pets.medicalRecords,
    listMedicalRecordsSchema,
    (input) => listMedicalRecords(getDb(), input),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<CreateMedicalRecordInput, MedicalRecord>(
    IPC.pets.createMedicalRecord,
    createMedicalRecordSchema,
    (input, user) => createMedicalRecord(getDb(), input, user.id),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<WeightHistoryInput, WeightEntry[]>(
    IPC.pets.weightHistory,
    weightHistorySchema,
    (input) => getWeightHistory(getDb(), input.petId),
    { permission: 'mascotas' }
  )

  registerProtectedHandler<void, UpcomingVaccine[]>(
    IPC.pets.upcomingVaccines,
    null,
    () => {
      const db = getDb()
      const rawDays = getSetting(db, 'alerts.vaccine_days', '30')
      const days = Number.parseInt(rawDays ?? '30', 10)

      return listUpcomingVaccines(db, Number.isFinite(days) ? days : 30)
    },
    { permission: 'mascotas' }
  )
}
