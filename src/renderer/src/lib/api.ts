import type { IpcResult } from '@shared/ipc'
import type {
  ChangePasswordInput,
  LoginInput,
  SetupAdminInput
} from '@shared/schemas'

export class ApiClientError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.details = details
  }
}

async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise

  if (result.ok) {
    return result.data
  }

  throw new ApiClientError(result.error.code, result.error.message, result.error.details)
}

export const api = {
  auth: {
    status: () => unwrap(window.api.auth.status()),
    setup: (input: SetupAdminInput) => unwrap(window.api.auth.setup(input)),
    login: (input: LoginInput) => unwrap(window.api.auth.login(input)),
    logout: () => unwrap(window.api.auth.logout()),
    changePassword: (input: ChangePasswordInput) =>
      unwrap(window.api.auth.changePassword(input))
  },
  users: {
    list: () => unwrap(window.api.users.list()),
    create: (input: Parameters<typeof window.api.users.create>[0]) =>
      unwrap(window.api.users.create(input)),
    update: (input: Parameters<typeof window.api.users.update>[0]) =>
      unwrap(window.api.users.update(input)),
    resetPassword: (input: Parameters<typeof window.api.users.resetPassword>[0]) =>
      unwrap(window.api.users.resetPassword(input))
  },
  clients: {
    list: (input: Parameters<typeof window.api.clients.list>[0]) =>
      unwrap(window.api.clients.list(input)),
    get: (input: Parameters<typeof window.api.clients.get>[0]) =>
      unwrap(window.api.clients.get(input)),
    create: (input: Parameters<typeof window.api.clients.create>[0]) =>
      unwrap(window.api.clients.create(input)),
    update: (input: Parameters<typeof window.api.clients.update>[0]) =>
      unwrap(window.api.clients.update(input)),
    setActive: (input: Parameters<typeof window.api.clients.setActive>[0]) =>
      unwrap(window.api.clients.setActive(input))
  },
  pets: {
    list: (input: Parameters<typeof window.api.pets.list>[0]) =>
      unwrap(window.api.pets.list(input)),
    get: (input: Parameters<typeof window.api.pets.get>[0]) =>
      unwrap(window.api.pets.get(input)),
    create: (input: Parameters<typeof window.api.pets.create>[0]) =>
      unwrap(window.api.pets.create(input)),
    update: (input: Parameters<typeof window.api.pets.update>[0]) =>
      unwrap(window.api.pets.update(input)),
    setActive: (input: Parameters<typeof window.api.pets.setActive>[0]) =>
      unwrap(window.api.pets.setActive(input)),
    pickPhoto: () => unwrap(window.api.pets.pickPhoto()),
    medicalRecords: (input: Parameters<typeof window.api.pets.medicalRecords>[0]) =>
      unwrap(window.api.pets.medicalRecords(input)),
    createMedicalRecord: (
      input: Parameters<typeof window.api.pets.createMedicalRecord>[0]
    ) => unwrap(window.api.pets.createMedicalRecord(input)),
    weightHistory: (input: Parameters<typeof window.api.pets.weightHistory>[0]) =>
      unwrap(window.api.pets.weightHistory(input)),
    upcomingVaccines: () => unwrap(window.api.pets.upcomingVaccines())
  },
  inventory: {
    listCategories: (
      input: Parameters<typeof window.api.inventory.listCategories>[0]
    ) => unwrap(window.api.inventory.listCategories(input)),
    createCategory: (
      input: Parameters<typeof window.api.inventory.createCategory>[0]
    ) => unwrap(window.api.inventory.createCategory(input)),
    updateCategory: (
      input: Parameters<typeof window.api.inventory.updateCategory>[0]
    ) => unwrap(window.api.inventory.updateCategory(input)),
    setCategoryActive: (
      input: Parameters<typeof window.api.inventory.setCategoryActive>[0]
    ) => unwrap(window.api.inventory.setCategoryActive(input)),
    listProducts: (input: Parameters<typeof window.api.inventory.listProducts>[0]) =>
      unwrap(window.api.inventory.listProducts(input)),
    getProduct: (input: Parameters<typeof window.api.inventory.getProduct>[0]) =>
      unwrap(window.api.inventory.getProduct(input)),
    createProduct: (input: Parameters<typeof window.api.inventory.createProduct>[0]) =>
      unwrap(window.api.inventory.createProduct(input)),
    updateProduct: (input: Parameters<typeof window.api.inventory.updateProduct>[0]) =>
      unwrap(window.api.inventory.updateProduct(input)),
    setProductActive: (
      input: Parameters<typeof window.api.inventory.setProductActive>[0]
    ) => unwrap(window.api.inventory.setProductActive(input)),
    listBatches: (input: Parameters<typeof window.api.inventory.listBatches>[0]) =>
      unwrap(window.api.inventory.listBatches(input)),
    listExpiring: () => unwrap(window.api.inventory.listExpiring()),
    listMovements: (
      input: Parameters<typeof window.api.inventory.listMovements>[0]
    ) => unwrap(window.api.inventory.listMovements(input)),
    summary: () => unwrap(window.api.inventory.summary()),
    registerEntry: (
      input: Parameters<typeof window.api.inventory.registerEntry>[0]
    ) => unwrap(window.api.inventory.registerEntry(input)),
    adjustStock: (input: Parameters<typeof window.api.inventory.adjustStock>[0]) =>
      unwrap(window.api.inventory.adjustStock(input)),
    exportCsv: () => unwrap(window.api.inventory.exportCsv())
  },
  sales: {
    create: (input: Parameters<typeof window.api.sales.create>[0]) =>
      unwrap(window.api.sales.create(input)),
    list: (input: Parameters<typeof window.api.sales.list>[0]) =>
      unwrap(window.api.sales.list(input)),
    get: (input: Parameters<typeof window.api.sales.get>[0]) =>
      unwrap(window.api.sales.get(input)),
    cancel: (input: Parameters<typeof window.api.sales.cancel>[0]) =>
      unwrap(window.api.sales.cancel(input)),
    summary: () => unwrap(window.api.sales.summary())
  },
  app: {
    info: () => unwrap(window.api.app.info())
  }
}
