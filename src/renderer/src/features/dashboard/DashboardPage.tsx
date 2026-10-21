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
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { MODULE_LABELS } from '@shared/roles'
import { useAuth } from '@renderer/lib/use-auth'

interface Metric {
  label: string
  icon: TablerIcon
  color: string
  hint: string
}

const METRICS: Metric[] = [
  {
    label: 'Ventas de hoy',
    icon: IconShoppingCart,
    color: 'vetGreen',
    hint: 'Disponible en la fase de ventas'
  },
  {
    label: 'Turnos de hoy',
    icon: IconCalendarPlus,
    color: 'blue',
    hint: 'Disponible en la fase de peluquería'
  },
  {
    label: 'Productos con stock bajo',
    icon: IconAlertTriangle,
    color: 'orange',
    hint: 'Disponible en la fase de inventario'
  },
  {
    label: 'Vacunas próximas',
    icon: IconVaccine,
    color: 'violet',
    hint: 'Disponible en la fase de historial'
  }
]

export function DashboardPage(): React.JSX.Element {
  const { user, businessName, permissions } = useAuth()
  const navigate = useNavigate()

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

          return (
            <Card key={metric.label} padding="lg">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                    {metric.label}
                  </Text>
                  <Text fz={30} fw={800} lh={1.15} mt={8}>
                    —
                  </Text>
                  <Text size="xs" c="dimmed" mt={6}>
                    {metric.hint}
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
        title="Base de la aplicación lista"
      >
        <Text size="sm">
          Ya están configurados el acceso, los usuarios y la base de datos local. Los
          módulos de clientes, inventario, ventas y peluquería se incorporan en las
          próximas fases.
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
