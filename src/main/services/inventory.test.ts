import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import type { CreateProductInput } from '@shared/schemas'
import { createDatabase } from '@main/db/connection'
import {
  adjustStock,
  buildInventoryCsv,
  createCategory,
  createProduct,
  getInventorySummary,
  listCategories,
  listExpiringBatches,
  listProductBatches,
  listProducts,
  listStockMovements,
  registerStockEntry,
  setCategoryActive,
  setProductActive,
  updateCategory,
  updateProduct
} from './inventory'

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
  name: 'Antiparasitario 10 kg',
  sku: 'ANT-10',
  barcode: '7790001000011',
  categoryId: null,
  unit: 'unidad',
  costCents: 120000,
  priceCents: 180000,
  minStock: 3,
  notes: null
}

describe('inventario', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-inventory-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
    const now = new Date().toISOString()
    database
      .prepare(
        `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'admin', 1, ?, ?)`
      )
      .run('Usuario de prueba', 'admin', 'hash', now, now)
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('gestiona categorías y evita nombres duplicados', () => {
    const category = createCategory(database, { name: 'Cuidado dental' })

    expect(category.productCount).toBe(0)
    expect(listCategories(database, { includeInactive: false })).toContainEqual(
      expect.objectContaining({ name: 'Cuidado dental', active: true })
    )
    expectAppError(
      () => createCategory(database, { name: 'cuidado dental' }),
      'CONFLICT'
    )

    const updated = updateCategory(database, {
      id: category.id,
      name: 'Higiene dental'
    })
    expect(updated.name).toBe('Higiene dental')

    const inactive = setCategoryActive(database, {
      id: category.id,
      active: false
    })
    expect(inactive.active).toBe(false)
    expect(
      listCategories(database, { includeInactive: false }).some(
        (item) => item.id === category.id
      )
    ).toBe(false)
  })

  it('crea, busca, actualiza y desactiva productos', () => {
    const category = createCategory(database, { name: 'Antiparasitarios' })
    const product = createProduct(database, {
      ...baseProduct,
      categoryId: category.id
    })

    expect(product.stock).toBe(0)
    expect(product.outOfStock).toBe(true)
    expect(product.categoryName).toBe('Antiparasitarios')
    expect(listProducts(database, {
      search: 'ANT-10',
      categoryId: null,
      includeInactive: false,
      stockFilter: 'all'
    })).toHaveLength(1)
    expectAppError(
      () => createProduct(database, { ...baseProduct, name: 'Otro producto' }),
      'CONFLICT'
    )

    const updated = updateProduct(database, {
      id: product.id,
      ...baseProduct,
      name: 'Antiparasitario 20 kg',
      sku: 'ANT-20',
      barcode: null,
      priceCents: 200000,
      categoryId: category.id
    })

    expect(updated.name).toBe('Antiparasitario 20 kg')
    expect(updated.priceCents).toBe(200000)
    expect(updated.barcode).toBeNull()

    setProductActive(database, { id: product.id, active: false })
    expect(
      listProducts(database, {
        search: '',
        categoryId: null,
        includeInactive: false,
        stockFilter: 'all'
      })
    ).toHaveLength(0)
  })

  it('registra entradas con lote, vencimiento y movimientos', () => {
    const product = createProduct(database, baseProduct)
    const withStock = registerStockEntry(
      database,
      {
        productId: product.id,
        quantity: 5,
        costCents: 150000,
        batchCode: 'LOTE-A',
        expiryDate: dateOffset(20),
        reason: null
      },
      1
    )

    expect(withStock.stock).toBe(5)
    expect(withStock.costCents).toBe(150000)
    expect(withStock.lowStock).toBe(false)

    const batches = listProductBatches(database, product.id)
    expect(batches).toHaveLength(1)
    expect(batches[0]).toMatchObject({ batchCode: 'LOTE-A', quantity: 5 })

    const movements = listStockMovements(database, {
      productId: product.id,
      limit: 20
    })
    expect(movements[0]).toMatchObject({
      type: 'entrada',
      quantityDelta: 5,
      batchCode: 'LOTE-A'
    })

    const lowStock = registerStockEntry(
      database,
      {
        productId: product.id,
        quantity: 1,
        costCents: 160000,
        batchCode: null,
        expiryDate: null,
        reason: 'Reposición'
      },
      1
    )
    expect(lowStock.stock).toBe(6)
    expect(lowStock.lowStock).toBe(false)

    setProductActive(database, { id: product.id, active: false })
    expectAppError(
      () =>
        registerStockEntry(
          database,
          {
            productId: product.id,
            quantity: 1,
            costCents: 100,
            batchCode: null,
            expiryDate: null,
            reason: null
          },
          1
        ),
      'CONFLICT'
    )
  })

  it('consume lotes por vencimiento y bloquea stock negativo', () => {
    const product = createProduct(database, { ...baseProduct, minStock: 2 })
    registerStockEntry(database, {
      productId: product.id,
      quantity: 5,
      costCents: 100000,
      batchCode: 'VENCE-PRONTO',
      expiryDate: dateOffset(10),
      reason: null
    }, 1)
    registerStockEntry(database, {
      productId: product.id,
      quantity: 5,
      costCents: 200000,
      batchCode: 'VENCE-DESPUES',
      expiryDate: dateOffset(40),
      reason: null
    }, 1)

    const adjusted = adjustStock(database, {
      productId: product.id,
      quantityDelta: -7,
      reason: 'Merma por rotura'
    }, 1)
    expect(adjusted.stock).toBe(3)

    const batches = listProductBatches(database, product.id)
    expect(batches.find((batch) => batch.batchCode === 'VENCE-PRONTO')?.quantity).toBe(0)
    expect(batches.find((batch) => batch.batchCode === 'VENCE-DESPUES')?.quantity).toBe(3)

    const positive = adjustStock(database, {
      productId: product.id,
      quantityDelta: 2,
      reason: 'Recuento físico'
    }, 1)
    expect(positive.stock).toBe(5)
    expect(listProductBatches(database, product.id).some(
      (batch) => batch.batchCode === null && batch.quantity === 2
    )).toBe(true)

    expectAppError(
      () =>
        adjustStock(database, {
          productId: product.id,
          quantityDelta: -6,
          reason: 'Ajuste inválido'
        }, 1),
      'CONFLICT'
    )

    const movements = listStockMovements(database, {
      productId: product.id,
      limit: 20
    })
    expect(movements[0]).toMatchObject({
      type: 'ajuste',
      quantityDelta: 2,
      reason: 'Recuento físico'
    })
  })

  it('calcula alertas, valor de inventario y exportación CSV', () => {
    const product = createProduct(database, baseProduct)
    registerStockEntry(database, {
      productId: product.id,
      quantity: 2,
      costCents: 100000,
      batchCode: 'POR-VENCER',
      expiryDate: dateOffset(5),
      reason: null
    }, 1)

    const summary = getInventorySummary(database)
    expect(summary.activeProducts).toBe(1)
    expect(summary.lowStock).toBe(1)
    expect(summary.expiring).toBe(1)
    expect(summary.inventoryValueCents).toBe(200000)

    const expiring = listExpiringBatches(database)
    expect(expiring).toHaveLength(1)
    expect(expiring[0]).toMatchObject({
      productName: 'Antiparasitario 10 kg',
      batchCode: 'POR-VENCER'
    })
    expect(expiring[0]?.daysUntilExpiry).toBe(5)

    expect(
      listProducts(database, {
        search: '',
        categoryId: null,
        includeInactive: false,
        stockFilter: 'low'
      })
    ).toHaveLength(1)
    expect(
      listProducts(database, {
        search: '',
        categoryId: null,
        includeInactive: false,
        stockFilter: 'expiring'
      })
    ).toHaveLength(1)

    const csv = buildInventoryCsv(database)
    expect(csv.startsWith('\ufeff"Nombre"')).toBe(true)
    expect(csv).toContain('"Antiparasitario 10 kg"')
    expect(csv).toContain(dateOffset(5))
  })
})
