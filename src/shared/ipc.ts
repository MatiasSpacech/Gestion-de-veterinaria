import type {
  CancelSaleInput,
  ChangePasswordInput,
  ChargeAppointmentInput,
  CreateAppointmentInput,
  CreateCategoryInput,
  CreateClientInput,
  CreateGroomerInput,
  CreateMedicalRecordInput,
  CreatePetInput,
  CreateProductInput,
  CreateSaleInput,
  CreateServiceInput,
  CreateUserInput,
  GetByIdInput,
  ListActivityInput,
  ListAppointmentsInput,
  ListCategoriesInput,
  ListClientsInput,
  ListGroomersInput,
  ListServicesInput,
  ListMedicalRecordsInput,
  ListPetsInput,
  ListProductBatchesInput,
  ListProductsInput,
  ListSalesInput,
  ListStockMovementsInput,
  LoginInput,
  ReportRangeInput,
  ResetPasswordInput,
  RestoreBackupInput,
  SetActiveInput,
  SetAppointmentStatusInput,
  SetupAdminInput,
  StockAdjustmentInput,
  StockEntryInput,
  UpdateAppointmentInput,
  UpdateCategoryInput,
  UpdateClientInput,
  UpdateGroomerInput,
  UpdatePetInput,
  UpdateProductInput,
  UpdateRolePermissionsInput,
  UpdateServiceInput,
  UpdateSettingsInput,
  UpdateUserInput,
  WeightHistoryInput
} from './schemas'
import type {
  ActivityRecord,
  AppInfo,
  AppointmentRecord,
  AppointmentSummary,
  AuthStatus,
  BackupRecord,
  BusinessSettings,
  ChargeAppointmentResult,
  ClientDetail,
  ClientRecord,
  ExpiringBatch,
  GroomerRecord,
  InventorySummary,
  MedicalRecord,
  PetRecord,
  ProductBatch,
  ProductCategory,
  ProductRecord,
  ReportData,
  RolePermissionsRecord,
  SaleDetail,
  SaleListRecord,
  SalesSummary,
  ServiceRecord,
  StockMovement,
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
    resetPassword: 'users:reset-password',
    permissions: 'users:permissions',
    updatePermissions: 'users:update-permissions'
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
  inventory: {
    listCategories: 'inventory:list-categories',
    createCategory: 'inventory:create-category',
    updateCategory: 'inventory:update-category',
    setCategoryActive: 'inventory:set-category-active',
    listProducts: 'inventory:list-products',
    getProduct: 'inventory:get-product',
    createProduct: 'inventory:create-product',
    updateProduct: 'inventory:update-product',
    setProductActive: 'inventory:set-product-active',
    listBatches: 'inventory:list-batches',
    listExpiring: 'inventory:list-expiring',
    listMovements: 'inventory:list-movements',
    summary: 'inventory:summary',
    registerEntry: 'inventory:register-entry',
    adjustStock: 'inventory:adjust-stock',
    exportCsv: 'inventory:export-csv'
  },
  sales: {
    create: 'sales:create',
    list: 'sales:list',
    get: 'sales:get',
    cancel: 'sales:cancel',
    summary: 'sales:summary'
  },
  reports: {
    get: 'reports:get',
    exportCsv: 'reports:export-csv',
    exportPdf: 'reports:export-pdf'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update',
    pickBackupFolder: 'settings:pick-backup-folder',
    openBackupFolder: 'settings:open-backup-folder'
  },
  backups: {
    list: 'backups:list',
    create: 'backups:create',
    restore: 'backups:restore'
  },
  activity: {
    list: 'activity:list'
  },
  grooming: {
    listServices: 'grooming:list-services',
    createService: 'grooming:create-service',
    updateService: 'grooming:update-service',
    setServiceActive: 'grooming:set-service-active',
    listGroomers: 'grooming:list-groomers',
    createGroomer: 'grooming:create-groomer',
    updateGroomer: 'grooming:update-groomer',
    setGroomerActive: 'grooming:set-groomer-active',
    listAppointments: 'grooming:list-appointments',
    getAppointment: 'grooming:get-appointment',
    createAppointment: 'grooming:create-appointment',
    updateAppointment: 'grooming:update-appointment',
    setAppointmentStatus: 'grooming:set-appointment-status',
    chargeAppointment: 'grooming:charge-appointment',
    summary: 'grooming:summary'
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
    permissions: () => Promise<IpcResult<RolePermissionsRecord[]>>
    updatePermissions: (
      input: UpdateRolePermissionsInput
    ) => Promise<IpcResult<RolePermissionsRecord[]>>
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
  inventory: {
    listCategories: (
      input: ListCategoriesInput
    ) => Promise<IpcResult<ProductCategory[]>>
    createCategory: (
      input: CreateCategoryInput
    ) => Promise<IpcResult<ProductCategory>>
    updateCategory: (
      input: UpdateCategoryInput
    ) => Promise<IpcResult<ProductCategory>>
    setCategoryActive: (
      input: SetActiveInput
    ) => Promise<IpcResult<ProductCategory>>
    listProducts: (input: ListProductsInput) => Promise<IpcResult<ProductRecord[]>>
    getProduct: (input: GetByIdInput) => Promise<IpcResult<ProductRecord>>
    createProduct: (input: CreateProductInput) => Promise<IpcResult<ProductRecord>>
    updateProduct: (input: UpdateProductInput) => Promise<IpcResult<ProductRecord>>
    setProductActive: (input: SetActiveInput) => Promise<IpcResult<ProductRecord>>
    listBatches: (
      input: ListProductBatchesInput
    ) => Promise<IpcResult<ProductBatch[]>>
    listExpiring: () => Promise<IpcResult<ExpiringBatch[]>>
    listMovements: (
      input: ListStockMovementsInput
    ) => Promise<IpcResult<StockMovement[]>>
    summary: () => Promise<IpcResult<InventorySummary>>
    registerEntry: (input: StockEntryInput) => Promise<IpcResult<ProductRecord>>
    adjustStock: (input: StockAdjustmentInput) => Promise<IpcResult<ProductRecord>>
    exportCsv: () => Promise<IpcResult<string | null>>
  }
  sales: {
    create: (input: CreateSaleInput) => Promise<IpcResult<SaleDetail>>
    list: (input: ListSalesInput) => Promise<IpcResult<SaleListRecord[]>>
    get: (input: GetByIdInput) => Promise<IpcResult<SaleDetail>>
    cancel: (input: CancelSaleInput) => Promise<IpcResult<SaleDetail>>
    summary: () => Promise<IpcResult<SalesSummary>>
  }
  reports: {
    get: (input: ReportRangeInput) => Promise<IpcResult<ReportData>>
    exportCsv: (input: ReportRangeInput) => Promise<IpcResult<string | null>>
    exportPdf: (input: ReportRangeInput) => Promise<IpcResult<string | null>>
  }
  settings: {
    get: () => Promise<IpcResult<BusinessSettings>>
    update: (
      input: UpdateSettingsInput
    ) => Promise<IpcResult<BusinessSettings>>
    pickBackupFolder: () => Promise<IpcResult<string | null>>
    openBackupFolder: () => Promise<IpcResult<string | null>>
  }
  backups: {
    list: () => Promise<IpcResult<BackupRecord[]>>
    create: () => Promise<IpcResult<BackupRecord>>
    restore: (input: RestoreBackupInput) => Promise<IpcResult<null>>
  }
  activity: {
    list: (input: ListActivityInput) => Promise<IpcResult<ActivityRecord[]>>
  }
  grooming: {
    listServices: (input: ListServicesInput) => Promise<IpcResult<ServiceRecord[]>>
    createService: (
      input: CreateServiceInput
    ) => Promise<IpcResult<ServiceRecord>>
    updateService: (
      input: UpdateServiceInput
    ) => Promise<IpcResult<ServiceRecord>>
    setServiceActive: (
      input: SetActiveInput
    ) => Promise<IpcResult<ServiceRecord>>
    listGroomers: (input: ListGroomersInput) => Promise<IpcResult<GroomerRecord[]>>
    createGroomer: (
      input: CreateGroomerInput
    ) => Promise<IpcResult<GroomerRecord>>
    updateGroomer: (
      input: UpdateGroomerInput
    ) => Promise<IpcResult<GroomerRecord>>
    setGroomerActive: (
      input: SetActiveInput
    ) => Promise<IpcResult<GroomerRecord>>
    listAppointments: (
      input: ListAppointmentsInput
    ) => Promise<IpcResult<AppointmentRecord[]>>
    getAppointment: (
      input: GetByIdInput
    ) => Promise<IpcResult<AppointmentRecord>>
    createAppointment: (
      input: CreateAppointmentInput
    ) => Promise<IpcResult<AppointmentRecord>>
    updateAppointment: (
      input: UpdateAppointmentInput
    ) => Promise<IpcResult<AppointmentRecord>>
    setAppointmentStatus: (
      input: SetAppointmentStatusInput
    ) => Promise<IpcResult<AppointmentRecord>>
    chargeAppointment: (
      input: ChargeAppointmentInput
    ) => Promise<IpcResult<ChargeAppointmentResult>>
    summary: () => Promise<IpcResult<AppointmentSummary>>
  }
  app: {
    info: () => Promise<IpcResult<AppInfo>>
  }
}
