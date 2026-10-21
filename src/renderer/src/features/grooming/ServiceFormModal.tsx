import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import type { ServiceCategory, ServiceRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { SERVICE_CATEGORY_OPTIONS } from './grooming-constants'

interface ServiceFormModalProps {
  opened: boolean
  onClose: () => void
  service: ServiceRecord | null
}

interface ServiceFormValues {
  name: string
  category: ServiceCategory
  price: number | string
  durationMinutes: number | string
}

export function ServiceFormModal({
  opened,
  onClose,
  service
}: ServiceFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<ServiceFormValues>({
    initialValues: {
      name: '',
      category: 'peluqueria',
      price: '',
      durationMinutes: 30
    },
    validate: {
      name: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el nombre del servicio',
      price: (value) =>
        Number.isFinite(Number(value)) && Number(value) >= 0
          ? null
          : 'Ingresá un precio válido',
      durationMinutes: (value) =>
        Number(value) >= 5 && Number(value) <= 480
          ? null
          : 'La duración debe estar entre 5 y 480 minutos'
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    setValues({
      name: service?.name ?? '',
      category: service?.category ?? 'peluqueria',
      price: service ? service.priceCents / 100 : '',
      durationMinutes: service?.durationMinutes ?? 30
    })
    resetDirty()
  }, [opened, service, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        const input = {
          name: values.name,
          category: values.category,
          priceCents: Math.round(Number(values.price || 0) * 100),
          durationMinutes: Number(values.durationMinutes)
        }

        if (service) {
          await api.grooming.updateService({ id: service.id, ...input })
        } else {
          await api.grooming.createService(input)
        }

        await queryClient.invalidateQueries({
          queryKey: ['grooming', 'services']
        })
        notifications.show({
          color: 'vetGreen',
          title: service ? 'Servicio actualizado' : 'Servicio creado',
          message: values.name
        })
        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar el servicio',
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
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      size="md"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Nombre"
            placeholder="Baño y corte"
            {...form.getInputProps('name')}
          />

          <Select
            label="Categoría"
            data={SERVICE_CATEGORY_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('category')}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <NumberInput
              label="Precio"
              placeholder="0"
              prefix="$ "
              min={0}
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps('price')}
            />
            <NumberInput
              label="Duración (minutos)"
              min={5}
              max={480}
              step={5}
              {...form.getInputProps('durationMinutes')}
            />
          </SimpleGrid>

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {service ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
