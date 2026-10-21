import type { PermissionModule, Role } from './roles'

export interface AuthUser {
  id: number
  name: string
  username: string
  role: Role
  permissions: PermissionModule[]
}

export interface AuthStatus {
  initialized: boolean
  user: AuthUser | null
  businessName: string
  version: string
}

export interface UserRecord {
  id: number
  name: string
  username: string
  role: Role
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface AppInfo {
  version: string
  electron: string
  platform: string
}

export type PetSex = 'macho' | 'hembra' | 'desconocido'

export type MedicalRecordType =
  | 'consulta'
  | 'vacuna'
  | 'desparasitacion'
  | 'cirugia'
  | 'tratamiento'
  | 'nota'
  | 'peso'

export interface ClientRecord {
  id: number
  name: string
  docNumber: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  active: boolean
  petCount: number
  createdAt: string
  updatedAt: string
}

export interface PetRecord {
  id: number
  clientId: number
  clientName: string
  clientActive: boolean
  name: string
  species: string
  breed: string | null
  sex: PetSex
  birthDate: string | null
  color: string | null
  weightKg: number | null
  sterilized: boolean
  allergies: string | null
  chronicConditions: string | null
  notes: string | null
  photoFileName: string | null
  active: boolean
  nextVaccineDue: string | null
  lastRecordDate: string | null
  createdAt: string
  updatedAt: string
}

export interface ClientDetail extends ClientRecord {
  pets: PetRecord[]
}

export interface MedicalRecord {
  id: number
  petId: number
  type: MedicalRecordType
  date: string
  title: string
  description: string | null
  diagnosis: string | null
  treatment: string | null
  vetName: string | null
  weightKg: number | null
  nextDueDate: string | null
  createdByName: string | null
  createdAt: string
}

export interface WeightEntry {
  id: number
  date: string
  weightKg: number
  title: string
}

export interface UpcomingVaccine {
  petId: number
  petName: string
  clientId: number
  clientName: string
  title: string
  lastDoseDate: string
  nextDueDate: string
  daysUntil: number
}
