import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppError } from '@shared/errors'
import { createDatabase } from '@main/db/connection'
import { buildReportCsv, buildReportHtml, getReport } from './reports'

function localDate(): string {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')
}

describe('reportes', () => {
  let database: Database.Database
  let tempDirectory: string

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), 'vetgestion-reports-'))
    database = createDatabase(join(tempDirectory, 'test.db'))
    const now = new Date().toISOString()
    const userId = Number(
      database
        .prepare(
          `INSERT INTO users (name, username, password_hash, role, active, created_at, updated_at)
           VALUES (?, ?, ?, 'admin', 1, ?, ?)`
        )
        .run('Admin', 'admin', 'hash', now, now).lastInsertRowid
    )
    const productId = Number(
      database
        .prepare(
          `INSERT INTO products (name, cost_cents, price_cents, stock, min_stock, active, created_at, updated_at)
           VALUES (?, 5000, 10000, 4, 5, 1, ?, ?)`
        )
        .run('Alimento premium', now, now).lastInsertRowid
    )
    const serviceId = Number(
      database
        .prepare(
          `INSERT INTO services (name, category, price_cents, duration_minutes, active, created_at, updated_at)
           VALUES ('Baño completo', 'peluqueria', 50000, 45, 1, ?, ?)`
        )
        .run(now, now).lastInsertRowid
    )
    const saleId = Number(
      database
        .prepare(
          `INSERT INTO sales (number, user_id, subtotal_cents, discount_cents, total_cents, payment_method, status, created_at)
           VALUES ('V-1', ?, 80000, 5000, 75000, 'efectivo', 'completada', ?)`
        )
        .run(userId, now).lastInsertRowid
    )
    database
      .prepare(
        `INSERT INTO sale_items (sale_id, product_id, description, quantity, unit_price_cents, discount_cents, line_total_cents)
         VALUES (?, ?, 'Alimento premium', 2, 10000, 0, 30000)`
      )
      .run(saleId, productId)
    database
      .prepare(
        `INSERT INTO sale_items (sale_id, service_id, description, quantity, unit_price_cents, discount_cents, line_total_cents)
         VALUES (?, ?, 'Baño completo', 1, 50000, 0, 50000)`
      )
      .run(saleId, serviceId)
    database
      .prepare(
        `INSERT INTO sale_payments (sale_id, method, amount_cents, created_at)
         VALUES (?, 'efectivo', 75000, ?)`
      )
      .run(saleId, now)
  })

  afterEach(() => {
    database.close()
    rmSync(tempDirectory, { recursive: true, force: true })
  })

  it('calcula el resumen de ventas, rubros e inventario', () => {
    const date = localDate()
    const report = getReport(database, { dateFrom: date, dateTo: date })

    expect(report.salesCount).toBe(1)
    expect(report.netSalesCents).toBe(75000)
    expect(report.discountsCents).toBe(5000)
    expect(report.averageTicketCents).toBe(75000)
    expect(report.productRevenueCents).toBe(30000)
    expect(report.serviceRevenueCents).toBe(50000)
    expect(report.topProducts[0]).toEqual({
      name: 'Alimento premium',
      quantity: 2,
      totalCents: 30000
    })
    expect(report.topServices[0]?.name).toBe('Baño completo')
    expect(report.paymentBreakdown[0]).toEqual({
      method: 'efectivo',
      count: 1,
      totalCents: 75000
    })
    expect(report.salesByDay[0]?.date).toBe(date)
    expect(report.inventoryCostCents).toBe(20000)
    expect(report.inventoryRetailCents).toBe(40000)
    expect(report.lowStockCount).toBe(1)
    expect(report.outOfStockCount).toBe(0)
  })

  it('exporta CSV y PDF con los datos del período', () => {
    const date = localDate()
    const csv = buildReportCsv(database, { dateFrom: date, dateTo: date })
    const html = buildReportHtml(database, { dateFrom: date, dateTo: date })

    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain('V-1')
    expect(csv).toContain('Alimento premium')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Baño completo')
    expect(html).toContain('Reporte del')
  })

  it('rechaza rangos invertidos o demasiado extensos', () => {
    expect(() =>
      getReport(database, { dateFrom: '2026-05-10', dateTo: '2026-05-01' })
    ).toThrow(AppError)
    expect(() =>
      getReport(database, { dateFrom: '2024-01-01', dateTo: '2026-01-02' })
    ).toThrow(AppError)
  })
})
