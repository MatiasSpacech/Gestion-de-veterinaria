import { File, Paths } from 'expo-file-system'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { AppError } from '@shared/errors'
import type { ReportRangeInput } from '@shared/schemas'

import { suppressAutoLock } from './lock'

function reportBaseName(range: ReportRangeInput): string {
  return `reporte-${range.dateFrom}_${range.dateTo}`
}

async function shareFile(
  uri: string,
  mimeType: string,
  dialogTitle: string
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new AppError(
      'INTERNAL_ERROR',
      'Este dispositivo no tiene una hoja de compartir disponible'
    )
  }

  await Sharing.shareAsync(uri, { mimeType, dialogTitle })
}

export async function shareReportCsv(
  range: ReportRangeInput,
  content: string
): Promise<void> {
  suppressAutoLock()

  const file = new File(Paths.cache, `${reportBaseName(range)}.csv`)

  file.create({ overwrite: true, intermediates: true })
  file.writeSync(content)

  await shareFile(file.uri, 'text/csv', 'Compartir reporte CSV')
}

export async function shareReportPdf(
  range: ReportRangeInput,
  html: string
): Promise<void> {
  suppressAutoLock()

  const result = await Print.printToFileAsync({ html })
  const source = new File(result.uri)
  const destination = new File(Paths.cache, `${reportBaseName(range)}.pdf`)

  if (destination.exists) {
    destination.delete()
  }

  source.moveSync(destination)

  await shareFile(destination.uri, 'application/pdf', 'Compartir reporte PDF')
}
