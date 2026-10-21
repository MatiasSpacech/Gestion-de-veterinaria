import type {
  CancelSaleInput,
  ChangePasswordInput,
  CreateCategoryInput,
  CreateClientInput,
  CreateMedicalRecordInput,
  CreatePetInput,
  CreateProductInput,
  CreateSaleInput,
  CreateUserInput,
  GetByIdInput,
  ListCategoriesInput,
  ListClientsInput,
  ListMedicalRecordsInput,
  ListPetsInput,
  ListProductBatchesInput,
  ListProductsInput,
  ListSalesInput,
  ListStockMovementsInput,
  LoginInput,
  ResetPasswordInput,
  SetActiveInput,
  SetupAdminInput,
  StockAdjustmentInput,
  StockEntryInput,
  UpdateCategoryInput,
  UpdateClientInput,
  UpdatePetInput,
  UpdateProductInput,
  UpdateUserInput,
  WeightHistoryInput
} from './schemas'
import type {
  AppInfo,
  AuthStatus,
  ClientDetail,
  ClientRecord,
  ExpiringBatch,
  InventorySummary,
  MedicalRecord,
  PetRecord,
  ProductBatch,
  ProductCategory,
  ProductRecord,
  SaleDetail,
  SaleListRecord,
  SalesSummary,
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
  app: {
    info: () => Promise<IpcResult<AppInfo>>
  }
}
