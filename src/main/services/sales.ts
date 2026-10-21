import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type {
  CancelSaleInput,
  CreateSaleInput,
  ListSalesInput
} from '@shared/schemas'
import type {
  PaymentMethod,
  SaleBatchAllocation,
  SaleDetail,
  SaleItemRecord,
  SaleListRecord,
  SalePaymentRecord,
  SalesSummary
} from '@shared/types'
import { consumeBatchesFefo } from './inventory'

interface SaleRow {
  id: number
  number: string
  client_id: number | null
  client_name: string | null
  pet_id: number | null
  pet_name: string | null
  user_id: number | null
  user_name: string | null
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  payment_method: PaymentMethod
  status: SaleListRecord['status']
  notes: string | null
  item_count: number
  created_at: string
  cancelled_at: string | null
  cancelled_by_name: string | null
  cancel_reason: string | null
}

interface SaleItemRow {
  id: number
  sale_id: number
  product_id: number | null
  service_id: number | null
  description: string
  product_unit: string | null
  quantity: number
  unit_price_cents: number
  discount_cents: number
  line_total_cents: number
}

interface AllocationRow {
  batch_id: number
  batch_code: string | null
  expiry_date: string | null
  quantity: number
}

interface PaymentRow {
  id: number
  method: PaymentMethod
  amount_cents: number
  created_at: string
}

interface ProductSaleRow {
  id: number
  name: string
  price_cents: number
  cost_cents: number
  stock: number
  active: number
}

const SALE_SELECT = `
  SELECT s.*, c.name AS client_name, p.name AS pet_name, u.name AS user_name,
    uc.name AS cancelled_by_name,
    (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
  FROM sales s
  LEFT JOIN clients c ON c.id = s.client_id
  LEFT JOIN pets p ON p.id = s.pet_id
  LEFT JOIN users u ON u.id = s.user_id
  LEFT JOIN users uc ON uc.id = s.cancelled_by
`

function toSaleRecord(row: SaleRow): SaleListRecord {
  return {
    id: row.id,
    number: row.number,
    clientId: row.client_id,
    clientName: row.client_name,
    petId: row.pet_id,
    petName: row.pet_name,
    userId: row.user_id,
    userName: row.user_name,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    totalCents: row.total_cents,
    paymentMethod: row.payment_method,
    status: row.status,
    notes: row.notes,
    itemCount: row.item_count,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    cancelledByName: row.cancelled_by_name,
    cancelReason: row.cancel_reason
  }
}

function toSaleItemRecord(row: SaleItemRow): SaleItemRecord {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    serviceId: row.service_id,
    description: row.description,
    productUnit: row.product_unit,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    discountCents: row.discount_cents,
    lineTotalCents: row.line_total_cents,
    allocations: []
  }
}

function getSaleRow(db: Database.Database, id: number): SaleRow | undefined {
  return db
    .prepare(`${SALE_SELECT} WHERE s.id = ?`)
    .get(id) as SaleRow | undefined
}

function listAllocations(
  db: Database.Database,
  saleItemId: number
): SaleBatchAllocation[] {
  const rows = db
    .prepare(
      `SELECT a.batch_id, b.batch_code, b.expiry_date, a.quantity
       FROM sale_batch_allocations a
       JOIN product_batches b ON b.id = a.batch_id
       WHERE a.sale_item_id = ?
       ORDER BY a.id`
    )
    .all(saleItemId) as AllocationRow[]

  return rows.map((row) => ({
    batchId: row.batch_id,
    batchCode: row.batch_code,
    expiryDate: row.expiry_date,
    quantity: row.quantity
  }))
}

function listSaleItems(db: Database.Database, saleId: number): SaleItemRecord[] {
  const rows = db
    .prepare(
      `SELECT si.*, p.unit AS product_unit
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?
       ORDER BY si.id`
    )
    .all(saleId) as SaleItemRow[]

  return rows.map((row) => ({
    ...toSaleItemRecord(row),
    allocations: listAllocations(db, row.id)
  }))
}

function listSalePayments(db: Database.Database, saleId: number): SalePaymentRecord[] {
  const rows = db
    .prepare(
      `SELECT id, method, amount_cents, created_at
       FROM sale_payments
       WHERE sale_id = ?
       ORDER BY id`
    )
    .all(saleId) as PaymentRow[]

  return rows.map((row) => ({
    id: row.id,
    method: row.method,
    amountCents: row.amount_cents,
    createdAt: row.created_at
  }))
}

function getSaleRowOrThrow(db: Database.Database, id: number): SaleRow {
  const row = getSaleRow(db, id)

  if (!row) {
    throw new AppError('NOT_FOUND', 'La venta no existe')
  }

  return row
}

function resolveClientAndPet(
  db: Database.Database,
  clientId: number | null,
  petId: number | null
): { clientId: number | null; petId: number | null } {
  let resolvedClientId = clientId

  if (clientId !== null) {
    const client = db
      .prepare('SELECT id, active FROM clients WHERE id = ?')
      .get(clientId) as { id: number; active: number } | undefined

    if (!client) {
      throw new AppError('NOT_FOUND', 'El cliente no existe')
    }

    if (client.active === 0) {
      throw new AppError('CONFLICT', 'El cliente está inactivo')
    }
  }

  if (petId !== null) {
    const pet = db
      .prepare('SELECT id, client_id, active FROM pets WHERE id = ?')
      .get(petId) as { id: number; client_id: number; active: number } | undefined

    if (!pet) {
      throw new AppError('NOT_FOUND', 'La mascota no existe')
    }

    if (pet.active === 0) {
      throw new AppError('CONFLICT', 'La mascota está inactiva')
    }

    if (resolvedClientId === null) {
      resolvedClientId = pet.client_id
    } else if (resolvedClientId !== pet.client_id) {
      throw new AppError('CONFLICT', 'La mascota no pertenece al cliente seleccionado')
    }
  }

  return { clientId: resolvedClientId, petId }
}

export function createSale(
  db: Database.Database,
  input: CreateSaleInput,
  userId: number
): SaleDetail {
  const { clientId, petId } = resolveClientAndPet(db, input.clientId, input.petId)
  const normalizedItems = new Map<
    number,
    { productId: number; quantity: number; discountCents: number }
  >()

  for (const item of input.items) {
    const current = normalizedItems.get(item.productId)

    if (current) {
      current.quantity += item.quantity
      current.discountCents += item.discountCents
    } else {
      normalizedItems.set(item.productId, { ...item })
    }
  }

  const items = [...normalizedItems.values()].map((item) => {
    const product = db
      .prepare(
        `SELECT id, name, price_cents, cost_cents, stock, active
         FROM products WHERE id = ?`
      )
      .get(item.productId) as ProductSaleRow | undefined

    if (!product) {
      throw new AppError('NOT_FOUND', 'Uno de los productos no existe')
    }

    if (product.active === 0) {
      throw new AppError('CONFLICT', `${product.name} está inactivo`)
    }

    if (product.stock < item.quantity) {
      throw new AppError('CONFLICT', `Stock insuficiente de ${product.name}`)
    }

    const grossCents = Math.round(product.price_cents * item.quantity)

    if (item.discountCents > grossCents) {
      throw new AppError(
        'CONFLICT',
        `El descuento de ${product.name} supera el total de la línea`
      )
    }

    return {
      product,
      quantity: item.quantity,
      discountCents: item.discountCents,
      grossCents,
      lineTotalCents: grossCents - item.discountCents
    }
  })

  const subtotalCents = items.reduce((total, item) => total + item.grossCents, 0)
  const lineDiscounts = items.reduce(
    (total, item) => total + item.discountCents,
    0
  )

  if (input.discountCents > subtotalCents - lineDiscounts) {
    throw new AppError('CONFLICT', 'El descuento supera el total de la venta')
  }

  const discountCents = lineDiscounts + input.discountCents
  const totalCents = subtotalCents - discountCents
  const now = new Date().toISOString()
  let saleId = 0
  let saleNumber = ''

  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO sales
          (number, client_id, pet_id, user_id, subtotal_cents, discount_cents,
           total_cents, payment_method, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completada', ?, ?)`
      )
      .run(
        `PEND-${randomUUID()}`,
        clientId,
        petId,
        userId,
        subtotalCents,
        discountCents,
        totalCents,
        input.paymentMethod,
        input.notes,
        now
      )

    saleId = Number(result.lastInsertRowid)
    saleNumber = `V-${String(saleId).padStart(6, '0')}`
    db.prepare('UPDATE sales SET number = ? WHERE id = ?').run(saleNumber, saleId)

    for (const item of items) {
      const consumed = consumeBatchesFefo(db, item.product.id, item.quantity)
      const itemResult = db
        .prepare(
          `INSERT INTO sale_items
            (sale_id, product_id, service_id, description, quantity,
             unit_price_cents, discount_cents, line_total_cents)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`
        )
        .run(
          saleId,
          item.product.id,
          item.product.name,
          item.quantity,
          item.product.price_cents,
          item.discountCents,
          item.lineTotalCents
        )
      const saleItemId = Number(itemResult.lastInsertRowid)

      for (const batch of consumed) {
        db.prepare(
          `INSERT INTO sale_batch_allocations (sale_item_id, batch_id, quantity)
           VALUES (?, ?, ?)`
        ).run(saleItemId, batch.batchId, batch.quantity)

        db.prepare(
          `INSERT INTO stock_movements
            (product_id, batch_id, type, quantity_delta, unit_cost_cents, reason,
             reference_type, reference_id, user_id, created_at)
           VALUES (?, ?, 'venta', ?, ?, ?, 'sale', ?, ?, ?)`
        ).run(
          item.product.id,
          batch.batchId,
          -batch.quantity,
          item.product.cost_cents,
          `Venta ${saleNumber}`,
          saleId,
          userId,
          now
        )
      }

      db.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?'
      ).run(item.quantity, now, item.product.id)
    }

    db.prepare(
      `INSERT INTO sale_payments (sale_id, method, amount_cents, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(saleId, input.paymentMethod, totalCents, now)
  })

  create()

  return getSaleDetail(db, saleId)
}

export interface ServiceSaleInput {
  clientId: number
  petId: number
  paymentMethod: PaymentMethod
  notes: string | null
  items: Array<{
    serviceId: number
    name: string
    priceCents: number
  }>
}

export function createServiceSale(
  db: Database.Database,
  input: ServiceSaleInput,
  userId: number
): SaleDetail {
  if (input.items.length === 0) {
    throw new AppError('CONFLICT', 'El turno no tiene servicios para cobrar')
  }

  const { clientId, petId } = resolveClientAndPet(db, input.clientId, input.petId)
  const subtotalCents = input.items.reduce(
    (total, item) => total + item.priceCents,
    0
  )
  const now = new Date().toISOString()
  let saleId = 0
  let saleNumber = ''

  const create = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO sales
          (number, client_id, pet_id, user_id, subtotal_cents, discount_cents,
           total_cents, payment_method, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'completada', ?, ?)`
      )
      .run(
        `PEND-${randomUUID()}`,
        clientId,
        petId,
        userId,
        subtotalCents,
        subtotalCents,
        input.paymentMethod,
        input.notes,
        now
      )

    saleId = Number(result.lastInsertRowid)
    saleNumber = `V-${String(saleId).padStart(6, '0')}`
    db.prepare('UPDATE sales SET number = ? WHERE id = ?').run(saleNumber, saleId)

    for (const item of input.items) {
      db.prepare(
        `INSERT INTO sale_items
          (sale_id, product_id, service_id, description, quantity,
           unit_price_cents, discount_cents, line_total_cents)
         VALUES (?, NULL, ?, ?, 1, ?, 0, ?)`
      ).run(
        saleId,
        item.serviceId,
        item.name,
        item.priceCents,
        item.priceCents
      )
    }

    db.prepare(
      `INSERT INTO sale_payments (sale_id, method, amount_cents, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(saleId, input.paymentMethod, subtotalCents, now)
  })

  create()

  return getSaleDetail(db, saleId)
}

export function listSales(
  db: Database.Database,
  input: ListSalesInput
): SaleListRecord[] {
  const clauses: string[] = []
  const params: unknown[] = []

  if (input.status !== 'all') {
    clauses.push('s.status = ?')
    params.push(input.status)
  }

  if (input.search) {
    const term = `%${input.search}%`
    clauses.push(
      `(s.number LIKE ? OR c.name LIKE ? OR p.name LIKE ?
        OR EXISTS (SELECT 1 FROM sale_items si
                   WHERE si.sale_id = s.id AND si.description LIKE ?))`
    )
    params.push(term, term, term, term)
  }

  if (input.dateFrom) {
    clauses.push(`date(s.created_at, 'localtime') >= ?`)
    params.push(input.dateFrom)
  }

  if (input.dateTo) {
    clauses.push(`date(s.created_at, 'localtime') <= ?`)
    params.push(input.dateTo)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(
      `${SALE_SELECT} ${where}
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT ?`
    )
    .all(...params, input.limit) as SaleRow[]

  return rows.map(toSaleRecord)
}

export function getSaleDetail(db: Database.Database, id: number): SaleDetail {
  const row = getSaleRowOrThrow(db, id)

  return {
    ...toSaleRecord(row),
    items: listSaleItems(db, id),
    payments: listSalePayments(db, id)
  }
}

export function cancelSale(
  db: Database.Database,
  input: CancelSaleInput,
  userId: number
): SaleDetail {
  const sale = getSaleRowOrThrow(db, input.id)

  if (sale.status === 'anulada') {
    throw new AppError('CONFLICT', 'La venta ya está anulada')
  }

  const items = listSaleItems(db, input.id)
  const now = new Date().toISOString()

  const cancel = db.transaction(() => {
    for (const item of items) {
      if (item.productId === null) {
        continue
      }

      const product = db
        .prepare('SELECT cost_cents FROM products WHERE id = ?')
        .get(item.productId) as { cost_cents: number } | undefined
      const unitCostCents = product?.cost_cents ?? null
      let restored = 0

      for (const allocation of item.allocations) {
        db.prepare(
          `UPDATE product_batches
           SET quantity = quantity + ?, updated_at = ?
           WHERE id = ?`
        ).run(allocation.quantity, now, allocation.batchId)

        db.prepare(
          `INSERT INTO stock_movements
            (product_id, batch_id, type, quantity_delta, unit_cost_cents, reason,
             reference_type, reference_id, user_id, created_at)
           VALUES (?, ?, 'anulacion', ?, ?, ?, 'sale', ?, ?, ?)`
        ).run(
          item.productId,
          allocation.batchId,
          allocation.quantity,
          unitCostCents,
          `Anulación de venta ${sale.number}`,
          sale.id,
          userId,
          now
        )

        restored += allocation.quantity
      }

      if (restored < item.quantity) {
        db.prepare(
          `INSERT INTO stock_movements
            (product_id, batch_id, type, quantity_delta, unit_cost_cents, reason,
             reference_type, reference_id, user_id, created_at)
           VALUES (?, NULL, 'anulacion', ?, ?, ?, 'sale', ?, ?, ?)`
        ).run(
          item.productId,
          item.quantity - restored,
          unitCostCents,
          `Anulación de venta ${sale.number}`,
          sale.id,
          userId,
          now
        )
      }

      db.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?'
      ).run(item.quantity, now, item.productId)
    }

    db.prepare(
      `UPDATE sales
       SET status = 'anulada', cancelled_at = ?, cancelled_by = ?,
           cancel_reason = ?
       WHERE id = ?`
    ).run(now, userId, input.reason, input.id)
  })

  cancel()

  return getSaleDetail(db, input.id)
}

export function getSalesSummary(db: Database.Database): SalesSummary {
  const today = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_cents), 0) AS total
       FROM sales
       WHERE status = 'completada'
         AND date(created_at, 'localtime') = date('now', 'localtime')`
    )
    .get() as { count: number; total: number }
  const month = db
    .prepare(
      `SELECT COALESCE(SUM(total_cents), 0) AS total
       FROM sales
       WHERE status = 'completada'
         AND strftime('%Y-%m', created_at, 'localtime') =
             strftime('%Y-%m', 'now', 'localtime')`
    )
    .get() as { total: number }

  return {
    todayCount: today.count,
    todayTotalCents: today.total,
    todayAverageCents: today.count > 0 ? Math.round(today.total / today.count) : 0,
    monthTotalCents: month.total
  }
}
