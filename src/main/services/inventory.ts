import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type {
  CreateCategoryInput,
  CreateProductInput,
  ListCategoriesInput,
  ListProductsInput,
  ListStockMovementsInput,
  SetActiveInput,
  StockAdjustmentInput,
  StockEntryInput,
  UpdateCategoryInput,
  UpdateProductInput
} from '@shared/schemas'
import type {
  ExpiringBatch,
  InventorySummary,
  ProductBatch,
  ProductCategory,
  ProductRecord,
  StockMovement
} from '@shared/types'
import { getSetting } from './settings'

interface CategoryRow {
  id: number
  name: string
  active: number
  created_at: string
  product_count: number
}

interface ProductRow {
  id: number
  name: string
  sku: string | null
  barcode: string | null
  category_id: number | null
  category_name: string | null
  unit: string
  cost_cents: number
  price_cents: number
  stock: number
  min_stock: number
  active: number
  notes: string | null
  next_expiry_date: string | null
  created_at: string
  updated_at: string
}

interface BatchRow {
  id: number
  product_id: number
  batch_code: string | null
  expiry_date: string | null
  quantity: number
  cost_cents: number
  received_at: string
}

interface MovementRow {
  id: number
  product_id: number
  product_name: string
  batch_id: number | null
  batch_code: string | null
  type: StockMovement['type']
  quantity_delta: number
  unit_cost_cents: number | null
  reason: string | null
  reference_type: string | null
  reference_id: number | null
  created_by_name: string | null
  created_at: string
}

const CATEGORY_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
  FROM product_categories c
`

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS category_name,
    (SELECT MIN(b.expiry_date) FROM product_batches b
     WHERE b.product_id = p.id AND b.quantity > 0 AND b.expiry_date IS NOT NULL
    ) AS next_expiry_date
  FROM products p
  LEFT JOIN product_categories c ON c.id = p.category_id
`

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function shiftIsoDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function daysUntil(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - today) / 86_400_000)
}

function getExpiryWindowDays(db: Database.Database): number {
  const raw = Number(getSetting(db, 'alerts.expiry_days', '60'))

  if (!Number.isFinite(raw)) {
    return 60
  }

  return Math.min(Math.max(Math.trunc(raw), 1), 3650)
}

function toCategoryRecord(row: CategoryRow): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    active: row.active === 1,
    productCount: row.product_count,
    createdAt: row.created_at
  }
}

function toProductRecord(row: ProductRow): ProductRecord {
  const active = row.active === 1

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    categoryId: row.category_id,
    categoryName: row.category_name,
    unit: row.unit,
    costCents: row.cost_cents,
    priceCents: row.price_cents,
    stock: row.stock,
    minStock: row.min_stock,
    active,
    notes: row.notes,
    nextExpiryDate: row.next_expiry_date,
    lowStock: active && row.min_stock > 0 && row.stock <= row.min_stock,
    outOfStock: active && row.stock <= 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function toBatchRecord(row: BatchRow): ProductBatch {
  return {
    id: row.id,
    productId: row.product_id,
    batchCode: row.batch_code,
    expiryDate: row.expiry_date,
    quantity: row.quantity,
    costCents: row.cost_cents,
    receivedAt: row.received_at
  }
}

function toMovementRecord(row: MovementRow): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    batchId: row.batch_id,
    batchCode: row.batch_code,
    type: row.type,
    quantityDelta: row.quantity_delta,
    unitCostCents: row.unit_cost_cents,
    reason: row.reason,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at
  }
}

function getCategoryRow(
  db: Database.Database,
  id: number
): CategoryRow | undefined {
  return db
    .prepare(`${CATEGORY_SELECT} WHERE c.id = ?`)
    .get(id) as CategoryRow | undefined
}

function getProductRow(
  db: Database.Database,
  id: number
): ProductRow | undefined {
  return db
    .prepare(`${PRODUCT_SELECT} WHERE p.id = ?`)
    .get(id) as ProductRow | undefined
}

function categoryNameTaken(
  db: Database.Database,
  name: string,
  excludeId?: number
): boolean {
  const row = db
    .prepare(
      `SELECT id FROM product_categories
       WHERE name = ? COLLATE NOCASE AND (? IS NULL OR id <> ?)`
    )
    .get(name, excludeId ?? null, excludeId ?? null) as { id: number } | undefined

  return Boolean(row)
}

function productCodeTaken(
  db: Database.Database,
  column: 'sku' | 'barcode',
  value: string,
  excludeId?: number
): boolean {
  const row = db
    .prepare(
      `SELECT id FROM products
       WHERE ${column} = ? COLLATE NOCASE AND (? IS NULL OR id <> ?)`
    )
    .get(value, excludeId ?? null, excludeId ?? null) as { id: number } | undefined

  return Boolean(row)
}

function assertProductCodesAvailable(
  db: Database.Database,
  input: Pick<CreateProductInput, 'sku' | 'barcode'>,
  excludeId?: number
): void {
  if (input.sku && productCodeTaken(db, 'sku', input.sku, excludeId)) {
    throw new AppError('CONFLICT', 'Ese SKU ya está en uso')
  }

  if (input.barcode && productCodeTaken(db, 'barcode', input.barcode, excludeId)) {
    throw new AppError('CONFLICT', 'Ese código de barras ya está en uso')
  }
}

function assertCategoryExists(
  db: Database.Database,
  categoryId: number | null
): void {
  if (categoryId === null) {
    return
  }

  if (!db.prepare('SELECT id FROM product_categories WHERE id = ?').get(categoryId)) {
    throw new AppError('NOT_FOUND', 'La categoría no existe')
  }
}

export function listCategories(
  db: Database.Database,
  input: ListCategoriesInput
): ProductCategory[] {
  const where = input.includeInactive ? '' : 'WHERE c.active = 1'
  const rows = db
    .prepare(`${CATEGORY_SELECT} ${where} ORDER BY c.active DESC, c.name COLLATE NOCASE`)
    .all() as CategoryRow[]

  return rows.map(toCategoryRecord)
}

export function createCategory(
  db: Database.Database,
  input: CreateCategoryInput
): ProductCategory {
  if (categoryNameTaken(db, input.name)) {
    throw new AppError('CONFLICT', 'Esa categoría ya existe')
  }

  const result = db
    .prepare(
      `INSERT INTO product_categories (name, active, created_at)
       VALUES (?, 1, ?)`
    )
    .run(input.name, new Date().toISOString())

  const created = getCategoryRow(db, Number(result.lastInsertRowid))

  if (!created) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo crear la categoría')
  }

  return toCategoryRecord(created)
}

export function updateCategory(
  db: Database.Database,
  input: UpdateCategoryInput
): ProductCategory {
  if (!getCategoryRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'La categoría no existe')
  }

  if (categoryNameTaken(db, input.name, input.id)) {
    throw new AppError('CONFLICT', 'Esa categoría ya existe')
  }

  db.prepare('UPDATE product_categories SET name = ? WHERE id = ?').run(
    input.name,
    input.id
  )

  const updated = getCategoryRow(db, input.id)

  if (!updated) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo actualizar la categoría')
  }

  return toCategoryRecord(updated)
}

export function setCategoryActive(
  db: Database.Database,
  input: SetActiveInput
): ProductCategory {
  if (!getCategoryRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'La categoría no existe')
  }

  db.prepare('UPDATE product_categories SET active = ? WHERE id = ?').run(
    input.active ? 1 : 0,
    input.id
  )

  const updated = getCategoryRow(db, input.id)

  if (!updated) {
    throw new AppError('INTERNAL_ERROR', 'No se pudo actualizar la categoría')
  }

  return toCategoryRecord(updated)
}

export function listProducts(
  db: Database.Database,
  input: ListProductsInput
): ProductRecord[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (!input.includeInactive) {
    clauses.push('p.active = 1')
  }

  if (input.categoryId !== null) {
    clauses.push('p.category_id = ?')
    params.push(input.categoryId)
  }

  if (input.search) {
    const term = `%${input.search}%`
    clauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)')
    params.push(term, term, term)
  }

  if (input.stockFilter === 'low') {
    clauses.push('p.min_stock > 0 AND p.stock <= p.min_stock')
  }

  if (input.stockFilter === 'out') {
    clauses.push('p.stock <= 0')
  }

  if (input.stockFilter === 'expiring') {
    clauses.push(
      `EXISTS (SELECT 1 FROM product_batches b
       WHERE b.product_id = p.id AND b.quantity > 0
         AND b.expiry_date IS NOT NULL AND b.expiry_date <= ?)`
    )
    params.push(shiftIsoDate(getExpiryWindowDays(db)))
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `${PRODUCT_SELECT} ${where}
       ORDER BY p.active DESC, p.name COLLATE NOCASE`
    )
    .all(...params) as ProductRow[]

  return rows.map(toProductRecord)
}

export function getProduct(db: Database.Database, id: number): ProductRecord {
  const row = getProductRow(db, id)

  if (!row) {
    throw new AppError('NOT_FOUND', 'El producto no existe')
  }

  return toProductRecord(row)
}

export function createProduct(
  db: Database.Database,
  input: CreateProductInput
): ProductRecord {
  assertProductCodesAvailable(db, input)
  assertCategoryExists(db, input.categoryId)

  const now = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO products
        (name, sku, barcode, category_id, unit, cost_cents, price_cents, stock,
         min_stock, active, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?, ?, ?)`
    )
    .run(
      input.name,
      input.sku,
      input.barcode,
      input.categoryId,
      input.unit,
      input.costCents,
      input.priceCents,
      input.minStock,
      input.notes,
      now,
      now
    )

  return getProduct(db, Number(result.lastInsertRowid))
}

export function updateProduct(
  db: Database.Database,
  input: UpdateProductInput
): ProductRecord {
  if (!getProductRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El producto no existe')
  }

  assertProductCodesAvailable(db, input, input.id)
  assertCategoryExists(db, input.categoryId)

  db.prepare(
    `UPDATE products
     SET name = ?, sku = ?, barcode = ?, category_id = ?, unit = ?,
         cost_cents = ?, price_cents = ?, min_stock = ?, notes = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    input.name,
    input.sku,
    input.barcode,
    input.categoryId,
    input.unit,
    input.costCents,
    input.priceCents,
    input.minStock,
    input.notes,
    new Date().toISOString(),
    input.id
  )

  return getProduct(db, input.id)
}

export function setProductActive(
  db: Database.Database,
  input: SetActiveInput
): ProductRecord {
  if (!getProductRow(db, input.id)) {
    throw new AppError('NOT_FOUND', 'El producto no existe')
  }

  db.prepare('UPDATE products SET active = ?, updated_at = ? WHERE id = ?').run(
    input.active ? 1 : 0,
    new Date().toISOString(),
    input.id
  )

  return getProduct(db, input.id)
}

export function listProductBatches(
  db: Database.Database,
  productId: number
): ProductBatch[] {
  if (!getProductRow(db, productId)) {
    throw new AppError('NOT_FOUND', 'El producto no existe')
  }

  const rows = db
    .prepare(
      `SELECT * FROM product_batches
       WHERE product_id = ?
       ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
                expiry_date, received_at, id`
    )
    .all(productId) as BatchRow[]

  return rows.map(toBatchRecord)
}

export function listStockMovements(
  db: Database.Database,
  input: ListStockMovementsInput
): StockMovement[] {
  const where = input.productId === null ? '' : 'WHERE m.product_id = ?'
  const params: unknown[] = input.productId === null ? [] : [input.productId]
  params.push(input.limit)

  const rows = db
    .prepare(
      `SELECT m.*, p.name AS product_name, b.batch_code, u.name AS created_by_name
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN product_batches b ON b.id = m.batch_id
       LEFT JOIN users u ON u.id = m.user_id
       ${where}
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT ?`
    )
    .all(...params) as MovementRow[]

  return rows.map(toMovementRecord)
}

function insertMovement(
  db: Database.Database,
  input: {
    productId: number
    batchId: number | null
    type: StockMovement['type']
    quantityDelta: number
    unitCostCents: number | null
    reason: string | null
    userId: number
  }
): void {
  db.prepare(
    `INSERT INTO stock_movements
      (product_id, batch_id, type, quantity_delta, unit_cost_cents, reason,
       reference_type, reference_id, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`
  ).run(
    input.productId,
    input.batchId,
    input.type,
    input.quantityDelta,
    input.unitCostCents,
    input.reason,
    input.userId,
    new Date().toISOString()
  )
}

export function registerStockEntry(
  db: Database.Database,
  input: StockEntryInput,
  userId: number
): ProductRecord {
  const product = getProductRow(db, input.productId)

  if (!product) {
    throw new AppError('NOT_FOUND', 'El producto no existe')
  }

  if (product.active === 0) {
    throw new AppError('CONFLICT', 'Reactivá el producto antes de cargar stock')
  }

  const now = new Date().toISOString()
  const entry = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO product_batches
          (product_id, batch_code, expiry_date, quantity, cost_cents, received_at,
           created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.productId,
        input.batchCode,
        input.expiryDate,
        input.quantity,
        input.costCents,
        now,
        now,
        now
      )

    db.prepare(
      `UPDATE products
       SET stock = stock + ?, cost_cents = ?, updated_at = ?
       WHERE id = ?`
    ).run(input.quantity, input.costCents, now, input.productId)

    insertMovement(db, {
      productId: input.productId,
      batchId: Number(result.lastInsertRowid),
      type: 'entrada',
      quantityDelta: input.quantity,
      unitCostCents: input.costCents,
      reason: input.reason ?? 'Entrada de stock',
      userId
    })
  })

  entry()

  return getProduct(db, input.productId)
}

function consumeBatchesFefo(
  db: Database.Database,
  productId: number,
  quantity: number
): void {
  const batches = db
    .prepare(
      `SELECT * FROM product_batches
       WHERE product_id = ? AND quantity > 0
       ORDER BY CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
                expiry_date, received_at, id`
    )
    .all(productId) as BatchRow[]

  let remaining = quantity
  const now = new Date().toISOString()

  for (const batch of batches) {
    if (remaining <= 0) {
      break
    }

    const taken = Math.min(batch.quantity, remaining)
    const nextQuantity = batch.quantity - taken

    db.prepare(
      `UPDATE product_batches SET quantity = ?, updated_at = ? WHERE id = ?`
    ).run(nextQuantity === 0 ? 0 : nextQuantity, now, batch.id)

    remaining -= taken
  }

  if (remaining > 0) {
    throw new AppError(
      'CONFLICT',
      'El stock por lotes no coincide con el stock del producto'
    )
  }
}

export function adjustStock(
  db: Database.Database,
  input: StockAdjustmentInput,
  userId: number
): ProductRecord {
  const product = getProductRow(db, input.productId)

  if (!product) {
    throw new AppError('NOT_FOUND', 'El producto no existe')
  }

  if (product.active === 0) {
    throw new AppError('CONFLICT', 'Reactivá el producto antes de ajustar stock')
  }

  if (product.stock + input.quantityDelta < 0) {
    throw new AppError('CONFLICT', 'El ajuste dejaría el stock en negativo')
  }

  const now = new Date().toISOString()
  let batchId: number | null = null

  const adjustment = db.transaction(() => {
    if (input.quantityDelta > 0) {
      const genericBatch = db
        .prepare(
          `SELECT * FROM product_batches
           WHERE product_id = ? AND batch_code IS NULL AND expiry_date IS NULL
           ORDER BY id LIMIT 1`
        )
        .get(input.productId) as BatchRow | undefined

      if (genericBatch) {
        batchId = genericBatch.id
        db.prepare(
          `UPDATE product_batches
           SET quantity = quantity + ?, cost_cents = ?, updated_at = ?
           WHERE id = ?`
        ).run(input.quantityDelta, product.cost_cents, now, genericBatch.id)
      } else {
        const result = db
          .prepare(
            `INSERT INTO product_batches
              (product_id, batch_code, expiry_date, quantity, cost_cents,
               received_at, created_at, updated_at)
             VALUES (?, NULL, NULL, ?, ?, ?, ?, ?)`
          )
          .run(input.productId, input.quantityDelta, product.cost_cents, now, now, now)
        batchId = Number(result.lastInsertRowid)
      }
    } else {
      consumeBatchesFefo(db, input.productId, Math.abs(input.quantityDelta))
    }

    db.prepare(
      'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?'
    ).run(input.quantityDelta, now, input.productId)

    insertMovement(db, {
      productId: input.productId,
      batchId,
      type: 'ajuste',
      quantityDelta: input.quantityDelta,
      unitCostCents: product.cost_cents,
      reason: input.reason,
      userId
    })
  })

  adjustment()

  return getProduct(db, input.productId)
}

export function listExpiringBatches(db: Database.Database): ExpiringBatch[] {
  const cutoff = shiftIsoDate(getExpiryWindowDays(db))
  const rows = db
    .prepare(
      `SELECT b.*, p.name AS product_name, p.unit AS product_unit,
              c.name AS category_name
       FROM product_batches b
       JOIN products p ON p.id = b.product_id
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE b.quantity > 0 AND b.expiry_date IS NOT NULL
          AND p.active = 1 AND b.expiry_date <= ?
        ORDER BY b.expiry_date, p.name COLLATE NOCASE`
    )
    .all(cutoff) as Array<
    BatchRow & {
      product_name: string
      product_unit: string
      category_name: string | null
    }
  >

  return rows.map((row) => ({
    batchId: row.id,
    productId: row.product_id,
    productName: row.product_name,
    categoryName: row.category_name,
    unit: row.product_unit,
    batchCode: row.batch_code,
    expiryDate: row.expiry_date ?? todayIso(),
    quantity: row.quantity,
    costCents: row.cost_cents,
    daysUntilExpiry: row.expiry_date ? daysUntil(row.expiry_date) : 0
  }))
}

export function getInventorySummary(db: Database.Database): InventorySummary {
  const activeProducts = listProducts(db, {
    search: '',
    categoryId: null,
    includeInactive: false,
    stockFilter: 'all'
  })
  const expiringProducts = new Set(
    listExpiringBatches(db).map((batch) => batch.productId)
  )
  const totalRow = db.prepare('SELECT COUNT(*) AS count FROM products').get() as {
    count: number
  }

  return {
    totalProducts: totalRow.count,
    activeProducts: activeProducts.length,
    lowStock: activeProducts.filter((product) => product.lowStock).length,
    outOfStock: activeProducts.filter((product) => product.outOfStock).length,
    expiring: expiringProducts.size,
    inventoryValueCents: activeProducts.reduce(
      (total, product) => total + Math.round(product.stock * product.costCents),
      0
    )
  }
}

function csvCell(value: string | number | null): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function buildInventoryCsv(db: Database.Database): string {
  const products = listProducts(db, {
    search: '',
    categoryId: null,
    includeInactive: true,
    stockFilter: 'all'
  })
  const header = [
    'Nombre',
    'SKU',
    'Código de barras',
    'Categoría',
    'Unidad',
    'Stock',
    'Stock mínimo',
    'Costo',
    'Precio',
    'Estado',
    'Próximo vencimiento'
  ]
  const rows = products.map((product) => [
    product.name,
    product.sku,
    product.barcode,
    product.categoryName,
    product.unit,
    product.stock,
    product.minStock,
    (product.costCents / 100).toFixed(2),
    (product.priceCents / 100).toFixed(2),
    product.active ? 'Activo' : 'Inactivo',
    product.nextExpiryDate
  ])
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','))

  return `\ufeff${lines.join('\r\n')}`
}
