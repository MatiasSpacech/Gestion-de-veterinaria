import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, BrowserWindow, dialog } from 'electron'
import { IPC } from '@shared/ipc'
import {
  reportRangeSchema,
  type ReportRangeInput
} from '@shared/schemas'
import type { ReportData } from '@shared/types'
import { getDb } from '@main/db'
import { logActivity } from '@main/services/activity'
import {
  buildReportCsv,
  buildReportHtml,
  getReport
} from '@main/services/reports'
import { registerProtectedHandler } from './handle'

async function askSavePath(
  event: Electron.IpcMainInvokeEvent,
  extension: 'csv' | 'pdf',
  defaultName: string
): Promise<string | null> {
  const parent = BrowserWindow.fromWebContents(event.sender)
  const options: Electron.SaveDialogOptions = {
    title: extension === 'csv' ? 'Exportar reporte CSV' : 'Exportar reporte PDF',
    defaultPath: join(app.getPath('documents'), defaultName),
    filters: [
      {
        name: extension.toUpperCase(),
        extensions: [extension]
      }
    ]
  }
  const result = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)

  return result.canceled ? null : (result.filePath ?? null)
}

async function renderPdf(html: string): Promise<Buffer> {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    return await window.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: {
        top: 0.4,
        bottom: 0.4,
        left: 0.4,
        right: 0.4
      }
    })
  } finally {
    window.destroy()
  }
}

export function registerReportsHandlers(): void {
  registerProtectedHandler<ReportRangeInput, ReportData>(
    IPC.reports.get,
    reportRangeSchema,
    (input) => getReport(getDb(), input),
    { permission: 'reportes' }
  )

  registerProtectedHandler<ReportRangeInput, string | null>(
    IPC.reports.exportCsv,
    reportRangeSchema,
    async (input, user, event) => {
      const filePath = await askSavePath(
        event,
        'csv',
        `Reporte-${input.dateFrom}_${input.dateTo}.csv`
      )

      if (!filePath) {
        return null
      }

      const db = getDb()
      const csv = buildReportCsv(db, input)
      await writeFile(filePath, csv, 'utf8')
      logActivity(db, {
        userId: user.id,
        action: 'report.export',
        entityType: 'report',
        details: { format: 'csv', dateFrom: input.dateFrom, dateTo: input.dateTo }
      })

      return filePath
    },
    { permission: 'reportes' }
  )

  registerProtectedHandler<ReportRangeInput, string | null>(
    IPC.reports.exportPdf,
    reportRangeSchema,
    async (input, user, event) => {
      const filePath = await askSavePath(
        event,
        'pdf',
        `Reporte-${input.dateFrom}_${input.dateTo}.pdf`
      )

      if (!filePath) {
        return null
      }

      const db = getDb()
      const pdf = await renderPdf(buildReportHtml(db, input))
      await writeFile(filePath, pdf)
      logActivity(db, {
        userId: user.id,
        action: 'report.export',
        entityType: 'report',
        details: { format: 'pdf', dateFrom: input.dateFrom, dateTo: input.dateTo }
      })

      return filePath
    },
    { permission: 'reportes' }
  )
}
