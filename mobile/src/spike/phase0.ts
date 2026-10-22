import type Database from 'better-sqlite3'

import { authenticate, countUsers, setupAdmin } from '@desktop/services/auth'
import {
  createProduct,
  getProduct,
  listProducts,
  registerStockEntry
} from '@desktop/services/inventory'
import { cancelSale, createSale, getSaleDetail } from '@desktop/services/sales'
import type { AuthUser, ProductRecord } from '@shared/types'

import { getMobileDatabase } from '../data/db'
import { deriveScryptKey } from '../data/password'

const TEST_USERNAME = 'fase0'
const TEST_PASSWORD = 'Fase0-2026'
const TEST_PRODUCT_SKU = 'FASE0-001'
const TEST_PASSWORD_SALT = '0123456789abcdef'
const TEST_PASSWORD_HASH =
  '9ff521059a747c0502233fe0010dfbf749942a1def75d88df6093afd2290afe' +
  '6ab0674c2981602d7d2b900253364f90817645bd1399604d8c05edc1a325be998'

export interface Phase0Step {
  name: string
  status: 'ok' | 'error'
  detail: string
  durationMs: number
}

export interface Phase0Counts {
  migrations: number
  settings: number
  users: number
  products: number
  sales: number
}

export interface Phase0Report {
  ok: boolean
  steps: Phase0Step[]
  counts: Phase0Counts | null
  saleNumber: string | null
  saleTotalCents: number | null
  durationMs: number
  fatalError: string | null
}

function readCounts(db: Database.Database): Phase0Counts {
  const count = (table: string): number => {
    const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as {
      count: number
    }

    return row.count
  }

  return {
    migrations: count('schema_migrations'),
    settings: count('settings'),
    users: count('users'),
    products: count('products'),
    sales: count('sales')
  }
}

function findTestProduct(db: Database.Database): ProductRecord | null {
  const products = listProducts(db, {
    search: TEST_PRODUCT_SKU,
    categoryId: null,
    includeInactive: true,
    stockFilter: 'all'
  })

  return products.find((product) => product.sku === TEST_PRODUCT_SKU) ?? null
}

export function runPhase0(db: Database.Database = getMobileDatabase()): Phase0Report {
  const startedAt = Date.now()
  const steps: Phase0Step[] = []
  let counts: Phase0Counts | null = null
  let saleNumber: string | null = null
  let saleTotalCents: number | null = null
  let fatalError: string | null = null

  const runStep = <Result>(
    name: string,
    action: () => Result,
    describe?: (result: Result) => string
  ): Result => {
    const stepStartedAt = Date.now()

    try {
      const result = action()
      const detail = describe
        ? describe(result)
        : typeof result === 'string'
          ? result
          : result === undefined
            ? 'OK'
            : String(result)

      steps.push({
        name,
        status: 'ok',
        detail,
        durationMs: Date.now() - stepStartedAt
      })

      return result
    } catch (error) {
      steps.push({
        name,
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - stepStartedAt
      })

      throw error
    }
  }

  try {
    runStep('Hash de contraseñas compatible con el escritorio', () => {
      const startedAt = Date.now()
      const hash = deriveScryptKey('clave-segura', TEST_PASSWORD_SALT)

      if (hash !== TEST_PASSWORD_HASH) {
        throw new Error('El hash calculado en el móvil difiere del de Node')
      }

      return `scrypt nativo en ${Date.now() - startedAt} ms`
    })

    runStep('Esquema y datos iniciales', () => {
      const initialCounts = readCounts(db)

      if (initialCounts.migrations === 0) {
        throw new Error('No se aplicó ninguna migración')
      }

      if (initialCounts.settings === 0) {
        throw new Error('El seed no cargó configuraciones')
      }

      return `${initialCounts.migrations} migraciones y ${initialCounts.settings} configuraciones`
    })

    const user = runStep<AuthUser>(
      'Usuario administrador e inicio de sesión',
      () => {
        const initialized = countUsers(db) > 0

        if (!initialized) {
          setupAdmin(db, {
            name: 'Administrador Fase 0',
            username: TEST_USERNAME,
            password: TEST_PASSWORD,
            confirmPassword: TEST_PASSWORD
          })
        }

        return authenticate(db, TEST_USERNAME, TEST_PASSWORD)
      },
      (authenticatedUser) =>
        `${authenticatedUser.name} (@${authenticatedUser.username}) con rol ${authenticatedUser.role}`
    )

    if (user.role !== 'admin') {
      throw new Error('El usuario de prueba no tiene rol de administrador')
    }

    const product = runStep<ProductRecord>(
      'Producto de inventario',
      () => {
        const existing = findTestProduct(db)

        if (existing) {
          return existing
        }

        return createProduct(db, {
          name: 'Producto de prueba Fase 0',
          sku: TEST_PRODUCT_SKU,
          barcode: null,
          categoryId: null,
          unit: 'unidad',
          costCents: 100000,
          priceCents: 150000,
          minStock: 1,
          notes: 'Creado por el autodiagnóstico de Fase 0'
        })
      },
      (testProduct) => `ID ${testProduct.id}, stock ${testProduct.stock}`
    )

    runStep('Entrada de stock', () => {
      const current = getProduct(db, product.id)

      if (current.stock > 0) {
        return `Stock disponible: ${current.stock}`
      }

      const updated = registerStockEntry(
        db,
        {
          productId: product.id,
          quantity: 5,
          costCents: 100000,
          batchCode: 'FASE0-LOTE',
          expiryDate: null,
          reason: 'Autodiagnóstico de Fase 0'
        },
        user.id
      )

      return `Stock cargado: ${updated.stock}`
    })

    runStep('Venta', () => {
      const beforeSale = getProduct(db, product.id)

      if (beforeSale.stock < 1) {
        throw new Error('No hay stock disponible para vender')
      }

      const sale = createSale(
        db,
        {
          clientId: null,
          petId: null,
          items: [
            {
              productId: product.id,
              quantity: 1,
              discountCents: 0
            }
          ],
          discountCents: 0,
          paymentMethod: 'efectivo',
          notes: 'Venta del autodiagnóstico Fase 0'
        },
        user.id
      )

      const detail = getSaleDetail(db, sale.id)

      if (detail.status !== 'completada') {
        throw new Error('La venta no quedó completada')
      }

      saleNumber = detail.number
      saleTotalCents = detail.totalCents

      return `${detail.number} por ${detail.totalCents} centavos`
    })

    runStep('Anulación de venta', () => {
      if (saleNumber === null) {
        throw new Error('No hay una venta para anular')
      }

      const saleRow = db
        .prepare('SELECT id FROM sales WHERE number = ?')
        .get(saleNumber) as { id: number } | undefined

      if (!saleRow) {
        throw new Error('No se encontró la venta recién creada')
      }

      const beforeCancel = getProduct(db, product.id)
      const cancelled = cancelSale(
        db,
        {
          id: saleRow.id,
          reason: 'Prueba automática de Fase 0'
        },
        user.id
      )
      const afterCancel = getProduct(db, product.id)

      if (cancelled.status !== 'anulada') {
        throw new Error('La venta no quedó anulada')
      }

      if (afterCancel.stock !== beforeCancel.stock + 1) {
        throw new Error('La anulación no devolvió el stock a la venta')
      }

      return `${cancelled.number} anulada y stock restituido a ${afterCancel.stock}`
    })

    counts = runStep<Phase0Counts>(
      'Persistencia local',
      () => {
        const finalCounts = readCounts(db)

        if (finalCounts.users === 0 || finalCounts.products === 0) {
          throw new Error('Faltan datos persistentes en la base')
        }

        return finalCounts
      },
      (finalCounts) =>
        `${finalCounts.users} usuarios, ${finalCounts.products} productos y ${finalCounts.sales} ventas`
    )
  } catch (error) {
    fatalError = error instanceof Error ? error.message : String(error)
  }

  return {
    ok: fatalError === null,
    steps,
    counts,
    saleNumber,
    saleTotalCents,
    durationMs: Date.now() - startedAt,
    fatalError
  }
}
