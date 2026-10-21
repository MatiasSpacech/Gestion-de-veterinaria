import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import { IPC } from '@shared/ipc'
import {
  createCategorySchema,
  createProductSchema,
  getByIdSchema,
  listCategoriesSchema,
  listProductBatchesSchema,
  listProductsSchema,
  listStockMovementsSchema,
  setActiveSchema,
  stockAdjustmentSchema,
  stockEntrySchema,
  updateCategorySchema,
  updateProductSchema,
  type CreateCategoryInput,
  type CreateProductInput,
  type GetByIdInput,
  type ListCategoriesInput,
  type ListProductBatchesInput,
  type ListProductsInput,
  type ListStockMovementsInput,
  type SetActiveInput,
  type StockAdjustmentInput,
  type StockEntryInput,
  type UpdateCategoryInput,
  type UpdateProductInput
} from '@shared/schemas'
import type {
  ExpiringBatch,
  InventorySummary,
  ProductBatch,
  ProductCategory,
  ProductRecord,
  StockMovement
} from '@shared/types'
import { getDb } from '@main/db'
import { logActivity } from '@main/services/activity'
import {
  adjustStock,
  buildInventoryCsv,
  createCategory,
  createProduct,
  getInventorySummary,
  getProduct,
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
} from '@main/services/inventory'
import { registerProtectedHandler } from './handle'

export function registerInventoryHandlers(): void {
  registerProtectedHandler<ListCategoriesInput, ProductCategory[]>(
    IPC.inventory.listCategories,
    listCategoriesSchema,
    (input) => listCategories(getDb(), input),
    { permission: 'inventario' }
  )

  registerProtectedHandler<CreateCategoryInput, ProductCategory>(
    IPC.inventory.createCategory,
    createCategorySchema,
    (input, user) => {
      const db = getDb()
      const category = createCategory(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'category.create',
        entityType: 'product_category',
        entityId: category.id,
        details: { name: category.name }
      })
      return category
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<UpdateCategoryInput, ProductCategory>(
    IPC.inventory.updateCategory,
    updateCategorySchema,
    (input, user) => {
      const db = getDb()
      const category = updateCategory(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'category.update',
        entityType: 'product_category',
        entityId: category.id,
        details: { name: category.name }
      })
      return category
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<SetActiveInput, ProductCategory>(
    IPC.inventory.setCategoryActive,
    setActiveSchema,
    (input, user) => {
      const db = getDb()
      const category = setCategoryActive(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'category.set-active',
        entityType: 'product_category',
        entityId: category.id,
        details: { active: category.active }
      })
      return category
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<ListProductsInput, ProductRecord[]>(
    IPC.inventory.listProducts,
    listProductsSchema,
    (input) => listProducts(getDb(), input),
    { permission: 'inventario' }
  )

  registerProtectedHandler<GetByIdInput, ProductRecord>(
    IPC.inventory.getProduct,
    getByIdSchema,
    (input) => getProduct(getDb(), input.id),
    { permission: 'inventario' }
  )

  registerProtectedHandler<CreateProductInput, ProductRecord>(
    IPC.inventory.createProduct,
    createProductSchema,
    (input, user) => {
      const db = getDb()
      const product = createProduct(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'product.create',
        entityType: 'product',
        entityId: product.id,
        details: { name: product.name, sku: product.sku }
      })
      return product
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<UpdateProductInput, ProductRecord>(
    IPC.inventory.updateProduct,
    updateProductSchema,
    (input, user) => {
      const db = getDb()
      const product = updateProduct(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'product.update',
        entityType: 'product',
        entityId: product.id,
        details: { name: product.name, sku: product.sku }
      })
      return product
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<SetActiveInput, ProductRecord>(
    IPC.inventory.setProductActive,
    setActiveSchema,
    (input, user) => {
      const db = getDb()
      const product = setProductActive(db, input)
      logActivity(db, {
        userId: user.id,
        action: 'product.set-active',
        entityType: 'product',
        entityId: product.id,
        details: { name: product.name, active: product.active }
      })
      return product
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<ListProductBatchesInput, ProductBatch[]>(
    IPC.inventory.listBatches,
    listProductBatchesSchema,
    (input) => listProductBatches(getDb(), input.productId),
    { permission: 'inventario' }
  )

  registerProtectedHandler<void, ExpiringBatch[]>(
    IPC.inventory.listExpiring,
    null,
    () => listExpiringBatches(getDb()),
    { permission: 'inventario' }
  )

  registerProtectedHandler<ListStockMovementsInput, StockMovement[]>(
    IPC.inventory.listMovements,
    listStockMovementsSchema,
    (input) => listStockMovements(getDb(), input),
    { permission: 'inventario' }
  )

  registerProtectedHandler<void, InventorySummary>(
    IPC.inventory.summary,
    null,
    () => getInventorySummary(getDb()),
    { permission: 'inventario' }
  )

  registerProtectedHandler<StockEntryInput, ProductRecord>(
    IPC.inventory.registerEntry,
    stockEntrySchema,
    (input, user) => {
      const db = getDb()
      const product = registerStockEntry(db, input, user.id)
      logActivity(db, {
        userId: user.id,
        action: 'inventory.entry',
        entityType: 'product',
        entityId: product.id,
        details: {
          name: product.name,
          quantity: input.quantity,
          batchCode: input.batchCode
        }
      })
      return product
    },
    { permission: 'inventario' }
  )

  registerProtectedHandler<StockAdjustmentInput, ProductRecord>(
    IPC.inventory.adjustStock,
    stockAdjustmentSchema,
    (input, user) => {
      const db = getDb()
      const product = adjustStock(db, input, user.id)
      logActivity(db, {
        userId: user.id,
        action: 'inventory.adjustment',
        entityType: 'product',
        entityId: product.id,
        details: {
          name: product.name,
          quantityDelta: input.quantityDelta,
          reason: input.reason
        }
      })
      return product
    },
    { permission: 'inventario', adminOnly: true }
  )

  registerProtectedHandler<void, string | null>(
    IPC.inventory.exportCsv,
    null,
    async (_input, _user, event) => {
      const parent = BrowserWindow.fromWebContents(event.sender)
      const now = new Date()
      const date = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
      ].join('-')
      const options: Electron.SaveDialogOptions = {
        title: 'Exportar inventario',
        defaultPath: join(app.getPath('documents'), `inventario-${date}.csv`),
        filters: [{ name: 'Archivo CSV', extensions: ['csv'] }]
      }
      const result = parent
        ? await dialog.showSaveDialog(parent, options)
        : await dialog.showSaveDialog(options)

      if (result.canceled || !result.filePath) {
        return null
      }

      await writeFile(result.filePath, buildInventoryCsv(getDb()), 'utf8')
      return result.filePath
    },
    { permission: 'inventario' }
  )
}
