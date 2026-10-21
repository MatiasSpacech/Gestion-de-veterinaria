import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  Autocomplete,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconInfoCircle } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import type { ProductCategory, ProductRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { UNIT_OPTIONS } from './inventory-constants'

interface ProductFormModalProps {
  opened: boolean
  onClose: () => void
  product?: ProductRecord | null
  categories: ProductCategory[]
}

interface ProductFormValues {
  name: string
  categoryId: string | null
  sku: string
  barcode: string
  unit: string
  cost: number | string
  price: number | string
  minStock: number | string
  notes: string
}

const EMPTY_VALUES: ProductFormValues = {
  name: '',
  categoryId: null,
  sku: '',
  barcode: '',
  unit: 'unidad',
  cost: '',
  price: '',
  minStock: '',
  notes: ''
}

export function ProductFormModal({
  opened,
  onClose,
  product,
  categories
}: ProductFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<ProductFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      name: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el nombre del producto',
      unit: (value) =>
        value.trim().length > 0 ? null : 'Ingresá la unidad de venta',
      cost: (value) => {
        if (value === '' || value === null || value === undefined) {
          return null
        }

        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue >= 0
          ? null
          : 'Ingresá un costo válido'
      },
      price: (value) => {
        if (value === '' || value === null || value === undefined) {
          return 'Ingresá el precio de venta'
        }

        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue >= 0
          ? null
          : 'Ingresá un precio válido'
      },
      minStock: (value) => {
        if (value === '' || value === null || value === undefined) {
          return null
        }

        const numberValue = Number(value)
        return Number.isFinite(numberValue) && numberValue >= 0
          ? null
          : 'Ingresá un stock mínimo válido'
      }
    }
  })
  const { reset, resetDirty, setValues } = form

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: String(category.id),
        label: category.active ? category.name : `${category.name} (inactiva)`
      })),
    [categories]
  )

  useEffect(() => {
    if (!opened) {
      return
    }

    if (product) {
      setValues({
        name: product.name,
        categoryId: product.categoryId ? String(product.categoryId) : null,
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        unit: product.unit,
        cost: product.costCents / 100,
        price: product.priceCents / 100,
        minStock: product.minStock,
        notes: product.notes ?? ''
      })
    } else {
      setValues(EMPTY_VALUES)
    }

    resetDirty()
  }, [opened, product, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        const payload = {
          name: values.name,
          categoryId: values.categoryId ? Number(values.categoryId) : null,
          sku: values.sku,
          barcode: values.barcode,
          unit: values.unit,
          costCents: Math.round(Number(values.cost || 0) * 100),
          priceCents: Math.round(Number(values.price || 0) * 100),
          minStock: Number(values.minStock || 0),
          notes: values.notes
        }

        if (product) {
          await api.inventory.updateProduct({ id: product.id, ...payload })
        } else {
          await api.inventory.createProduct(payload)
        }

        await queryClient.invalidateQueries({ queryKey: ['inventory'] })

        notifications.show({
          color: 'vetGreen',
          title: product ? 'Producto actualizado' : 'Producto creado',
          message: product
            ? 'Los datos del producto se actualizaron correctamente.'
            : 'Ya podés registrar una entrada de stock para el producto.'
        })

        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar el producto',
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
      title={product ? 'Editar producto' : 'Nuevo producto'}
      size="lg"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Nombre"
            placeholder="Ej. Alimento balanceado 10 kg"
            data-autofocus
            {...form.getInputProps('name')}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Categoría"
              placeholder="Sin categoría"
              searchable
              clearable
              data={categoryOptions}
              {...form.getInputProps('categoryId')}
            />
            <Autocomplete
              label="Unidad"
              data={UNIT_OPTIONS}
              {...form.getInputProps('unit')}
            />
            <TextInput
              label="SKU"
              placeholder="Opcional"
              {...form.getInputProps('sku')}
            />
            <TextInput
              label="Código de barras"
              placeholder="Opcional"
              {...form.getInputProps('barcode')}
            />
            <NumberInput
              label="Costo"
              placeholder="0,00"
              min={0}
              decimalScale={2}
              fixedDecimalScale
              step={100}
              {...form.getInputProps('cost')}
            />
            <NumberInput
              label="Precio de venta"
              placeholder="0,00"
              min={0}
              decimalScale={2}
              fixedDecimalScale
              step={100}
              {...form.getInputProps('price')}
            />
            <NumberInput
              label="Stock mínimo"
              description="Se usa para generar la alerta de reposición."
              min={0}
              decimalScale={2}
              step={1}
              {...form.getInputProps('minStock')}
            />
          </SimpleGrid>

          <Textarea
            label="Notas"
            placeholder="Observaciones del producto"
            minRows={2}
            autosize
            {...form.getInputProps('notes')}
          />

          <Alert
            variant="light"
            color="vetGreen"
            icon={<IconInfoCircle size={18} />}
          >
            <Text size="sm">
              El stock inicial se carga desde <strong>Registrar entrada</strong>,
              indicando lote y vencimiento cuando corresponda.
            </Text>
          </Alert>

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {product ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
