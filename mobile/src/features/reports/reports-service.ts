import type Database from 'better-sqlite3'
import {
  buildReportCsv,
  buildReportHtml,
  getReport
} from '@desktop/services/reports'
import {
  reportRangeSchema,
  type ReportRangeInput
} from '@shared/schemas'
import type { ReportData } from '@shared/types'

import { requirePermission } from '../../data/controllers/permissions'
import { parseInput } from '../../data/controllers/validation'
import { getMobileDatabase } from '../../data/db'

export function getReportData(
  input: ReportRangeInput,
  db: Database.Database = getMobileDatabase()
): ReportData {
  requirePermission('reportes', db)

  return getReport(db, parseInput(reportRangeSchema, input))
}

export function buildCsvReport(
  input: ReportRangeInput,
  db: Database.Database = getMobileDatabase()
): string {
  requirePermission('reportes', db)

  return buildReportCsv(db, parseInput(reportRangeSchema, input))
}

export function buildHtmlReport(
  input: ReportRangeInput,
  db: Database.Database = getMobileDatabase()
): string {
  requirePermission('reportes', db)

  return buildReportHtml(db, parseInput(reportRangeSchema, input))
}
