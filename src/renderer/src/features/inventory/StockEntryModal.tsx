import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import type { ProductRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatQuantity } from '@renderer/lib/format'

interface StockEntryModalProps {
  opened: boolean
  onClose: () => void
  product: ProductRecord | null
}

interface StockEntryFormValues {
  quantity: number | string
  cost: number | string
  batchCode: string
  expiryDate: string
  reason: string
}

export function StockEntryModal({
  opened,
  onClose,
  product
}: StockEntryModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<StockEntryFormValues>({
    initialValues: {
      quantity: '',
      cost: '',
      batchCode: '',
      expiryDate: '',
      reason: ''
    },
    validate: {
      quantity: (value) => {
        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue > 0
          ? null
          : 'Ingresá una cantidad mayor a cero'
      },
      cost: (value) => {
        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue >= 0
          ? null
          : 'Ingresá un costo válido'
      },
      expiryDate: (value) =>
        !value || /^\d{4}-\d{2}-\d{2}$/.test(value)
          ? null
          : 'Ingresá una fecha válida'
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    setValues({
      quantity: '',
      cost: product ? product.costCents / 100 : '',
      batchCode: '',
      expiryDate: '',
      reason: ''
    })
    resetDirty()
  }, [opened, product, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!product) {
      return
    }

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await api.inventory.registerEntry({
          productId: product.id,
          quantity: Number(values.quantity),
          costCents: Math.round(Number(values.cost || 0) * 100),
          batchCode: values.batchCode,
          expiryDate: values.expiryDate || null,
          reason: values.reason
        })

        await queryClient.invalidateQueries({ queryKey: ['inventory'] })

        notifications.show({
          color: 'vetGreen',
          title: 'Entrada registrada',
          message: `Se agregó stock a ${product.name}.`
        })

        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo registrar la entrada',
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
      title="Registrar entrada de stock"
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

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Cantidad"
              placeholder="0"
              min={0.01}
              decimalScale={2}
              step={1}
              data-autofocus
              {...form.getInputProps('quantity')}
            />
            <NumberInput
              label="Costo unitario"
              placeholder="0,00"
              min={0}
              decimalScale={2}
              fixedDecimalScale
              step={100}
              {...form.getInputProps('cost')}
            />
            <TextInput
              label="Lote"
              placeholder="Opcional"
              {...form.getInputProps('batchCode')}
            />
            <TextInput
              label="Vencimiento"
              type="date"
              {...form.getInputProps('expiryDate')}
            />
          </SimpleGrid>

          <TextInput
            label="Motivo o comprobante"
            placeholder="Ej. Compra a proveedor"
            {...form.getInputProps('reason')}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Registrar entrada
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
