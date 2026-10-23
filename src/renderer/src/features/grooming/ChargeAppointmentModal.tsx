import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Group,
  Modal,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Title
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCreditCard, IconInfoCircle } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AppointmentRecord, PaymentMethod } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatCurrency } from '@renderer/lib/format'
import {
  formatMinutes,
  PAYMENT_LABELS,
  PAYMENT_OPTIONS
} from './grooming-constants'

interface ChargeAppointmentModalProps {
  appointment: AppointmentRecord | null
  onClose: () => void
}

export function ChargeAppointmentModal({
  appointment,
  onClose
}: ChargeAppointmentModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')

  const handleClose = (): void => {
    setPaymentMethod('efectivo')
    onClose()
  }

  const chargeMutation = useMutation({
    mutationFn: () =>
      api.grooming.chargeAppointment({
        id: appointment!.id,
        paymentMethod
      }),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['grooming'] }),
        queryClient.invalidateQueries({ queryKey: ['grooming', 'summary'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Turno cobrado',
        message: `${result.sale.number} · ${formatCurrency(result.sale.totalCents)}`
      })
      handleClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo cobrar el turno',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  return (
    <Modal
      opened={appointment !== null}
      onClose={chargeMutation.isPending ? () => undefined : handleClose}
      title="Cobrar turno"
      size="md"
      centered
      closeOnClickOutside={!chargeMutation.isPending}
    >
      {appointment ? (
        <Stack gap="md">
          <Card padding="md" bg="gray.0">
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={4}>
                  {appointment.petName} · {appointment.clientName}
                </Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {appointment.date.split('-').reverse().join('/')} ·{' '}
                  {formatMinutes(appointment.startMinutes)} ·{' '}
                  {appointment.groomerName ?? 'Sin peluquero'}
                </Text>
              </div>
              <Text fz={24} fw={800}>
                {formatCurrency(appointment.totalCents)}
              </Text>
            </Group>
          </Card>

          <div>
            <Text size="sm" fw={600} mb={8}>
              Forma de pago
            </Text>
            <Radio.Group
              value={paymentMethod}
              onChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SimpleGrid cols={3} spacing="sm">
                {PAYMENT_OPTIONS.map((option) => (
                  <Card
                    key={option.value}
                    padding="sm"
                    withBorder
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setPaymentMethod(option.value as PaymentMethod)
                    }
                  >
                    <Radio
                      value={option.value}
                      label={option.label}
                      styles={{ label: { fontWeight: 600 } }}
                    />
                  </Card>
                ))}
              </SimpleGrid>
            </Radio.Group>
          </div>

          {appointment.saleStatus === 'anulada' ? (
            <Alert color="orange" variant="light" icon={<IconInfoCircle />}>
              La venta anterior está anulada. Se generará una nueva venta por el
              total del turno.
            </Alert>
          ) : null}

          <Group justify="space-between">
            <Group gap={6}>
              <IconCreditCard size={17} />
              <Text size="sm" c="dimmed">
                {PAYMENT_LABELS[paymentMethod]}
              </Text>
            </Group>
            <Group gap="sm">
              <Button
                variant="default"
                onClick={handleClose}
                disabled={chargeMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                loading={chargeMutation.isPending}
                onClick={() => chargeMutation.mutate()}
              >
                Confirmar cobro
              </Button>
            </Group>
          </Group>
        </Stack>
      ) : null}
    </Modal>
  )
}
