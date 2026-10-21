import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Title
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconBrandWhatsapp,
  IconCash,
  IconEdit,
  IconPhone
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { AppointmentRecord, AppointmentStatus } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatCurrency } from '@renderer/lib/format'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import {
  APPOINTMENT_STATUS_LABELS,
  buildWhatsAppUrl,
  formatMinutes,
  STATUS_ACTIONS
} from './grooming-constants'

interface AppointmentDetailModalProps {
  appointmentId: number | null
  onClose: () => void
  onEdit: (appointment: AppointmentRecord) => void
  onCharge: (appointment: AppointmentRecord) => void
  businessName: string
}

export function AppointmentDetailModal({
  appointmentId,
  onClose,
  onEdit,
  onCharge,
  businessName
}: AppointmentDetailModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const modals = useModals()
  const appointmentQuery = useQuery({
    queryKey: ['grooming', 'appointment', appointmentId],
    queryFn: () => api.grooming.getAppointment({ id: appointmentId! }),
    enabled: appointmentId !== null
  })

  const statusMutation = useMutation({
    mutationFn: (input: { id: number; status: AppointmentStatus }) =>
      api.grooming.setAppointmentStatus(input),
    onSuccess: async (appointment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['grooming'] }),
        queryClient.invalidateQueries({ queryKey: ['grooming', 'summary'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Turno actualizado',
        message: `Estado: ${APPOINTMENT_STATUS_LABELS[appointment.status]}`
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo actualizar el turno',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  const appointment = appointmentQuery.data
  const whatsappUrl = appointment
    ? buildWhatsAppUrl(appointment, businessName)
    : null

  const applyStatus = (
    status: AppointmentStatus,
    label: string,
    confirm?: boolean
  ): void => {
    if (!appointment) {
      return
    }

    if (!confirm) {
      statusMutation.mutate({ id: appointment.id, status })
      return
    }

    modals.openConfirmModal({
      title: label,
      centered: true,
      children: (
        <Text size="sm">
          ¿Querés marcar el turno de {appointment.petName} como{' '}
          {APPOINTMENT_STATUS_LABELS[status].toLowerCase()}?
        </Text>
      ),
      labels: { confirm: label, cancel: 'Volver' },
      confirmProps: { color: status === 'cancelado' ? 'red' : 'gray' },
      onConfirm: () => statusMutation.mutate({ id: appointment.id, status })
    })
  }

  return (
    <Modal
      opened={appointmentId !== null}
      onClose={onClose}
      title="Detalle del turno"
      size="lg"
      centered
    >
      {appointmentQuery.isPending ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : appointmentQuery.isError ? (
        <Alert color="red" icon={<IconAlertCircle />}>
          No se pudo cargar el turno.
        </Alert>
      ) : appointment ? (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Title order={3}>
                {appointment.petName} · {appointment.clientName}
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                {dayjs(appointment.date)
                  .locale('es')
                  .format('dddd D [de] MMMM [de] YYYY')}{' '}
                · {formatMinutes(appointment.startMinutes)} a{' '}
                {formatMinutes(appointment.endMinutes)}
              </Text>
            </div>
            <AppointmentStatusBadge status={appointment.status} />
          </Group>

          <Card padding="md" bg="gray.0">
            <Group justify="space-between" wrap="wrap">
              <Group gap="xs">
                <Badge
                  variant="light"
                  radius="sm"
                  color="gray"
                  leftSection={
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 99,
                        background: appointment.groomerColor,
                        display: 'inline-block'
                      }}
                    />
                  }
                >
                  {appointment.groomerName}
                </Badge>
                {appointment.clientPhone ? (
                  <Group gap={4}>
                    <IconPhone size={14} />
                    <Text size="sm">{appointment.clientPhone}</Text>
                  </Group>
                ) : null}
              </Group>
              <Text fw={700}>{formatCurrency(appointment.totalCents)}</Text>
            </Group>
          </Card>

          <div>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={6}>
              Servicios
            </Text>
            <Stack gap={6}>
              {appointment.services.map((service) => (
                <Group key={service.id} justify="space-between">
                  <Text size="sm">
                    {service.name}{' '}
                    <Text span size="xs" c="dimmed">
                      · {service.durationMinutes} min
                    </Text>
                  </Text>
                  <Text size="sm">{formatCurrency(service.priceCents)}</Text>
                </Group>
              ))}
            </Stack>
          </div>

          {appointment.notes ? (
            <>
              <Divider />
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={4}>
                  Notas
                </Text>
                <Text size="sm">{appointment.notes}</Text>
              </div>
            </>
          ) : null}

          {appointment.saleNumber ? (
            <>
              <Divider />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Venta vinculada
                </Text>
                <Group gap="xs">
                  <Text size="sm" fw={600}>
                    {appointment.saleNumber}
                  </Text>
                  <Badge
                    variant="light"
                    color={
                      appointment.saleStatus === 'anulada' ? 'red' : 'vetGreen'
                    }
                    radius="sm"
                  >
                    {appointment.saleStatus === 'anulada' ? 'Anulada' : 'Cobrada'}
                  </Badge>
                </Group>
              </Group>
            </>
          ) : null}

          <Divider />

          <Group justify="space-between" gap="sm" wrap="wrap">
            <Group gap="sm">
              <Button
                variant="light"
                color="gray"
                leftSection={<IconEdit size={16} />}
                disabled={
                  appointment.status !== 'pendiente' &&
                  appointment.status !== 'confirmado'
                }
                onClick={() => onEdit(appointment)}
              >
                Editar
              </Button>
              <Button
                component="a"
                href={whatsappUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                color="green"
                leftSection={<IconBrandWhatsapp size={17} />}
                disabled={!whatsappUrl}
                onClick={(event) => {
                  if (!whatsappUrl) {
                    event.preventDefault()
                  }
                }}
              >
                WhatsApp
              </Button>
            </Group>

            <Group gap="sm">
              {(STATUS_ACTIONS[appointment.status] ?? []).map((action) => (
                <Button
                  key={action.status}
                  variant="light"
                  color={action.color}
                  loading={
                    statusMutation.isPending &&
                    statusMutation.variables?.status === action.status
                  }
                  onClick={() =>
                    applyStatus(action.status, action.label, action.confirm)
                  }
                >
                  {action.label}
                </Button>
              ))}
              {appointment.status === 'completado' &&
              (!appointment.saleNumber ||
                appointment.saleStatus === 'anulada') ? (
                <Button
                  leftSection={<IconCash size={17} />}
                  onClick={() => onCharge(appointment)}
                >
                  {appointment.saleStatus === 'anulada'
                    ? 'Volver a cobrar'
                    : 'Cobrar turno'}
                </Button>
              ) : null}
            </Group>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  )
}
