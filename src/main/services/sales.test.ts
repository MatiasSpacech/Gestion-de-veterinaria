import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import type { CreateProductInput, CreateSaleInput } from '@shared/schemas'
import { createDatabase } from '@main/db/connection'
import {
  createProduct,
  listProductBatches,
  listProducts,
  listStockMovements,
  registerStockEntry,
  setProductActive
} from './inventory'
import {
  cancelSale,
  createSale,
  getSaleDetail,
  getSalesSummary,
  listSales
} from './sales'

function dateOffset(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

function expectAppError(callback: () => void, code: string): void {
  try {
    callback()
    throw new Error('Se esperaba un AppError')
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)

    if (error instanceof AppError) {
      expect(error.code).toBe(code)
    }
  }
}

const baseProduct: CreateProductInput = {
  name: 'Alimento Premium',
  sku: 'ALI-001',
  barcode: null,
  categoryId: null,
  unit: 'unidad',
  costCents: 100000,
  priceCents: 150000,
  minStock: 2,
  notes: null
}

describe('ventas', () => {
  let database: Database.Database
  let tempDirectory: string
  let productId: number

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-sales-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
    const now = new Date().toISOString()
    database
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, ?, ?)`
      )
      .run('Vendedor de prueba', 'admin', 'hash', now, now)

    const product = createProduct(database, baseProduct)
    productId = product.id
    registerStockEntry(
      database,
      {
        productId,
        quantity: 5,
        costCents: 100000,
        batchCode: 'LOTE-PRIMERO',
        expiryDate: dateOffset(10),
        reason: null
      },
      1
    )
    registerStockEntry(
      database,
      {
        productId,
        quantity: 5,
        costCents: 100000,
        batchCode: 'LOTE-SEGUNDO',
        expiryDate: dateOffset(40),
        reason: null
      },
      1
    )
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  function saleInput(overrides: Partial<CreateSaleInput> = {}): CreateSaleInput {
    return {
      clientId: null,
      petId: null,
      items: [{ productId, quantity: 7, discountCents: 5000 }],
      discountCents: 2000,
      paymentMethod: 'efectivo',
      notes: null,
      ...overrides
    }
  }

  it('registra una venta, descuenta stock FEFO y calcula descuentos', () => {
    const sale = createSale(database, saleInput(), 1)

    expect(sale.number).toBe('V-000001')
    expect(sale.status).toBe('completada')
    expect(sale.itemCount).toBe(1)
    expect(sale.subtotalCents).toBe(1_050_000)
    expect(sale.discountCents).toBe(7_000)
    expect(sale.totalCents).toBe(1_043_000)
    expect(sale.items[0]).toMatchObject({
      description: 'Alimento Premium',
      quantity: 7,
      unitPriceCents: 150000,
      discountCents: 5000,
      lineTotalCents: 1_045_000
    })
    expect(sale.items[0]?.allocations).toHaveLength(2)
    expect(sale.items[0]?.allocations[0]).toMatchObject({
      batchCode: 'LOTE-PRIMERO',
      quantity: 5
    })
    expect(sale.items[0]?.allocations[1]).toMatchObject({
      batchCode: 'LOTE-SEGUNDO',
      quantity: 2
    })
    expect(sale.payments[0]).toMatchObject({
      method: 'efectivo',
      amountCents: 1_043_000
    })

    const product = listProducts(database, {
      search: 'ALI-001',
      categoryId: null,
      includeInactive: false,
      stockFilter: 'all'
    })[0]
    expect(product?.stock).toBe(3)

    const batches = listProductBatches(database, productId)
    expect(batches.find((batch) => batch.batchCode === 'LOTE-PRIMERO')?.quantity).toBe(0)
    expect(batches.find((batch) => batch.batchCode === 'LOTE-SEGUNDO')?.quantity).toBe(3)

    const movements = listStockMovements(database, {
      productId,
      limit: 20
    }).filter((movement) => movement.type === 'venta')
    expect(movements).toHaveLength(2)
    expect(movements.reduce((total, movement) => total + movement.quantityDelta, 0)).toBe(-7)
    expect(movements.every((movement) => movement.referenceId === sale.id)).toBe(true)

    const summary = getSalesSummary(database)
    expect(summary.todayCount).toBe(1)
    expect(summary.todayTotalCents).toBe(1_043_000)
    expect(summary.monthTotalCents).toBe(1_043_000)
  })

  it('anula la venta, repone stock por lote y evita anular dos veces', () => {
    const sale = createSale(database, saleInput({ items: [{ productId, quantity: 3, discountCents: 0 }] }), 1)

    const cancelled = cancelSale(
      database,
      { id: sale.id, reason: 'Cliente devolvió el producto' },
      1
    )

    expect(cancelled.status).toBe('anulada')
    expect(cancelled.cancelReason).toBe('Cliente devolvió el producto')
    expect(cancelled.cancelledByName).toBe('Vendedor de prueba')
    expect(
      listProducts(database, {
        search: '',
        categoryId: null,
        includeInactive: false,
        stockFilter: 'all'
      })[0]?.stock
    ).toBe(10)
    expect(
      listProductBatches(database, productId)
        .filter((batch) => batch.batchCode?.startsWith('LOTE-'))
        .map((batch) => batch.quantity)
    ).toEqual([5, 5])
    expect(
      listStockMovements(database, { productId, limit: 20 }).filter(
        (movement) => movement.type === 'anulacion'
      )
    ).toHaveLength(1)
    expect(getSalesSummary(database).todayTotalCents).toBe(0)

    expectAppError(
      () => cancelSale(database, { id: sale.id, reason: 'Otra vez' }, 1),
      'CONFLICT'
    )
  })

  it('bloquea stock insuficiente sin dejar datos parciales', () => {
    expectAppError(
      () =>
        createSale(
          database,
          saleInput({ items: [{ productId, quantity: 99, discountCents: 0 }] }),
          1
        ),
      'CONFLICT'
    )

    expect(listSales(database, {
      search: '',
      status: 'all',
      dateFrom: null,
      dateTo: null,
      limit: 100
    })).toHaveLength(0)
    expect(
      listProducts(database, {
        search: '',
        categoryId: null,
        includeInactive: false,
        stockFilter: 'all'
      })[0]?.stock
    ).toBe(10)
  })

  it('valida descuentos, productos inactivos y cliente/mascota', () => {
    const tooMuchLineDiscount = saleInput({
      items: [{ productId, quantity: 1, discountCents: 150001 }],
      discountCents: 0
    })
    expectAppError(() => createSale(database, tooMuchLineDiscount, 1), 'CONFLICT')

    const tooMuchSaleDiscount = saleInput({
      items: [{ productId, quantity: 1, discountCents: 0 }],
      discountCents: 150001
    })
    expectAppError(() => createSale(database, tooMuchSaleDiscount, 1), 'CONFLICT')

    setProductActive(database, { id: productId, active: false })
    expectAppError(() => createSale(database, saleInput(), 1), 'CONFLICT')
    setProductActive(database, { id: productId, active: true })

    const now = new Date().toISOString()
    const client = database
      .prepare(
        `INSERT INTO clients (name, active, created_at, updated_at)
         VALUES ('Cliente A', 1, ?, ?)`
      )
      .run(now, now)
    const otherClient = database
      .prepare(
        `INSERT INTO clients (name, active, created_at, updated_at)
         VALUES ('Cliente B', 1, ?, ?)`
      )
      .run(now, now)
    const pet = database
      .prepare(
        `INSERT INTO pets (client_id, name, species, active, created_at, updated_at)
         VALUES (?, 'Mascota A', 'Perro', 1, ?, ?)`
      )
      .run(Number(otherClient.lastInsertRowid), now, now)

    expectAppError(
      () =>
        createSale(
          database,
          saleInput({
            clientId: Number(client.lastInsertRowid),
            petId: Number(pet.lastInsertRowid)
          }),
          1
        ),
      'CONFLICT'
    )
  })

  it('filtra el historial por estado, fecha y texto', () => {
    const first = createSale(database, saleInput(), 1)
    createSale(
      database,
      saleInput({ items: [{ productId, quantity: 1, discountCents: 0 }] }),
      1
    )
    cancelSale(database, { id: first.id, reason: 'Devolución' }, 1)

    expect(
      listSales(database, {
        search: '',
        status: 'anulada',
        dateFrom: null,
        dateTo: null,
        limit: 100
      })
    ).toHaveLength(1)
    expect(
      listSales(database, {
        search: first.number,
        status: 'all',
        dateFrom: null,
        dateTo: null,
        limit: 100
      })[0]?.id
    ).toBe(first.id)
    expect(
      listSales(database, {
        search: '',
        status: 'all',
        dateFrom: dateOffset(0),
        dateTo: dateOffset(0),
        limit: 100
      })
    ).toHaveLength(2)

    const detail = getSaleDetail(database, first.id)
    expect(detail.items[0]?.allocations).toHaveLength(2)
    expect(detail.payments).toHaveLength(1)
  })
})
