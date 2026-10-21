import { useState, type FormEvent } from 'react'
import { Alert, Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SaleDetail } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatCurrency } from '@renderer/lib/format'

interface CancelSaleModalProps {
  sale: SaleDetail
  onClose: () => void
}

export function CancelSaleModal({
  sale,
  onClose
}: CancelSaleModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  const cancelMutation = useMutation({
    mutationFn: () => api.sales.cancel({ id: sale.id, reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Venta anulada',
        message: `Se repuso el stock de ${sale.number}.`
      })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo anular la venta',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (reason.trim().length < 2) {
      notifications.show({
        color: 'red',
        title: 'Motivo inválido',
        message: 'Ingresá al menos dos caracteres.'
      })
      return
    }

    cancelMutation.mutate()
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Anular venta ${sale.number}`}
      centered
      closeOnClickOutside={!cancelMutation.isPending}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={19} />}
          >
            <Text size="sm">
              Se repondrá el stock de los productos y la venta quedará registrada
              como anulada. El total fue {formatCurrency(sale.totalCents)}.
            </Text>
          </Alert>

          <Textarea
            label="Motivo de la anulación"
            placeholder="Ej. Devolución del cliente o error de cobro"
            minRows={3}
            autosize
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            data-autofocus
            required
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={onClose}
              disabled={cancelMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              color="red"
              loading={cancelMutation.isPending}
            >
              Anular venta
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
