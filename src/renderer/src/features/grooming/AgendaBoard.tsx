import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core'
import { IconCalendarEvent, IconClock, IconPlus } from '@tabler/icons-react'
import dayjs from 'dayjs'
import type { AppointmentRecord, GroomerRecord } from '@shared/types'
import { formatCurrency } from '@renderer/lib/format'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { formatMinutes } from './grooming-constants'

interface AgendaBoardProps {
  view: 'day' | 'week'
  anchorDate: string
  dates: string[]
  appointments: AppointmentRecord[]
  groomers: GroomerRecord[]
  onSelect: (appointment: AppointmentRecord) => void
  onCreate: (date: string) => void
  onOpenDay: (date: string) => void
}

export function AgendaBoard({
  view,
  anchorDate,
  dates,
  appointments,
  groomers,
  onSelect,
  onCreate,
  onOpenDay
}: AgendaBoardProps): React.JSX.Element {
  const hasUnassigned = appointments.some(
    (appointment) => appointment.groomerId === null
  )

  if (groomers.length === 0 && !hasUnassigned) {
    return (
      <Card padding="xl">
        <Stack align="center" gap="sm">
          <ThemeIcon size={48} radius="xl" variant="light" color="vetGreen">
            <IconCalendarEvent size={24} />
          </ThemeIcon>
          <Text fw={600}>No hay peluqueros activos</Text>
          <Text size="sm" c="dimmed" ta="center">
            Cargá un peluquero para comenzar a organizar la agenda.
          </Text>
        </Stack>
      </Card>
    )
  }

  if (view === 'day') {
    const columns: Array<{
      key: string
      name: string
      color: string
      groomerId: number | null
    }> = [
      ...groomers.map((groomer) => ({
        key: String(groomer.id),
        name: groomer.name,
        color: groomer.color,
        groomerId: groomer.id as number | null
      })),
      ...(hasUnassigned
        ? [
            {
              key: 'unassigned',
              name: 'Sin peluquero',
              color: '#adb5bd',
              groomerId: null
            }
          ]
        : [])
    ]

    return (
      <SimpleGrid cols={{ base: 1, md: 2, xl: Math.min(columns.length, 3) }}>
        {columns.map((column) => {
          const items = appointments
            .filter(
              (appointment) =>
                appointment.date === anchorDate &&
                appointment.groomerId === column.groomerId
            )
            .sort((a, b) => a.startMinutes - b.startMinutes)

          return (
            <Card key={column.key} padding="lg">
              <Group justify="space-between" mb="md" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 99,
                      background: column.color,
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <Text fw={700}>{column.name}</Text>
                    <Text size="xs" c="dimmed">
                      {items.length === 1
                        ? '1 turno'
                        : `${items.length} turnos`}
                    </Text>
                  </div>
                </Group>
                <ActionIcon
                  variant="light"
                  color="vetGreen"
                  aria-label={
                    column.groomerId === null
                      ? 'Agendar turno sin peluquero'
                      : `Agendar turno con ${column.name}`
                  }
                  onClick={() => onCreate(anchorDate)}
                >
                  <IconPlus size={17} />
                </ActionIcon>
              </Group>

              {items.length === 0 ? (
                <Paper
                  p="lg"
                  withBorder
                  style={{ borderStyle: 'dashed', textAlign: 'center' }}
                >
                  <Text size="sm" c="dimmed">
                    Sin turnos para este día
                  </Text>
                </Paper>
              ) : (
                <Stack gap="sm">
                  {items.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      onClick={() => onSelect(appointment)}
                    />
                  ))}
                </Stack>
              )}
            </Card>
          )
        })}
      </SimpleGrid>
    )
  }

  return (
    <ScrollArea type="auto" offsetScrollbars>
      <Box
        style={{
          minWidth: 1_050,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(145px, 1fr))',
          gap: 12
        }}
      >
        {dates.map((date) => {
          const dayAppointments = appointments
            .filter((appointment) => appointment.date === date)
            .sort((a, b) => a.startMinutes - b.startMinutes)
          const isToday = date === dayjs().format('YYYY-MM-DD')

          return (
            <Card
              key={date}
              padding="sm"
              style={{
                minHeight: 280,
                borderColor: isToday
                  ? 'var(--mantine-color-vetGreen-5)'
                  : undefined
              }}
            >
              <Group justify="space-between" mb="sm" wrap="nowrap">
                <Box
                  component="button"
                  type="button"
                  onClick={() => onOpenDay(date)}
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: 0,
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <Text size="xs" c="dimmed" tt="capitalize">
                    {dayjs(date).locale('es').format('ddd')}
                  </Text>
                  <Text fw={700} c={isToday ? 'vetGreen' : undefined}>
                    {dayjs(date).format('D/M')}
                  </Text>
                </Box>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="vetGreen"
                  aria-label={`Agendar turno el ${date}`}
                  onClick={() => onCreate(date)}
                >
                  <IconPlus size={15} />
                </ActionIcon>
              </Group>

              {dayAppointments.length === 0 ? (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  Sin turnos
                </Text>
              ) : (
                <Stack gap={8}>
                  {dayAppointments.map((appointment) => (
                    <Paper
                      key={appointment.id}
                      component="button"
                      type="button"
                      withBorder
                      p="xs"
                      onClick={() => onSelect(appointment)}
                      style={{
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderLeft: `4px solid ${appointment.groomerColor ?? '#adb5bd'}`
                      }}
                    >
                      <Group justify="space-between" gap={4} wrap="nowrap">
                        <Text size="xs" fw={700}>
                          {formatMinutes(appointment.startMinutes)}
                        </Text>
                        <Badge
                          size="xs"
                          variant="light"
                          color="gray"
                          radius="sm"
                        >
                          {appointment.groomerName?.split(' ')[0] ?? 'Sin asignar'}
                        </Badge>
                      </Group>
                      <Text size="sm" fw={600} truncate mt={2}>
                        {appointment.petName}
                      </Text>
                      <Text size="xs" c="dimmed" truncate>
                        {appointment.clientName}
                      </Text>
                      <AppointmentStatusBadge status={appointment.status} />
                    </Paper>
                  ))}
                </Stack>
              )}
            </Card>
          )
        })}
      </Box>
    </ScrollArea>
  )
}

function AppointmentCard({
  appointment,
  onClick
}: {
  appointment: AppointmentRecord
  onClick: () => void
}): React.JSX.Element {
  return (
    <Paper
      component="button"
      type="button"
      withBorder
      p="md"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        borderLeft: `4px solid ${appointment.groomerColor ?? '#adb5bd'}`
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <div style={{ minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            <IconClock size={14} />
            <Text size="sm" fw={700}>
              {formatMinutes(appointment.startMinutes)} –{' '}
              {formatMinutes(appointment.endMinutes)}
            </Text>
          </Group>
          <Text fw={700} mt={6} truncate>
            {appointment.petName}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {appointment.clientName}
          </Text>
          <Text size="xs" c="dimmed" truncate mt={4}>
            {appointment.services.map((service) => service.name).join(' + ')}
          </Text>
        </div>
        <Stack gap={6} align="flex-end">
          <AppointmentStatusBadge status={appointment.status} />
          <Text size="xs" fw={600}>
            {formatCurrency(appointment.totalCents)}
          </Text>
        </Stack>
      </Group>
    </Paper>
  )
}
