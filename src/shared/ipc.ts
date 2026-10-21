import type {
  ChangePasswordInput,
  CreateClientInput,
  CreateMedicalRecordInput,
  CreatePetInput,
  CreateUserInput,
  GetByIdInput,
  ListClientsInput,
  ListMedicalRecordsInput,
  ListPetsInput,
  LoginInput,
  ResetPasswordInput,
  SetActiveInput,
  SetupAdminInput,
  UpdateClientInput,
  UpdatePetInput,
  UpdateUserInput,
  WeightHistoryInput
} from './schemas'
import type {
  AppInfo,
  AuthStatus,
  ClientDetail,
  ClientRecord,
  MedicalRecord,
  PetRecord,
  UpcomingVaccine,
  UserRecord,
  WeightEntry
} from './types'

export const IPC = {
  auth: {
    status: 'auth:status',
    setup: 'auth:setup',
    login: 'auth:login',
    logout: 'auth:logout',
    changePassword: 'auth:change-password'
  },
  users: {
    list: 'users:list',
    create: 'users:create',
    update: 'users:update',
    resetPassword: 'users:reset-password'
  },
  clients: {
    list: 'clients:list',
    get: 'clients:get',
    create: 'clients:create',
    update: 'clients:update',
    setActive: 'clients:set-active'
  },
  pets: {
    list: 'pets:list',
    get: 'pets:get',
    create: 'pets:create',
    update: 'pets:update',
    setActive: 'pets:set-active',
    pickPhoto: 'pets:pick-photo',
    medicalRecords: 'pets:medical-records',
    createMedicalRecord: 'pets:create-medical-record',
    weightHistory: 'pets:weight-history',
    upcomingVaccines: 'pets:upcoming-vaccines'
  },
  app: {
    info: 'app:info'
  }
} as const

export interface IpcError {
  code: string
  message: string
  details?: unknown
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcError }

export interface PetPhotoSelection {
  fileName: string
}

export interface VetApi {
  auth: {
    status: () => Promise<IpcResult<AuthStatus>>
    setup: (input: SetupAdminInput) => Promise<IpcResult<AuthStatus>>
    login: (input: LoginInput) => Promise<IpcResult<AuthStatus>>
    logout: () => Promise<IpcResult<AuthStatus>>
    changePassword: (input: ChangePasswordInput) => Promise<IpcResult<null>>
  }
  users: {
    list: () => Promise<IpcResult<UserRecord[]>>
    create: (input: CreateUserInput) => Promise<IpcResult<UserRecord>>
    update: (input: UpdateUserInput) => Promise<IpcResult<UserRecord>>
    resetPassword: (input: ResetPasswordInput) => Promise<IpcResult<null>>
  }
  clients: {
    list: (input: ListClientsInput) => Promise<IpcResult<ClientRecord[]>>
    get: (input: GetByIdInput) => Promise<IpcResult<ClientDetail>>
    create: (input: CreateClientInput) => Promise<IpcResult<ClientRecord>>
    update: (input: UpdateClientInput) => Promise<IpcResult<ClientRecord>>
    setActive: (input: SetActiveInput) => Promise<IpcResult<ClientRecord>>
  }
  pets: {
    list: (input: ListPetsInput) => Promise<IpcResult<PetRecord[]>>
    get: (input: GetByIdInput) => Promise<IpcResult<PetRecord>>
    create: (input: CreatePetInput) => Promise<IpcResult<PetRecord>>
    update: (input: UpdatePetInput) => Promise<IpcResult<PetRecord>>
    setActive: (input: SetActiveInput) => Promise<IpcResult<PetRecord>>
    pickPhoto: () => Promise<IpcResult<PetPhotoSelection | null>>
    medicalRecords: (
      input: ListMedicalRecordsInput
    ) => Promise<IpcResult<MedicalRecord[]>>
    createMedicalRecord: (
      input: CreateMedicalRecordInput
    ) => Promise<IpcResult<MedicalRecord>>
    weightHistory: (input: WeightHistoryInput) => Promise<IpcResult<WeightEntry[]>>
    upcomingVaccines: () => Promise<IpcResult<UpcomingVaccine[]>>
  }
  app: {
    info: () => Promise<IpcResult<AppInfo>>
  }
}
