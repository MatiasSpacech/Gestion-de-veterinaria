import type Database from 'better-sqlite3'
import { cancelSale, createSale, listSales } from '@desktop/services/sales'
import {
  cancelSaleSchema,
  createSaleSchema,
  listSalesSchema,
  type CancelSaleInput,
  type CreateSaleInput,
  type ListSalesInput
} from '@shared/schemas'
import type { SaleDetail, SaleListRecord } from '@shared/types'

import { recordActivity } from '../../data/controllers/audit'
import { requirePermission } from '../../data/controllers/permissions'
import { getSessionUser } from '../../data/controllers/session'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'

export function listRecentSales(
  input: Partial<ListSalesInput> = {},
  db: Database.Database = getMobileDatabase()
): SaleListRecord[] {
  return listSales(
    db,
    parseInput(listSalesSchema, {
      search: '',
      status: 'all',
      dateFrom: null,
      dateTo: null,
      limit: 50,
      ...input
    })
  )
}

export function registerSale(
  input: CreateSaleInput,
  db: Database.Database = getMobileDatabase()
): SaleDetail {
  requirePermission('ventas', db)

  const parsed = parseInput(createSaleSchema, input)
  const user = getSessionUser()
  const sale = createSale(db, parsed, user?.id ?? 0)

  recordActivity(
    {
      action: 'venta.creada',
      entityType: 'sale',
      entityId: sale.id,
      details: { totalCents: sale.totalCents, number: sale.number }
    },
    db
  )

  return sale
}

export function annulSale(
  input: CancelSaleInput,
  db: Database.Database = getMobileDatabase()
): void {
  requirePermission('ventas', db)

  const parsed = parseInput(cancelSaleSchema, input)
  const user = getSessionUser()

  cancelSale(db, parsed, user?.id ?? 0)

  recordActivity(
    {
      action: 'venta.anulada',
      entityType: 'sale',
      entityId: parsed.id,
      details: { reason: parsed.reason }
    },
    db
  )
}
