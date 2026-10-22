import type Database from 'better-sqlite3'
import { getAppointmentSummary, listAppointments } from '@desktop/services/grooming'
import { getInventorySummary, listProducts } from '@desktop/services/inventory'
import { listUpcomingVaccines } from '@desktop/services/pets'
import { getSalesSummary, listSales } from '@desktop/services/sales'
import { getSettings } from '@desktop/services/settings'
import type {
  AppointmentRecord,
  ProductRecord,
  SaleListRecord,
  UpcomingVaccine
} from '@shared/types'

import { getMobileDatabase } from '../../data/db'

export interface DashboardData {
  sales: {
    todayCount: number
    todayTotalCents: number
    todayAverageCents: number
    monthTotalCents: number
  }
  appointments: {
    todayCount: number
    activeCount: number
  }
  inventory: {
    totalProducts: number
    lowStock: number
    outOfStock: number
  }
  vaccines: UpcomingVaccine[]
  lowStockProducts: ProductRecord[]
  todayAppointments: AppointmentRecord[]
  recentSales: SaleListRecord[]
}

export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getDashboard(
  db: Database.Database = getMobileDatabase()
): DashboardData {
  const settings = getSettings(db)
  const today = localDateKey()

  const sales = getSalesSummary(db)
  const appointments = getAppointmentSummary(db)
  const inventory = getInventorySummary(db)

  const vaccines = listUpcomingVaccines(db, settings.vaccineAlertDays)

  const lowStockProducts = listProducts(db, {
    search: '',
    categoryId: null,
    includeInactive: false,
    stockFilter: 'low'
  })

  const todayAppointments = listAppointments(db, {
    dateFrom: today,
    dateTo: today,
    groomerId: null,
    status: 'all'
  })

  const recentSales = listSales(db, {
    search: '',
    status: 'all',
    dateFrom: null,
    dateTo: null,
    limit: 5
  })

  return {
    sales: {
      todayCount: sales.todayCount,
      todayTotalCents: sales.todayTotalCents,
      todayAverageCents: sales.todayAverageCents,
      monthTotalCents: sales.monthTotalCents
    },
    appointments: {
      todayCount: appointments.todayCount,
      activeCount: appointments.activeCount
    },
    inventory: {
      totalProducts: inventory.totalProducts,
      lowStock: inventory.lowStock,
      outOfStock: inventory.outOfStock
    },
    vaccines,
    lowStockProducts,
    todayAppointments,
    recentSales
  }
}
