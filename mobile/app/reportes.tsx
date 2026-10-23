import dayjs from 'dayjs'
import { useFocusEffect } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  ActivityIndicator,
  Chip,
  IconButton,
  Text,
  useTheme
} from 'react-native-paper'
import { formatCurrency } from '@renderer/lib/format'
import type { ReportRangeInput } from '@shared/schemas'
import type { PaymentMethod, ReportData } from '@shared/types'

import { AppButton } from '../src/components/AppButton'
import { AppTextInput } from '../src/components/AppTextInput'
import { EmptyState } from '../src/components/EmptyState'
import { Screen } from '../src/components/Screen'
import { SectionCard } from '../src/components/SectionCard'
import { canAccess } from '../src/data/controllers/permissions'
import { toAppError } from '../src/data/controllers/validation'
import {
  shareReportCsv,
  shareReportPdf
} from '../src/data/report-files'
import {
  buildCsvReport,
  buildHtmlReport,
  getReportData
} from '../src/features/reports/reports-service'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
}

type ReportMode = 'month' | 'custom'
type ShareKind = 'csv' | 'pdf' | null

export default function ReportsScreen() {
  const theme = useTheme()
  const allowed = canAccess('reportes')

  const [mode, setMode] = useState<ReportMode>('month')
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [dateFrom, setDateFrom] = useState(
    dayjs().startOf('month').format('YYYY-MM-DD')
  )
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'))

  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [sharing, setSharing] = useState<ShareKind>(null)

  const range = useMemo<ReportRangeInput>(() => {
    if (mode === 'month') {
      const start = dayjs(`${month}-01`)

      return {
        dateFrom: start.startOf('month').format('YYYY-MM-DD'),
        dateTo: start.endOf('month').format('YYYY-MM-DD')
      }
    }

    return { dateFrom, dateTo }
  }, [dateFrom, dateTo, mode, month])

  const load = useCallback(() => {
    if (!allowed) {
      return
    }

    try {
      setReport(getReportData(range))
      setError(null)
    } catch (caught) {
      setReport(null)
      setError(toAppError(caught).message)
    }
  }, [allowed, range])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const shiftMonth = (offset: number) => {
    if (!dayjs(`${month}-01`).isValid()) {
      return
    }

    setMonth(dayjs(`${month}-01`).add(offset, 'month').format('YYYY-MM'))
  }

  const handleShare = async (kind: Exclude<ShareKind, null>) => {
    setError(null)
    setMessage(null)
    setSharing(kind)

    try {
      if (kind === 'csv') {
        await shareReportCsv(range, buildCsvReport(range))
        setMessage('Reporte CSV compartido')
      } else {
        await shareReportPdf(range, buildHtmlReport(range))
        setMessage('Reporte PDF compartido')
      }
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setSharing(null)
    }
  }

  if (!allowed) {
    return (
      <Screen showBack title="Reportes">
        <EmptyState
          icon="lock-closed-outline"
          title="Sin permiso"
          description="Tu rol no tiene acceso a los reportes."
        />
      </Screen>
    )
  }

  return (
    <Screen
      showBack
      title="Reportes"
      subtitle="Ventas, turnos, stock y ranking del período."
    >
      <SectionCard title="Período">
        <View style={styles.modeChips}>
          <Chip
            onPress={() => setMode('month')}
            selected={mode === 'month'}
          >
            Mensual
          </Chip>
          <Chip
            onPress={() => setMode('custom')}
            selected={mode === 'custom'}
          >
            Personalizado
          </Chip>
        </View>

        {mode === 'month' ? (
          <View style={styles.monthRow}>
            <IconButton
              accessibilityLabel="Mes anterior"
              icon="chevron-left"
              onPress={() => shiftMonth(-1)}
            />
            <Text variant="titleMedium" style={styles.monthLabel}>
              {dayjs(`${month}-01`).format('MMMM [de] YYYY')}
            </Text>
            <IconButton
              accessibilityLabel="Mes siguiente"
              icon="chevron-right"
              onPress={() => shiftMonth(1)}
            />
          </View>
        ) : (
          <View style={styles.twoColumns}>
            <AppTextInput
              label="Desde"
              onChangeText={setDateFrom}
              placeholder="AAAA-MM-DD"
              style={styles.column}
              value={dateFrom}
            />
            <AppTextInput
              label="Hasta"
              onChangeText={setDateTo}
              placeholder="AAAA-MM-DD"
              style={styles.column}
              value={dateTo}
            />
          </View>
        )}
      </SectionCard>

      {error ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : null}

      {message ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
          {message}
        </Text>
      ) : null}

      {report ? (
        <>
          <SectionCard
            title="Resumen"
            subtitle={`${report.dateFrom} al ${report.dateTo}`}
          >
            <View style={styles.metrics}>
              <Metric label="Ventas netas" value={formatCurrency(report.netSalesCents)} />
              <Metric
                label="Ticket promedio"
                value={formatCurrency(report.averageTicketCents)}
              />
              <Metric label="Ventas" value={String(report.salesCount)} />
              <Metric label="Anuladas" value={String(report.cancelledSalesCount)} />
              <Metric
                label="Turnos completados"
                value={String(report.completedAppointments)}
              />
              <Metric
                label="Turnos cancelados"
                value={String(report.cancelledAppointments)}
              />
              <Metric
                label="Productos"
                value={formatCurrency(report.productRevenueCents)}
              />
              <Metric
                label="Servicios"
                value={formatCurrency(report.serviceRevenueCents)}
              />
            </View>
          </SectionCard>

          <SectionCard title="Inventario">
            <View style={styles.metrics}>
              <Metric
                label="Costo"
                value={formatCurrency(report.inventoryCostCents)}
              />
              <Metric
                label="Valor de venta"
                value={formatCurrency(report.inventoryRetailCents)}
              />
              <Metric label="Stock bajo" value={String(report.lowStockCount)} />
              <Metric label="Sin stock" value={String(report.outOfStockCount)} />
            </View>
          </SectionCard>

          <SectionCard title="Más vendidos">
            <Ranking
              emptyLabel="Sin ventas de productos en el período."
              items={report.topProducts}
            />
            <Ranking
              emptyLabel="Sin ventas de servicios en el período."
              items={report.topServices}
            />
          </SectionCard>

          <SectionCard title="Medios de pago">
            {report.paymentBreakdown.length === 0 ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Sin cobros registrados en el período.
              </Text>
            ) : (
              report.paymentBreakdown.map((entry) => (
                <View key={entry.method} style={styles.breakdownRow}>
                  <Text variant="bodyMedium">
                    {PAYMENT_LABELS[entry.method]}
                  </Text>
                  <Text variant="bodyMedium">
                    {`${formatCurrency(entry.totalCents)} · ${entry.count}`}
                  </Text>
                </View>
              ))
            )}
          </SectionCard>
        </>
      ) : (
        <ActivityIndicator color={theme.colors.primary} />
      )}

      <View style={styles.actions}>
        <AppButton
          disabled={!report || sharing !== null}
          icon="file-delimited-outline"
          loading={sharing === 'csv'}
          mode="outlined"
          onPress={() => void handleShare('csv')}
        >
          Compartir CSV
        </AppButton>
        <AppButton
          disabled={!report || sharing !== null}
          icon="file-pdf-box"
          loading={sharing === 'pdf'}
          onPress={() => void handleShare('pdf')}
        >
          Compartir PDF
        </AppButton>
      </View>
    </Screen>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={metricStyles.container}>
      <Text variant="labelSmall">{label}</Text>
      <Text variant="titleSmall" style={metricStyles.value}>
        {value}
      </Text>
    </View>
  )
}

function Ranking({
  emptyLabel,
  items
}: {
  emptyLabel: string
  items: ReportData['topProducts']
}) {
  if (items.length === 0) {
    return <Text variant="bodySmall">{emptyLabel}</Text>
  }

  return (
    <View style={styles.ranking}>
      {items.map((item, index) => (
        <View key={`${item.name}-${index}`} style={styles.breakdownRow}>
          <Text variant="bodyMedium" style={styles.rankingName}>
            {`${index + 1}. ${item.name}`}
          </Text>
          <Text variant="bodySmall">
            {`${item.quantity} · ${formatCurrency(item.totalCents)}`}
          </Text>
        </View>
      ))}
    </View>
  )
}

const metricStyles = StyleSheet.create({
  container: {
    gap: 2,
    width: '47%'
  },
  value: {
    fontWeight: '700'
  }
})

const styles = StyleSheet.create({
  modeChips: {
    flexDirection: 'row',
    gap: 8
  },
  monthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  monthLabel: {
    textTransform: 'capitalize'
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 12
  },
  column: {
    flex: 1
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  ranking: {
    gap: 6
  },
  rankingName: {
    flex: 1
  },
  breakdownRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  actions: {
    gap: 8
  }
})
