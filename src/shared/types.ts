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

export type ServiceCategory = 'peluqueria' | 'consulta' | 'otro'

export interface ServiceRecord {
  id: number
  name: string
  category: ServiceCategory
  priceCents: number
  durationMinutes: number
  active: boolean
  createdAt: string
}

export interface GroomerRecord {
  id: number
  name: string
  phone: string | null
  color: string
  active: boolean
  createdAt: string
}

export type AppointmentStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_proceso'
  | 'completado'
  | 'cancelado'
  | 'no_asistio'

export interface AppointmentServiceRecord {
  id: number
  serviceId: number | null
  name: string
  priceCents: number
  durationMinutes: number
}

export interface AppointmentRecord {
  id: number
  clientId: number
  clientName: string
  clientPhone: string | null
  petId: number
  petName: string
  groomerId: number | null
  groomerName: string | null
  groomerColor: string | null
  date: string
  startMinutes: number
  endMinutes: number
  durationMinutes: number
  totalCents: number
  status: AppointmentStatus
  notes: string | null
  saleId: number | null
  saleNumber: string | null
  saleStatus: SaleStatus | null
  services: AppointmentServiceRecord[]
  createdAt: string
  updatedAt: string
}

export interface AppointmentSummary {
  todayCount: number
  activeCount: number
}

export interface ChargeAppointmentResult {
  appointment: AppointmentRecord
  sale: SaleDetail
}

export interface BusinessSettings {
  name: string
  address: string
  phone: string
  email: string
  currency: string
  openDays: string[]
  openTime: string
  closeTime: string
  slotMinutes: number
  expiryAlertDays: number
  vaccineAlertDays: number
  whatsappTemplate: string
  backupEnabled: boolean
  backupFolder: string
  backupRetention: number
  lastBackupAt: string
}

export interface RolePermissionsRecord {
  role: Role
  permissions: PermissionModule[]
}

export interface ActivityRecord {
  id: number
  userId: number | null
  userName: string | null
  action: string
  entityType: string | null
  entityId: number | null
  details: string | null
  createdAt: string
}

export interface BackupRecord {
  fileName: string
  filePath: string
  sizeBytes: number
  createdAt: string
}

export interface TopSellingItem {
  name: string
  quantity: number
  totalCents: number
}

export interface DailySales {
  date: string
  count: number
  totalCents: number
}

export interface PaymentBreakdown {
  method: PaymentMethod
  count: number
  totalCents: number
}

export interface ReportData {
  dateFrom: string
  dateTo: string
  salesCount: number
  cancelledSalesCount: number
  grossSalesCents: number
  discountsCents: number
  netSalesCents: number
  averageTicketCents: number
  productRevenueCents: number
  serviceRevenueCents: number
  completedAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
  topProducts: TopSellingItem[]
  topServices: TopSellingItem[]
  salesByDay: DailySales[]
  paymentBreakdown: PaymentBreakdown[]
  inventoryCostCents: number
  inventoryRetailCents: number
  lowStockCount: number
  outOfStockCount: number
}
