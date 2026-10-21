import { useEffect, useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  Textarea
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProductRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatQuantity } from '@renderer/lib/format'

interface StockAdjustmentModalProps {
  opened: boolean
  onClose: () => void
  product: ProductRecord | null
}

interface StockAdjustmentFormValues {
  quantityDelta: number | string
  reason: string
}

export function StockAdjustmentModal({
  opened,
  onClose,
  product
}: StockAdjustmentModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<StockAdjustmentFormValues>({
    initialValues: {
      quantityDelta: '',
      reason: ''
    },
    validate: {
      quantityDelta: (value) => {
        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue !== 0
          ? null
          : 'Ingresá una cantidad distinta de cero'
      },
      reason: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el motivo del ajuste'
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    setValues({ quantityDelta: '', reason: '' })
    resetDirty()
  }, [opened, product, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const delta = Number(form.values.quantityDelta || 0)
  const resultingStock = (product?.stock ?? 0) + delta

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!product) {
      return
    }

    if (resultingStock < 0) {
      form.setFieldError('quantityDelta', 'El ajuste dejaría el stock en negativo')
      return
    }

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await api.inventory.adjustStock({
          productId: product.id,
          quantityDelta: Number(values.quantityDelta),
          reason: values.reason
        })

        await queryClient.invalidateQueries({ queryKey: ['inventory'] })

        notifications.show({
          color: 'vetGreen',
          title: 'Stock ajustado',
          message: `Se actualizó el stock de ${product.name}.`
        })

        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo ajustar el stock',
          message: error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setLoading(false)
      }
    })(event)
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Ajustar stock"
      size="md"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {product ? (
            <Text size="sm" c="dimmed">
              {product.name} · Stock actual:{' '}
              <strong>{formatQuantity(product.stock, product.unit)}</strong>
            </Text>
          ) : null}

          <Alert
            variant="light"
            color="orange"
            icon={<IconAlertTriangle size={18} />}
          >
            <Text size="sm">
              Usá valores positivos para sumar stock y negativos para descontar.
              El ajuste queda registrado en el historial.
            </Text>
          </Alert>

          <NumberInput
            label="Cantidad del ajuste"
            placeholder="Ej. 2 o -1"
            decimalScale={2}
            step={1}
            data-autofocus
            {...form.getInputProps('quantityDelta')}
          />

          {product && delta !== 0 ? (
            <Text size="sm" c={resultingStock < 0 ? 'red' : 'dimmed'}>
              Stock resultante:{' '}
              <strong>{formatQuantity(resultingStock, product.unit)}</strong>
            </Text>
          ) : null}

          <Textarea
            label="Motivo"
            placeholder="Ej. Recuento físico, rotura o vencimiento"
            minRows={2}
            autosize
            required
            {...form.getInputProps('reason')}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" color="orange" loading={loading}>
              Guardar ajuste
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
