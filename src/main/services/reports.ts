import type Database from 'better-sqlite3'
import { AppError } from '@shared/errors'
import type { ReportRangeInput } from '@shared/schemas'
import type {
  DailySales,
  PaymentBreakdown,
  PaymentMethod,
  ReportData,
  TopSellingItem
} from '@shared/types'
import { getBusinessName } from './settings'

interface SalesTotalsRow {
  sales_count: number
  cancelled_count: number
  gross_cents: number
  discount_cents: number
  net_cents: number
}

interface RevenueRow {
  product_revenue: number
  service_revenue: number
}

interface AppointmentTotalsRow {
  completed_count: number
  cancelled_count: number
  no_show_count: number
}

interface InventoryTotalsRow {
  cost_cents: number
  retail_cents: number
  low_stock: number
  out_of_stock: number
}

interface TopItemRow {
  name: string
  quantity: number
  total_cents: number
}

interface ExportSaleRow {
  number: string
  date: string
  client_name: string | null
  pet_name: string | null
  user_name: string | null
  subtotal_cents: number
  discount_cents: number
  total_cents: number
  payment_method: PaymentMethod
  status: string
  cancel_reason: string | null
}

function validateRange(input: ReportRangeInput): void {
  const from = new Date(`${input.dateFrom}T00:00:00`)
  const to = new Date(`${input.dateTo}T00:00:00`)

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'El rango de fechas no es válido')
  }

  if (input.dateFrom > input.dateTo) {
    throw new AppError(
      'VALIDATION_ERROR',
      'La fecha desde no puede ser posterior a la fecha hasta'
    )
  }

  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1

  if (days > 366) {
    throw new AppError(
      'VALIDATION_ERROR',
      'El rango de fechas no puede superar los 366 días'
    )
  }
}

function toTopItems(rows: TopItemRow[]): TopSellingItem[] {
  return rows.map((row) => ({
    name: row.name,
    quantity: row.quantity,
    totalCents: row.total_cents
  }))
}

export function getReport(
  db: Database.Database,
  dateRange: ReportRangeInput
): ReportData {
  validateRange(dateRange)

  const sales = db
    .prepare(
      `SELECT COUNT(*) AS sales_count,
        COALESCE(SUM(CASE WHEN status = 'anulada' THEN 1 ELSE 0 END), 0) AS cancelled_count,
        COALESCE(SUM(CASE WHEN status = 'completada' THEN subtotal_cents ELSE 0 END), 0) AS gross_cents,
        COALESCE(SUM(CASE WHEN status = 'completada' THEN discount_cents ELSE 0 END), 0) AS discount_cents,
        COALESCE(SUM(CASE WHEN status = 'completada' THEN total_cents ELSE 0 END), 0) AS net_cents
       FROM sales
       WHERE date(created_at, 'localtime') BETWEEN ? AND ?`
    )
    .get(dateRange.dateFrom, dateRange.dateTo) as SalesTotalsRow

  const revenue = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN si.product_id IS NOT NULL THEN si.line_total_cents ELSE 0 END), 0) AS product_revenue,
        COALESCE(SUM(CASE WHEN si.service_id IS NOT NULL THEN si.line_total_cents ELSE 0 END), 0) AS service_revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'completada'
         AND date(s.created_at, 'localtime') BETWEEN ? AND ?`
    )
    .get(dateRange.dateFrom, dateRange.dateTo) as RevenueRow

  const appointments = db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'completado' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelled_count,
        SUM(CASE WHEN status = 'no_asistio' THEN 1 ELSE 0 END) AS no_show_count
       FROM appointments
       WHERE date BETWEEN ? AND ?`
    )
    .get(dateRange.dateFrom, dateRange.dateTo) as AppointmentTotalsRow

  const topProducts = db
    .prepare(
      `SELECT COALESCE(p.name, si.description) AS name,
        SUM(si.quantity) AS quantity,
        SUM(si.line_total_cents) AS total_cents
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.status = 'completada' AND si.product_id IS NOT NULL
         AND date(s.created_at, 'localtime') BETWEEN ? AND ?
       GROUP BY COALESCE(p.name, si.description)
       ORDER BY total_cents DESC
       LIMIT 5`
    )
    .all(dateRange.dateFrom, dateRange.dateTo) as TopItemRow[]

  const topServices = db
    .prepare(
      `SELECT COALESCE(sv.name, si.description) AS name,
        SUM(si.quantity) AS quantity,
        SUM(si.line_total_cents) AS total_cents
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN services sv ON sv.id = si.service_id
       WHERE s.status = 'completada' AND si.service_id IS NOT NULL
         AND date(s.created_at, 'localtime') BETWEEN ? AND ?
       GROUP BY COALESCE(sv.name, si.description)
       ORDER BY total_cents DESC
       LIMIT 5`
    )
    .all(dateRange.dateFrom, dateRange.dateTo) as TopItemRow[]

  const salesByDay = db
    .prepare(
      `SELECT date(created_at, 'localtime') AS date,
        COUNT(*) AS count,
        SUM(total_cents) AS total_cents
       FROM sales
       WHERE status = 'completada'
         AND date(created_at, 'localtime') BETWEEN ? AND ?
       GROUP BY date(created_at, 'localtime')
       ORDER BY date`
    )
    .all(dateRange.dateFrom, dateRange.dateTo) as Array<{
    date: string
    count: number
    total_cents: number
  }>

  const paymentBreakdown = db
    .prepare(
      `SELECT sp.method, COUNT(*) AS count, SUM(sp.amount_cents) AS total_cents
       FROM sale_payments sp
       JOIN sales s ON s.id = sp.sale_id
       WHERE s.status = 'completada'
         AND date(s.created_at, 'localtime') BETWEEN ? AND ?
       GROUP BY sp.method
       ORDER BY total_cents DESC`
    )
    .all(dateRange.dateFrom, dateRange.dateTo) as Array<{
    method: PaymentMethod
    count: number
    total_cents: number
  }>

  const inventory = db
    .prepare(
      `SELECT COALESCE(SUM(stock * cost_cents), 0) AS cost_cents,
        COALESCE(SUM(stock * price_cents), 0) AS retail_cents,
        SUM(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END) AS low_stock,
        SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock
       FROM products WHERE active = 1`
    )
    .get() as InventoryTotalsRow

  return {
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    salesCount: sales.sales_count,
    cancelledSalesCount: sales.cancelled_count,
    grossSalesCents: sales.gross_cents,
    discountsCents: sales.discount_cents,
    netSalesCents: sales.net_cents,
    averageTicketCents:
      sales.sales_count > 0
        ? Math.round(sales.net_cents / sales.sales_count)
        : 0,
    productRevenueCents: revenue.product_revenue,
    serviceRevenueCents: revenue.service_revenue,
    completedAppointments: appointments.completed_count ?? 0,
    cancelledAppointments: appointments.cancelled_count ?? 0,
    noShowAppointments: appointments.no_show_count ?? 0,
    topProducts: toTopItems(topProducts),
    topServices: toTopItems(topServices),
    salesByDay: salesByDay.map<DailySales>((row) => ({
      date: row.date,
      count: row.count,
      totalCents: row.total_cents
    })),
    paymentBreakdown: paymentBreakdown.map<PaymentBreakdown>((row) => ({
      method: row.method,
      count: row.count,
      totalCents: row.total_cents
    })),
    inventoryCostCents: inventory.cost_cents,
    inventoryRetailCents: inventory.retail_cents,
    lowStockCount: inventory.low_stock ?? 0,
    outOfStockCount: inventory.out_of_stock ?? 0
  }
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

function csvMoney(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function buildReportCsv(
  db: Database.Database,
  dateRange: ReportRangeInput
): string {
  const report = getReport(db, dateRange)
  const sales = db
    .prepare(
      `SELECT s.number, date(s.created_at, 'localtime') AS date,
        c.name AS client_name, p.name AS pet_name, u.name AS user_name,
        s.subtotal_cents, s.discount_cents, s.total_cents, s.payment_method,
        s.status, s.cancel_reason
       FROM sales s
       LEFT JOIN clients c ON c.id = s.client_id
       LEFT JOIN pets p ON p.id = s.pet_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE date(s.created_at, 'localtime') BETWEEN ? AND ?
       ORDER BY s.created_at`
    )
    .all(dateRange.dateFrom, dateRange.dateTo) as ExportSaleRow[]

  const summaryRows = [
    ['Resumen', ''],
    ['Desde', dateRange.dateFrom],
    ['Hasta', dateRange.dateTo],
    ['Ventas completadas', report.salesCount],
    ['Ventas anuladas', report.cancelledSalesCount],
    ['Ventas brutas', csvMoney(report.grossSalesCents)],
    ['Descuentos', csvMoney(report.discountsCents)],
    ['Ventas netas', csvMoney(report.netSalesCents)],
    ['Ticket promedio', csvMoney(report.averageTicketCents)],
    ['Ingresos por productos', csvMoney(report.productRevenueCents)],
    ['Ingresos por servicios', csvMoney(report.serviceRevenueCents)],
    ['Turnos completados', report.completedAppointments],
    ['Turnos cancelados', report.cancelledAppointments],
    ['Turnos no asistidos', report.noShowAppointments],
    ['Valor de stock al costo', csvMoney(report.inventoryCostCents)],
    ['Valor de stock a la venta', csvMoney(report.inventoryRetailCents)],
    ['Productos con stock bajo', report.lowStockCount],
    ['Productos sin stock', report.outOfStockCount],
    [''],
    ['Productos más vendidos', 'Cantidad', 'Total'],
    ...report.topProducts.map((item) => [
      item.name,
      item.quantity,
      csvMoney(item.totalCents)
    ]),
    [''],
    ['Servicios más vendidos', 'Cantidad', 'Total'],
    ...report.topServices.map((item) => [
      item.name,
      item.quantity,
      csvMoney(item.totalCents)
    ]),
    [''],
    ['Ventas', 'Fecha', 'Cliente', 'Mascota', 'Usuario', 'Subtotal', 'Descuento', 'Total', 'Pago', 'Estado', 'Motivo anulación'],
    ...sales.map((sale) => [
      sale.number,
      sale.date,
      sale.client_name,
      sale.pet_name,
      sale.user_name,
      csvMoney(sale.subtotal_cents),
      csvMoney(sale.discount_cents),
      csvMoney(sale.total_cents),
      sale.payment_method,
      sale.status,
      sale.cancel_reason
    ])
  ].map((row) => row.map(csvCell).join(','))

  return `\ufeff${summaryRows.join('\r\n')}`
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function htmlMoney(cents: number): string {
  return (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS'
  })
}

function htmlTable(
  title: string,
  rows: Array<[string, string | number, string]>
): string {
  if (rows.length === 0) {
    return `<h2>${escapeHtml(title)}</h2><p class="empty">Sin datos en el período.</p>`
  }

  return `<h2>${escapeHtml(title)}</h2>
    <table>
      <thead><tr><th>Concepto</th><th>Cantidad</th><th>Total</th></tr></thead>
      <tbody>
        ${rows
          .map(
            ([name, quantity, total]) =>
              `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(
                quantity
              )}</td><td>${escapeHtml(total)}</td></tr>`
          )
          .join('')}
      </tbody>
    </table>`
}

export function buildReportHtml(
  db: Database.Database,
  dateRange: ReportRangeInput
): string {
  const report = getReport(db, dateRange)
  const businessName = getBusinessName(db)
  const payments = report.paymentBreakdown
    .map(
      (payment) =>
        `<tr><td>${escapeHtml(payment.method)}</td><td>${payment.count}</td><td>${htmlMoney(
          payment.totalCents
        )}</td></tr>`
    )
    .join('')
  const daily = report.salesByDay
    .map(
      (day) =>
        `<tr><td>${escapeHtml(day.date)}</td><td>${day.count}</td><td>${htmlMoney(
          day.totalCents
        )}</td></tr>`
    )
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: Segoe UI, Arial, sans-serif; color: #1d2b24; margin: 32px; font-size: 12px; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    h2 { margin: 26px 0 8px; font-size: 15px; border-bottom: 1px solid #d8e4dd; padding-bottom: 5px; }
    .muted { color: #61736a; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
    .card { border: 1px solid #d8e4dd; border-radius: 8px; padding: 12px; }
    .card span { color: #61736a; font-size: 10px; text-transform: uppercase; }
    .card strong { display: block; font-size: 18px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e7eee9; }
    th { background: #f3f8f5; }
    .empty { color: #61736a; font-style: italic; }
    .footer { margin-top: 28px; color: #61736a; font-size: 10px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(businessName)}</h1>
  <p class="muted">Reporte del ${escapeHtml(dateRange.dateFrom)} al ${escapeHtml(
    dateRange.dateTo
  )}</p>

  <div class="cards">
    <div class="card"><span>Ventas netas</span><strong>${htmlMoney(
      report.netSalesCents
    )}</strong></div>
    <div class="card"><span>Ticket promedio</span><strong>${htmlMoney(
      report.averageTicketCents
    )}</strong></div>
    <div class="card"><span>Turnos completados</span><strong>${
      report.completedAppointments
    }</strong></div>
    <div class="card"><span>Ingresos por servicios</span><strong>${htmlMoney(
      report.serviceRevenueCents
    )}</strong></div>
  </div>

  <h2>Resumen de ventas</h2>
  <table>
    <tbody>
      <tr><td>Ventas completadas</td><td>${report.salesCount}</td></tr>
      <tr><td>Ventas anuladas</td><td>${report.cancelledSalesCount}</td></tr>
      <tr><td>Ventas brutas</td><td>${htmlMoney(report.grossSalesCents)}</td></tr>
      <tr><td>Descuentos</td><td>${htmlMoney(report.discountsCents)}</td></tr>
      <tr><td>Ingresos por productos</td><td>${htmlMoney(
        report.productRevenueCents
      )}</td></tr>
      <tr><td>Turnos cancelados</td><td>${report.cancelledAppointments}</td></tr>
      <tr><td>Turnos no asistidos</td><td>${report.noShowAppointments}</td></tr>
      <tr><td>Stock al costo</td><td>${htmlMoney(
        report.inventoryCostCents
      )}</td></tr>
      <tr><td>Stock a la venta</td><td>${htmlMoney(
        report.inventoryRetailCents
      )}</td></tr>
      <tr><td>Productos con stock bajo</td><td>${report.lowStockCount}</td></tr>
      <tr><td>Productos sin stock</td><td>${report.outOfStockCount}</td></tr>
    </tbody>
  </table>

  ${htmlTable(
    'Productos más vendidos',
    report.topProducts.map((item) => [
      item.name,
      item.quantity,
      htmlMoney(item.totalCents)
    ])
  )}

  ${htmlTable(
    'Servicios más vendidos',
    report.topServices.map((item) => [
      item.name,
      item.quantity,
      htmlMoney(item.totalCents)
    ])
  )}

  <h2>Ventas por día</h2>
  ${
    daily
      ? `<table><thead><tr><th>Fecha</th><th>Ventas</th><th>Total</th></tr></thead><tbody>${daily}</tbody></table>`
      : '<p class="empty">Sin datos en el período.</p>'
  }

  <h2>Formas de pago</h2>
  ${
    payments
      ? `<table><thead><tr><th>Forma de pago</th><th>Operaciones</th><th>Total</th></tr></thead><tbody>${payments}</tbody></table>`
      : '<p class="empty">Sin datos en el período.</p>'
  }

  <p class="footer">Generado por VetGestión el ${escapeHtml(
    new Date().toLocaleString('es-AR')
  )}</p>
</body>
</html>`
}
