import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCalendarStats,
  IconCash,
  IconFileSpreadsheet,
  IconFileTypePdf,
  IconScissors,
  IconShoppingCart,
  IconTrendingUp,
  IconWallet,
  type TablerIcon
} from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import dayjs from 'dayjs'
import type { PaymentMethod, ReportData } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatCurrency } from '@renderer/lib/format'
import { useAuth } from '@renderer/lib/use-auth'

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
}

interface RangeForm {
  from: string
  to: string
}

function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

function monthStart(): string {
  return dayjs().startOf('month').format('YYYY-MM-DD')
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  color
}: {
  label: string
  value: string
  detail: string
  icon: TablerIcon
  color: string
}): React.JSX.Element {
  return (
    <Card withBorder padding="lg" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {detail}
          </Text>
        </div>
        <ThemeIcon size={40} radius="xl" variant="light" color={color}>
          <Icon size={21} />
        </ThemeIcon>
      </Group>
    </Card>
  )
}

function RankingsTable({
  title,
  emptyText,
  rows
}: {
  title: string
  emptyText: string
  rows: ReportData['topProducts']
}): React.JSX.Element {
  return (
    <Stack gap="sm">
      <Text fw={600}>{title}</Text>
      {rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          {emptyText}
        </Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Tbody>
            {rows.map((row, index) => (
              <Table.Tr key={`${row.name}-${index}`}>
                <Table.Td w={32}>
                  <Badge size="sm" variant="light" color="vetGreen">
                    {index + 1}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {row.name}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm">{row.quantity} u.</Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" fw={600}>
                    {formatCurrency(row.totalCents)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  )
}

export function ReportsPage(): React.JSX.Element {
  const { hasPermission } = useAuth()
  const [form, setForm] = useState<RangeForm>({
    from: monthStart(),
    to: today()
  })
  const [range, setRange] = useState<RangeForm>({
    from: monthStart(),
    to: today()
  })
  const canExport = hasPermission('reportes')
  const reportQuery = useQuery({
    queryKey: ['reports', range.from, range.to],
    queryFn: () =>
      api.reports.get({ dateFrom: range.from, dateTo: range.to }),
    enabled: canExport
  })
  const report = reportQuery.data
  const exportCsv = useMutation({
    mutationFn: () =>
      api.reports.exportCsv({ dateFrom: range.from, dateTo: range.to }),
    onSuccess: (path) => {
      if (path) {
        notifications.show({
          title: 'Reporte exportado',
          message: path,
          color: 'vetGreen'
        })
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'No se pudo exportar',
        message: error.message,
        color: 'red'
      })
    }
  })
  const exportPdf = useMutation({
    mutationFn: () =>
      api.reports.exportPdf({ dateFrom: range.from, dateTo: range.to }),
    onSuccess: (path) => {
      if (path) {
        notifications.show({
          title: 'Reporte exportado',
          message: path,
          color: 'vetGreen'
        })
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'No se pudo exportar',
        message: error.message,
        color: 'red'
      })
    }
  })

  const applyRange = (): void => {
    if (!form.from || !form.to) {
      notifications.show({
        title: 'Fechas incompletas',
        message: 'Elegí la fecha desde y hasta',
        color: 'orange'
      })
      return
    }

    if (form.from > form.to) {
      notifications.show({
        title: 'Rango inválido',
        message: 'La fecha desde no puede ser posterior a la hasta',
        color: 'orange'
      })
      return
    }

    setRange({ ...form })
  }

  const setPreset = (preset: 'today' | 'week' | 'month' | 'lastMonth'): void => {
    const presets: Record<typeof preset, RangeForm> = {
      today: { from: today(), to: today() },
      week: {
        from: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
        to: today()
      },
      month: { from: monthStart(), to: today() },
      lastMonth: {
        from: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
        to: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD')
      }
    }

    const next = presets[preset]
    setForm(next)
    setRange(next)
  }

  const topDays = report?.salesByDay ?? []
  const maxDayTotal = Math.max(...topDays.map((day) => day.totalCents), 1)

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Reportes</Title>
          <Text c="dimmed" size="sm">
            Ventas, peluquería, medios de pago y estado del inventario.
          </Text>
        </div>
        <Group gap="sm">
          <Button
            variant="light"
            color="vetGreen"
            leftSection={<IconFileSpreadsheet size={17} />}
            onClick={() => exportCsv.mutate()}
            loading={exportCsv.isPending}
            disabled={!report}
          >
            Exportar CSV
          </Button>
          <Button
            variant="light"
            color="red"
            leftSection={<IconFileTypePdf size={17} />}
            onClick={() => exportPdf.mutate()}
            loading={exportPdf.isPending}
            disabled={!report}
          >
            Exportar PDF
          </Button>
        </Group>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <TextInput
            type="date"
            label="Desde"
            value={form.from}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                from: event.currentTarget.value
              }))
            }
            w={170}
          />
          <TextInput
            type="date"
            label="Hasta"
            value={form.to}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                to: event.currentTarget.value
              }))
            }
            w={170}
          />
          <Button onClick={applyRange}>Actualizar</Button>
          <Divider orientation="vertical" />
          <Group gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setPreset('today')}>
              Hoy
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setPreset('week')}>
              Últimos 7 días
            </Button>
            <Button variant="subtle" size="sm" onClick={() => setPreset('month')}>
              Este mes
            </Button>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setPreset('lastMonth')}
            >
              Mes anterior
            </Button>
          </Group>
        </Group>
      </Paper>

      {!canExport && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
          No tenés permiso para consultar reportes.
        </Alert>
      )}

      {reportQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {reportQuery.error.message}
        </Alert>
      )}

      {reportQuery.isPending && canExport ? (
        <Group justify="center" py="xl">
          <Loader color="vetGreen" />
        </Group>
      ) : null}

      {report ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
            <MetricCard
              label="Ventas netas"
              value={formatCurrency(report.netSalesCents)}
              detail={`${report.salesCount} ventas · ${report.cancelledSalesCount} anuladas`}
              icon={IconCash}
              color="vetGreen"
            />
            <MetricCard
              label="Ticket promedio"
              value={formatCurrency(report.averageTicketCents)}
              detail={`Descuentos: ${formatCurrency(report.discountsCents)}`}
              icon={IconTrendingUp}
              color="blue"
            />
            <MetricCard
              label="Turnos completados"
              value={String(report.completedAppointments)}
              detail={`${report.cancelledAppointments} cancelados · ${report.noShowAppointments} ausentes`}
              icon={IconScissors}
              color="violet"
            />
            <MetricCard
              label="Stock bajo"
              value={String(report.lowStockCount)}
              detail={`${report.outOfStockCount} sin stock · ${formatCurrency(report.inventoryRetailCents)} a la venta`}
              icon={IconAlertTriangle}
              color="orange"
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600}>Ingresos por rubro</Text>
                  <IconWallet size={20} />
                </Group>
                <div>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Productos</Text>
                    <Text size="sm" fw={600}>
                      {formatCurrency(report.productRevenueCents)}
                    </Text>
                  </Group>
                  <Progress
                    value={
                      report.productRevenueCents + report.serviceRevenueCents > 0
                        ? (report.productRevenueCents /
                            (report.productRevenueCents +
                              report.serviceRevenueCents)) *
                          100
                        : 0
                    }
                    color="vetGreen"
                  />
                </div>
                <div>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm">Servicios</Text>
                    <Text size="sm" fw={600}>
                      {formatCurrency(report.serviceRevenueCents)}
                    </Text>
                  </Group>
                  <Progress
                    value={
                      report.productRevenueCents + report.serviceRevenueCents > 0
                        ? (report.serviceRevenueCents /
                            (report.productRevenueCents +
                              report.serviceRevenueCents)) *
                          100
                        : 0
                    }
                    color="grape"
                  />
                </div>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Valor de stock al costo
                  </Text>
                  <Text size="sm">{formatCurrency(report.inventoryCostCents)}</Text>
                </Group>
              </Stack>
            </Paper>

            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600}>Formas de pago</Text>
                  <IconShoppingCart size={20} />
                </Group>
                {report.paymentBreakdown.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    Sin cobros en el período.
                  </Text>
                ) : (
                  report.paymentBreakdown.map((payment) => (
                    <Group key={payment.method} justify="space-between">
                      <Group gap="xs">
                        <Badge variant="light">{PAYMENT_LABELS[payment.method]}</Badge>
                        <Text size="sm" c="dimmed">
                          {payment.count} operaciones
                        </Text>
                      </Group>
                      <Text size="sm" fw={600}>
                        {formatCurrency(payment.totalCents)}
                      </Text>
                    </Group>
                  ))
                )}
              </Stack>
            </Paper>

            <Paper withBorder p="lg" radius="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600}>Resumen de turnos</Text>
                  <IconCalendarStats size={20} />
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Completados</Text>
                  <Badge color="green">{report.completedAppointments}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Cancelados</Text>
                  <Badge color="red">{report.cancelledAppointments}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">No asistieron</Text>
                  <Badge color="orange">{report.noShowAppointments}</Badge>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <Paper withBorder p="lg" radius="md">
              <RankingsTable
                title="Productos más vendidos"
                emptyText="No se vendieron productos en el período."
                rows={report.topProducts}
              />
            </Paper>
            <Paper withBorder p="lg" radius="md">
              <RankingsTable
                title="Servicios más vendidos"
                emptyText="No se vendieron servicios en el período."
                rows={report.topServices}
              />
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="lg" radius="md">
            <Text fw={600} mb="md">
              Ventas por día
            </Text>
            {topDays.length === 0 ? (
              <Text size="sm" c="dimmed">
                Sin ventas en el período.
              </Text>
            ) : (
              <Stack gap="sm">
                {topDays.map((day) => (
                  <Group key={day.date} gap="md" wrap="nowrap">
                    <Text size="sm" w={90} c="dimmed">
                      {dayjs(day.date).format('DD/MM/YYYY')}
                    </Text>
                    <Progress
                      value={(day.totalCents / maxDayTotal) * 100}
                      color="vetGreen"
                      style={{ flex: 1 }}
                    />
                    <Text size="sm" w={70} ta="right">
                      {day.count} op.
                    </Text>
                    <Text size="sm" fw={600} w={130} ta="right">
                      {formatCurrency(day.totalCents)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Paper>
        </>
      ) : null}

    </Stack>
  )
}
