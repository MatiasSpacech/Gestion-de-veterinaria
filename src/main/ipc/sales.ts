import { IPC } from '@shared/ipc'
import {
  cancelSaleSchema,
  createSaleSchema,
  getByIdSchema,
  listSalesSchema,
  type CancelSaleInput,
  type CreateSaleInput,
  type GetByIdInput,
  type ListSalesInput
} from '@shared/schemas'
import type { SaleDetail, SaleListRecord, SalesSummary } from '@shared/types'
import { getDb } from '@main/db'
import {
  cancelSale,
  createSale,
  getSaleDetail,
  getSalesSummary,
  listSales
} from '@main/services/sales'
import { registerProtectedHandler } from './handle'

export function registerSalesHandlers(): void {
  registerProtectedHandler<CreateSaleInput, SaleDetail>(
    IPC.sales.create,
    createSaleSchema,
    (input, user) => createSale(getDb(), input, user.id),
    { permission: 'ventas' }
  )

  registerProtectedHandler<ListSalesInput, SaleListRecord[]>(
    IPC.sales.list,
    listSalesSchema,
    (input) => listSales(getDb(), input),
    { permission: 'ventas' }
  )

  registerProtectedHandler<GetByIdInput, SaleDetail>(
    IPC.sales.get,
    getByIdSchema,
    (input) => getSaleDetail(getDb(), input.id),
    { permission: 'ventas' }
  )

  registerProtectedHandler<CancelSaleInput, SaleDetail>(
    IPC.sales.cancel,
    cancelSaleSchema,
    (input, user) => cancelSale(getDb(), input, user.id),
    { permission: 'ventas', adminOnly: true }
  )

  registerProtectedHandler<void, SalesSummary>(
    IPC.sales.summary,
    null,
    () => getSalesSummary(getDb()),
    { permission: 'ventas' }
  )
}
