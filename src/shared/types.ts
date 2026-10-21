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

export interface ProductCategory {
  id: number
  name: string
  active: boolean
  productCount: number
  createdAt: string
}

export interface ProductRecord {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  categoryId: number | null
  categoryName: string | null
  unit: string
  costCents: number
  priceCents: number
  stock: number
  minStock: number
  active: boolean
  notes: string | null
  nextExpiryDate: string | null
  lowStock: boolean
  outOfStock: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductBatch {
  id: number
  productId: number
  batchCode: string | null
  expiryDate: string | null
  quantity: number
  costCents: number
  receivedAt: string
}

export type StockMovementType =
  | 'entrada'
  | 'salida'
  | 'ajuste'
  | 'devolucion'
  | 'venta'
  | 'anulacion'

export interface StockMovement {
  id: number
  productId: number
  productName: string
  batchId: number | null
  batchCode: string | null
  type: StockMovementType
  quantityDelta: number
  unitCostCents: number | null
  reason: string | null
  referenceType: string | null
  referenceId: number | null
  createdByName: string | null
  createdAt: string
}

export interface InventorySummary {
  totalProducts: number
  activeProducts: number
  lowStock: number
  outOfStock: number
  expiring: number
  inventoryValueCents: number
}

export interface ExpiringBatch {
  batchId: number
  productId: number
  productName: string
  categoryName: string | null
  unit: string
  batchCode: string | null
  expiryDate: string
  quantity: number
  costCents: number
  daysUntilExpiry: number
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia'

export type SaleStatus = 'completada' | 'anulada'

export interface SaleListRecord {
  id: number
  number: string
  clientId: number | null
  clientName: string | null
  petId: number | null
  petName: string | null
  userId: number | null
  userName: string | null
  subtotalCents: number
  discountCents: number
  totalCents: number
  paymentMethod: PaymentMethod
  status: SaleStatus
  notes: string | null
  itemCount: number
  createdAt: string
  cancelledAt: string | null
  cancelledByName: string | null
  cancelReason: string | null
}

export interface SaleBatchAllocation {
  batchId: number
  batchCode: string | null
  expiryDate: string | null
  quantity: number
}

export interface SaleItemRecord {
  id: number
  saleId: number
  productId: number | null
  serviceId: number | null
  description: string
  productUnit: string | null
  quantity: number
  unitPriceCents: number
  discountCents: number
  lineTotalCents: number
  allocations: SaleBatchAllocation[]
}

export interface SalePaymentRecord {
  id: number
  method: PaymentMethod
  amountCents: number
  createdAt: string
}

export interface SaleDetail extends SaleListRecord {
  items: SaleItemRecord[]
  payments: SalePaymentRecord[]
}

export interface SalesSummary {
  todayCount: number
  todayTotalCents: number
  todayAverageCents: number
  monthTotalCents: number
}
