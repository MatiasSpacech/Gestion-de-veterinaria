import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Tabs,
  Text,
  Title
} from '@mantine/core'
import {
  IconAlertCircle,
  IconCalendarPlus,
  IconChevronLeft,
  IconChevronRight,
  IconPlus
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { AppointmentRecord } from '@shared/types'
import type { ListAppointmentsInput } from '@shared/schemas'
import { api } from '@renderer/lib/api'
import { useAuth } from '@renderer/lib/use-auth'
import { AgendaBoard } from './AgendaBoard'
import { AppointmentDetailModal } from './AppointmentDetailModal'
import { AppointmentFormModal } from './AppointmentFormModal'
import { ChargeAppointmentModal } from './ChargeAppointmentModal'
import { GroomersPanel } from './GroomersPanel'
import { ServicesPanel } from './ServicesPanel'
import { APPOINTMENT_STATUS_LABELS } from './grooming-constants'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  ...Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label
  }))
]

function weekStart(date: string): dayjs.Dayjs {
  const value = dayjs(date)
  return value.subtract((value.day() + 6) % 7, 'day')
}

export function GroomingPage(): React.JSX.Element {
  const { hasPermission, user, businessName } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<string | null>('agenda')
  const [view, setView] = useState<'day' | 'week'>('day')
  const [anchorDate, setAnchorDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [groomerFilter, setGroomerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formOpened, setFormOpened] = useState(false)
  const [formDate, setFormDate] = useState(anchorDate)
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRecord | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [chargingAppointment, setChargingAppointment] =
    useState<AppointmentRecord | null>(null)

  const servicesQuery = useQuery({
    queryKey: ['grooming', 'services', { includeInactive: true }],
    queryFn: () => api.grooming.listServices({ includeInactive: true }),
    enabled: hasPermission('peluqueria')
  })
  const groomersQuery = useQuery({
    queryKey: ['grooming', 'groomers', { includeInactive: true }],
    queryFn: () => api.grooming.listGroomers({ includeInactive: true }),
    enabled: hasPermission('peluqueria')
  })

  const services = servicesQuery.data ?? []
  const groomers = groomersQuery.data ?? []
  const activeServices = services.filter(
    (service) => service.active && service.category === 'peluqueria'
  )
  const activeGroomers = groomers.filter((groomer) => groomer.active)

  const dates = useMemo(() => {
    if (view === 'day') {
      return [anchorDate]
    }

    const start = weekStart(anchorDate)
    return Array.from({ length: 7 }, (_, index) =>
      start.add(index, 'day').format('YYYY-MM-DD')
    )
  }, [anchorDate, view])

  const dateFrom = dates[0] ?? anchorDate
  const dateTo = dates[dates.length - 1] ?? anchorDate
  const selectedGroomerId =
    groomerFilter === 'all' ? null : Number(groomerFilter)

  const appointmentsQuery = useQuery({
    queryKey: [
      'grooming',
      'appointments',
      {
        dateFrom,
        dateTo,
        groomerId: selectedGroomerId,
        status: statusFilter
      }
    ],
    queryFn: () =>
      api.grooming.listAppointments({
        dateFrom,
        dateTo,
        groomerId: selectedGroomerId,
        status: statusFilter as ListAppointmentsInput['status']
      }),
    enabled: hasPermission('peluqueria')
  })

  if (!hasPermission('peluqueria')) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={20} />} title="Sin acceso">
        No tenés permisos para acceder a peluquería.
      </Alert>
    )
  }

  const appointments = appointmentsQuery.data ?? []
  const boardGroomers =
    selectedGroomerId === null
      ? activeGroomers
      : activeGroomers.filter((groomer) => groomer.id === selectedGroomerId)
  const activeCount = appointments.filter((appointment) =>
    ['pendiente', 'confirmado', 'en_proceso'].includes(appointment.status)
  ).length
  const completedCount = appointments.filter(
    (appointment) => appointment.status === 'completado'
  ).length
  const missingConfig = activeGroomers.length === 0 || activeServices.length === 0

  const groomerOptions = [
    { value: 'all', label: 'Todos los peluqueros' },
    ...activeGroomers.map((groomer) => ({
      value: String(groomer.id),
      label: groomer.name
    }))
  ]

  const rangeLabel =
    view === 'day'
      ? dayjs(anchorDate).locale('es').format('dddd D [de] MMMM [de] YYYY')
      : `${dayjs(dateFrom).format('DD/MM')} al ${dayjs(dateTo).format(
          'DD/MM/YYYY'
        )}`

  const moveDate = (direction: number): void => {
    const amount = view === 'day' ? direction : direction * 7
    setAnchorDate(dayjs(anchorDate).add(amount, 'day').format('YYYY-MM-DD'))
  }

  const openCreate = (date = anchorDate): void => {
    setFormDate(date)
    setEditingAppointment(null)
    setFormOpened(true)
  }

  const openEdit = (appointment: AppointmentRecord): void => {
    setDetailId(null)
    setFormDate(appointment.date)
    setEditingAppointment(appointment)
    setFormOpened(true)
  }

  const openCharge = (appointment: AppointmentRecord): void => {
    setDetailId(null)
    setChargingAppointment(appointment)
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <div>
          <Title order={2}>Peluquería</Title>
          <Text c="dimmed" mt={4}>
            Agenda diaria y semanal, servicios, estados y cobro de turnos.
          </Text>
        </div>
        <Button
          leftSection={<IconCalendarPlus size={17} />}
          onClick={() => openCreate()}
          disabled={missingConfig}
        >
          Nuevo turno
        </Button>
      </Group>

      <Tabs value={tab} onChange={setTab}>
        <Tabs.List>
          <Tabs.Tab value="agenda" leftSection={<IconCalendarPlus size={16} />}>
            Agenda
          </Tabs.Tab>
          {isAdmin ? (
            <Tabs.Tab value="servicios" leftSection={<IconPlus size={16} />}>
              Servicios
            </Tabs.Tab>
          ) : null}
          {isAdmin ? (
            <Tabs.Tab value="peluqueros" leftSection={<IconPlus size={16} />}>
              Peluqueros
            </Tabs.Tab>
          ) : null}
        </Tabs.List>

        <Tabs.Panel value="agenda" pt="lg">
          <Stack gap="md">
            {missingConfig ? (
              <Alert
                color="orange"
                variant="light"
                icon={<IconAlertCircle size={20} />}
                title="Configuración pendiente"
              >
                <Stack gap="sm">
                  <Text size="sm">
                    {activeGroomers.length === 0 && activeServices.length === 0
                      ? 'Cargá al menos un peluquero y un servicio de peluquería para agendar turnos.'
                      : activeGroomers.length === 0
                        ? 'Cargá al menos un peluquero activo para agendar turnos.'
                        : 'Cargá al menos un servicio de peluquería activo para agendar turnos.'}
                  </Text>
                  {isAdmin ? (
                    <Group>
                      {activeGroomers.length === 0 ? (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => setTab('peluqueros')}
                        >
                          Cargar peluquero
                        </Button>
                      ) : null}
                      {activeServices.length === 0 ? (
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => setTab('servicios')}
                        >
                          Cargar servicio
                        </Button>
                      ) : null}
                    </Group>
                  ) : null}
                </Stack>
              </Alert>
            ) : null}

            <Card padding="md">
              <Group justify="space-between" align="center" wrap="wrap" gap="md">
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="default"
                    aria-label="Período anterior"
                    onClick={() => moveDate(-1)}
                  >
                    <IconChevronLeft size={17} />
                  </ActionIcon>
                  <Button
                    variant="default"
                    onClick={() =>
                      setAnchorDate(dayjs().format('YYYY-MM-DD'))
                    }
                  >
                    Hoy
                  </Button>
                  <ActionIcon
                    variant="default"
                    aria-label="Período siguiente"
                    onClick={() => moveDate(1)}
                  >
                    <IconChevronRight size={17} />
                  </ActionIcon>
                  <div>
                    <Text fw={700} tt="capitalize">
                      {rangeLabel}
                    </Text>
                    <Group gap={6} mt={2}>
                      <Badge size="xs" variant="light" color="gray" radius="sm">
                        {appointments.length} turnos
                      </Badge>
                      <Badge size="xs" variant="light" color="blue" radius="sm">
                        {activeCount} por atender
                      </Badge>
                      <Badge
                        size="xs"
                        variant="light"
                        color="vetGreen"
                        radius="sm"
                      >
                        {completedCount} completados
                      </Badge>
                    </Group>
                  </div>
                </Group>

                <Group gap="sm" wrap="wrap">
                  <SegmentedControl
                    value={view}
                    onChange={(value) => setView(value as 'day' | 'week')}
                    data={[
                      { value: 'day', label: 'Día' },
                      { value: 'week', label: 'Semana' }
                    ]}
                  />
                  <Select
                    data={groomerOptions}
                    value={groomerFilter}
                    onChange={(value) => setGroomerFilter(value ?? 'all')}
                    allowDeselect={false}
                    w={190}
                    aria-label="Filtrar por peluquero"
                  />
                  <Select
                    data={STATUS_FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value ?? 'all')}
                    allowDeselect={false}
                    w={170}
                    aria-label="Filtrar por estado"
                  />
                </Group>
              </Group>
            </Card>

            {appointmentsQuery.isPending ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : appointmentsQuery.isError ? (
              <Alert color="red" icon={<IconAlertCircle size={20} />}>
                No se pudo cargar la agenda.
              </Alert>
            ) : (
              <AgendaBoard
                view={view}
                anchorDate={anchorDate}
                dates={dates}
                appointments={appointments}
                groomers={boardGroomers}
                onSelect={(appointment) => setDetailId(appointment.id)}
                onCreate={openCreate}
                onOpenDay={(date) => {
                  setAnchorDate(date)
                  setView('day')
                }}
              />
            )}
          </Stack>
        </Tabs.Panel>

        {isAdmin ? (
          <Tabs.Panel value="servicios" pt="lg">
            <ServicesPanel services={services} />
          </Tabs.Panel>
        ) : null}

        {isAdmin ? (
          <Tabs.Panel value="peluqueros" pt="lg">
            <GroomersPanel groomers={groomers} />
          </Tabs.Panel>
        ) : null}
      </Tabs>

      <AppointmentFormModal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        appointment={editingAppointment}
        defaultDate={formDate}
        groomers={groomers}
        services={services}
      />

      <AppointmentDetailModal
        appointmentId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={openEdit}
        onCharge={openCharge}
        businessName={businessName}
      />

      <ChargeAppointmentModal
        appointment={chargingAppointment}
        onClose={() => setChargingAppointment(null)}
      />
    </Stack>
  )
}
