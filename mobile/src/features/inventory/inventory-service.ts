import type Database from 'better-sqlite3'
import {
  adjustStock as applyStockAdjustment,
  getInventorySummary,
  listProducts,
  registerStockEntry as applyStockEntry
} from '@desktop/services/inventory'
import {
  listProductsSchema,
  stockAdjustmentSchema,
  stockEntrySchema,
  type ListProductsInput,
  type StockAdjustmentInput,
  type StockEntryInput
} from '@shared/schemas'
import type { InventorySummary, ProductRecord } from '@shared/types'

import { recordActivity } from '../../data/controllers/audit'
import { requirePermission } from '../../data/controllers/permissions'
import { getSessionUser } from '../../data/controllers/session'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'

export function listInventory(
  input: Partial<ListProductsInput>,
  db: Database.Database = getMobileDatabase()
): ProductRecord[] {
  return listProducts(
    db,
    parseInput(listProductsSchema, {
      search: '',
      categoryId: null,
      includeInactive: false,
      stockFilter: 'all',
      ...input
    })
  )
}

export function findProductByCode(
  code: string,
  db: Database.Database = getMobileDatabase()
): ProductRecord | null {
  const value = code.trim()

  if (value === '') {
    return null
  }

  const products = listProducts(
    db,
    parseInput(listProductsSchema, {
      search: value,
      categoryId: null,
      includeInactive: false,
      stockFilter: 'all'
    })
  )

  return (
    products.find(
      (product) => product.barcode === value || product.sku === value
    ) ?? null
  )
}

export function getInventoryOverview(
  db: Database.Database = getMobileDatabase()
): InventorySummary {
  return getInventorySummary(db)
}

export function registerStockEntry(
  input: StockEntryInput,
  db: Database.Database = getMobileDatabase()
): ProductRecord {
  requirePermission('inventario', db)

  const parsed = parseInput(stockEntrySchema, input)
  const user = getSessionUser()
  const product = applyStockEntry(db, parsed, user?.id ?? 0)

  recordActivity(
    {
      action: 'inventario.entrada',
      entityType: 'product',
      entityId: product.id,
      details: { quantity: parsed.quantity }
    },
    db
  )

  return product
}

export function adjustProductStock(
  input: StockAdjustmentInput,
  db: Database.Database = getMobileDatabase()
): ProductRecord {
  requirePermission('inventario', db)

  const parsed = parseInput(stockAdjustmentSchema, input)
  const user = getSessionUser()
  const product = applyStockAdjustment(db, parsed, user?.id ?? 0)

  recordActivity(
    {
      action: 'inventario.ajuste',
      entityType: 'product',
      entityId: product.id,
      details: { quantityDelta: parsed.quantityDelta }
    },
    db
  )

  return product
}
