import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'

vi.mock('../data/db', () => ({
  getMobileDatabase: () => {
    throw new Error('La base real no se usa en los tests')
  }
}))

import { createMigratedTestDatabase } from '../data/testing/database'
import { setSessionUser } from '../data/controllers/session'
import { setupAdmin } from '@desktop/services/auth'
import { listInventory, registerStockEntry } from './inventory/inventory-service'
import { listClientsDirectory, createClientRecord } from './clients/clients-service'
import { listRecentSales, registerSale } from './sales/sales-service'

function signInAsAdmin(db: Database.Database): void {
  const admin = setupAdmin(db, {
    name: 'Administrador',
    username: 'admin',
    password: 'claveSegura123',
    confirmPassword: 'claveSegura123'
  })

  setSessionUser({
    id: admin.id,
    name: admin.name,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions
  })
}

describe('servicios de la operación diaria', () => {
  let db: Database.Database

  beforeEach(() => {
    db = createMigratedTestDatabase()
    signInAsAdmin(db)
  })

  it('crea clientes y los encuentra en el listado', () => {
    const client = createClientRecord(
      {
        name: 'Dueño de prueba',
        phone: '11 5555 0000',
        email: null,
        docNumber: null,
        address: null,
        notes: null
      },
      db
    )

    const clients = listClientsDirectory({ search: 'Dueño' }, db)

    expect(clients).toHaveLength(1)
    expect(clients[0].id).toBe(client.id)
    expect(clients[0].phone).toBe('11 5555 0000')
  })

  it('rechaza clientes con nombre demasiado corto', () => {
    expect(() =>
      createClientRecord(
        {
          name: 'A',
          phone: null,
          email: null,
          docNumber: null,
          address: null,
          notes: null
        },
        db
      )
    ).toThrowError()
  })

  it('registra una entrada de stock y suma al stock del producto', () => {
    const product = {
      id: 1,
      name: 'Producto',
      sku: 'SKU-1',
      barcode: null,
      categoryId: null,
      categoryName: null,
      unit: 'u',
      costCents: 1000,
      priceCents: 2000,
      stock: 2,
      minStock: 1,
      active: true,
      notes: null,
      nextExpiryDate: null,
      lowStock: false,
      outOfStock: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    db.prepare(
      `INSERT INTO products
        (name, sku, barcode, category_id, unit, cost_cents, price_cents, stock,
         min_stock, active, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(
      product.name,
      product.sku,
      product.barcode,
      product.categoryId,
      product.unit,
      product.costCents,
      product.priceCents,
      product.stock,
      product.minStock,
      product.notes,
      product.createdAt,
      product.updatedAt
    )

    const updated = registerStockEntry(
      {
        productId: 1,
        quantity: 3,
        costCents: 1000,
        batchCode: null,
        expiryDate: null,
        reason: null
      },
      db
    )

    expect(updated.stock).toBe(5)
    expect(listInventory({ search: 'Producto' }, db)).toHaveLength(1)
  })

  it('crea una venta y la deja en el historial', () => {
    const now = new Date().toISOString()

    db.prepare(
      `INSERT INTO products
        (name, sku, barcode, category_id, unit, cost_cents, price_cents, stock,
         min_stock, active, notes, created_at, updated_at)
       VALUES ('Producto', 'SKU-1', NULL, NULL, 'u', 1000, 2500, 10, 1, 1, NULL, ?, ?)`
    ).run(now, now)

    db.prepare(
      `INSERT INTO product_batches
        (product_id, batch_code, expiry_date, quantity, cost_cents, received_at, created_at, updated_at)
       VALUES (1, 'LOTE-1', NULL, 10, 1000, ?, ?, ?)`
    ).run(now, now, now)

    const sale = registerSale(
      {
        clientId: null,
        petId: null,
        items: [{ productId: 1, quantity: 2, discountCents: 0 }],
        discountCents: 0,
        paymentMethod: 'efectivo',
        notes: null
      },
      db
    )

    expect(sale.totalCents).toBe(5000)
    expect(sale.number).toMatch(/^V-\d+$/)

    const sales = listRecentSales({}, db)

    expect(sales).toHaveLength(1)
    expect(sales[0].id).toBe(sale.id)
  })
})
