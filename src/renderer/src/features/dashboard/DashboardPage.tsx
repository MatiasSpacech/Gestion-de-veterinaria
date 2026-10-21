import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCalendarPlus,
  IconInfoCircle,
  IconPaw,
  IconShoppingCart,
  IconShoppingCartPlus,
  IconSparkles,
  IconUserPlus,
  IconVaccine,
  type TablerIcon
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { MODULE_LABELS } from '@shared/roles'
import { api } from '@renderer/lib/api'
import { formatCurrency, formatDueIn } from '@renderer/lib/format'
import { useAuth } from '@renderer/lib/use-auth'

interface Metric {
  key: 'sales' | 'appointments' | 'lowStock' | 'vaccines'
  label: string
  icon: TablerIcon
  color: string
  hint: string
}

const METRICS: Metric[] = [
  {
    key: 'sales',
    label: 'Ventas de hoy',
    icon: IconShoppingCart,
    color: 'vetGreen',
    hint: 'Operaciones completadas'
  },
  {
    key: 'appointments',
    label: 'Turnos de hoy',
    icon: IconCalendarPlus,
    color: 'blue',
    hint: 'Disponible en la fase de peluquería'
  },
  {
    key: 'lowStock',
    label: 'Productos con stock bajo',
    icon: IconAlertTriangle,
    color: 'orange',
    hint: 'Reposición pendiente'
  },
  {
    key: 'vaccines',
    label: 'Vacunas próximas',
    icon: IconVaccine,
    color: 'violet',
    hint: 'Próximas dosis y refuerzos'
  }
]

export function DashboardPage(): React.JSX.Element {
  const { user, businessName, permissions, hasPermission } = useAuth()
  const navigate = useNavigate()
  const vaccinesQuery = useQuery({
    queryKey: ['upcoming-vaccines'],
    queryFn: api.pets.upcomingVaccines,
    enabled: hasPermission('mascotas')
  })
  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: api.inventory.summary,
    enabled: hasPermission('inventario')
  })
  const upcomingVaccines = vaccinesQuery.data ?? []
  const salesQuery = useQuery({
    queryKey: ['sales', 'summary'],
    queryFn: api.sales.summary,
    enabled: hasPermission('ventas')
  })
  const inventorySummary = inventoryQuery.data
  const salesSummary = salesQuery.data

  const greeting = (() => {
    const hour = dayjs().hour()

    if (hour < 12) {
      return 'Buen día'
    }

    if (hour < 20) {
      return 'Buenas tardes'
    }

    return 'Buenas noches'
  })()

  const fullDate = dayjs()
    .locale('es')
    .format('dddd D [de] MMMM [de] YYYY')
  const displayDate = fullDate.charAt(0).toUpperCase() + fullDate.slice(1)

  return (
    <Stack gap="lg">
      <Card className="hero-panel" padding="xl" withBorder={false}>
        <div className="hero-panel-content">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="lg">
            <BoxContent
              greeting={greeting}
              userName={user?.name ?? ''}
              businessName={businessName}
              date={displayDate}
            />
            <Group gap="sm" wrap="wrap">
              <Button
                variant="white"
                color="vetGreen"
                leftSection={<IconShoppingCartPlus size={17} />}
                onClick={() => navigate('/ventas')}
              >
                Nueva venta
              </Button>
              <Button
                variant="outline"
                color="white"
                leftSection={<IconCalendarPlus size={17} />}
                onClick={() => navigate('/peluqueria')}
                style={{ borderColor: 'rgba(255,255,255,0.5)' }}
              >
                Nuevo turno
              </Button>
            </Group>
          </Group>
        </div>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        {METRICS.map((metric) => {
          const Icon = metric.icon
          const isVaccineMetric = metric.key === 'vaccines'
          const isInventoryMetric = metric.key === 'lowStock'
          const isSalesMetric = metric.key === 'sales'
          let value = '—'
          let hint = metric.hint

          if (isSalesMetric) {
            value = salesQuery.isPending ? '—' : String(salesSummary?.todayCount ?? 0)
            hint = salesSummary
              ? `${formatCurrency(salesSummary.todayTotalCents)} facturados`
              : 'Operaciones completadas'
          }

          if (isVaccineMetric) {
            value = vaccinesQuery.isPending ? '—' : String(upcomingVaccines.length)
            hint =
              upcomingVaccines.length > 0
                ? `${upcomingVaccines.length} para revisar`
                : 'Sin recordatorios pendientes'
          }

          if (isInventoryMetric) {
            value = inventoryQuery.isPending
              ? '—'
              : String(inventorySummary?.lowStock ?? 0)
            hint = inventorySummary
              ? `${inventorySummary.outOfStock} sin stock · ${inventorySummary.expiring} por vencer`
              : metric.hint
          }

          return (
            <Card key={metric.label} padding="lg">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    {metric.label}
                  </Text>
                  <Text fz={30} fw={800} lh={1.15} mt={8}>
                    {value}
                  </Text>
                  <Text size="xs" c="dimmed" mt={6}>
                    {hint}
                  </Text>
                </div>
                <ThemeIcon
                  size={44}
                  radius="lg"
                  variant="light"
                  color={metric.color}
                  className="metric-icon"
                >
                  <Icon size={23} stroke={1.7} />
                </ThemeIcon>
              </Group>
            </Card>
          )
        })}
      </SimpleGrid>

      {hasPermission('mascotas') && upcomingVaccines.length > 0 ? (
        <Card padding="lg">
          <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
            <div>
              <Title order={4}>Recordatorios de vacunas</Title>
              <Text size="sm" c="dimmed">
                Dosis vencidas o próximas de las mascotas activas.
              </Text>
            </div>
            <Button
              variant="light"
              size="xs"
              leftSection={<IconVaccine size={15} />}
              onClick={() => navigate('/mascotas')}
            >
              Ver mascotas
            </Button>
          </Group>

          <Stack gap="xs">
            {upcomingVaccines.slice(0, 5).map((reminder) => (
              <Group
                key={`${reminder.petId}-${reminder.title}`}
                justify="space-between"
                wrap="nowrap"
                p="sm"
                style={{
                  cursor: 'pointer',
                  borderRadius: 10,
                  background: '#f7faf8'
                }}
                onClick={() => navigate(`/mascotas/${reminder.petId}`)}
              >
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon color="violet" variant="light" size={34} radius="md">
                    <IconVaccine size={17} />
                  </ThemeIcon>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={600} truncate>
                      {reminder.petName} · {reminder.title}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {reminder.clientName} · Próxima dosis:{' '}
                      {dayjs(reminder.nextDueDate).format('DD/MM/YYYY')}
                    </Text>
                  </div>
                </Group>
                <Badge
                  variant="light"
                  color={reminder.daysUntil < 0 ? 'red' : reminder.daysUntil <= 30 ? 'orange' : 'vetGreen'}
                  radius="sm"
                  style={{ flexShrink: 0 }}
                >
                  {formatDueIn(reminder.daysUntil)}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Card>
      ) : null}

      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Card padding="lg" style={{ gridColumn: 'span 2' }}>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>Accesos rápidos</Title>
              <Text size="sm" c="dimmed">
                Las acciones principales del local, a un clic.
              </Text>
            </div>
            <IconSparkles size={20} color="var(--mantine-color-vetGreen-6)" />
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <QuickAction
              icon={IconUserPlus}
              label="Nuevo cliente"
              onClick={() => navigate('/clientes')}
            />
            <QuickAction
              icon={IconPaw}
              label="Nueva mascota"
              onClick={() => navigate('/mascotas')}
            />
            <QuickAction
              icon={IconShoppingCart}
              label="Registrar venta"
              onClick={() => navigate('/ventas')}
            />
            <QuickAction
              icon={IconCalendarPlus}
              label="Agendar turno"
              onClick={() => navigate('/peluqueria')}
            />
          </SimpleGrid>
        </Card>

        <Card padding="lg">
          <Title order={4} mb={4}>
            Tu acceso
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            Módulos habilitados para tu usuario.
          </Text>
          <Group gap={6}>
            {permissions.map((permission) => (
              <Badge
                key={permission}
                variant="light"
                color="vetGreen"
                radius="sm"
                tt="none"
              >
                {MODULE_LABELS[permission]}
              </Badge>
            ))}
          </Group>
        </Card>
      </SimpleGrid>

      <Alert
        variant="light"
        color="vetGreen"
        icon={<IconInfoCircle size={20} />}
        title="Clientes, mascotas, inventario y ventas disponibles"
      >
        <Text size="sm">
          Ya podés gestionar clientes, mascotas, historial clínico, inventario con
          lotes y vencimientos, y registrar ventas con control de stock y anulación.
          Peluquería y reportes se incorporan en las próximas fases.
        </Text>
      </Alert>
    </Stack>
  )
}

function BoxContent({
  greeting,
  userName,
  businessName,
  date
}: {
  greeting: string
  userName: string
  businessName: string
  date: string
}): React.JSX.Element {
  return (
    <div>
      <Badge variant="white" color="vetGreen" radius="sm" mb="md">
        Panel general
      </Badge>
      <Title order={1} fz={{ base: 27, md: 34 }} lh={1.15}>
        {greeting}, {userName.split(' ')[0]}.
      </Title>
      <Text mt={8} style={{ color: 'rgba(255,255,255,0.82)' }}>
        {businessName} · {date}
      </Text>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick
}: {
  icon: TablerIcon
  label: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <Paper
      component="button"
      type="button"
      onClick={onClick}
      withBorder
      p="md"
      style={{
        cursor: 'pointer',
        textAlign: 'left',
        background: '#fbfdfc',
        transition: 'border-color 120ms ease, background 120ms ease'
      }}
    >
      <Stack gap={8} align="flex-start">
        <ThemeIcon variant="light" color="vetGreen" size={36} radius="md">
          <Icon size={19} stroke={1.8} />
        </ThemeIcon>
        <Text size="sm" fw={600}>
          {label}
        </Text>
      </Stack>
    </Paper>
  )
}
