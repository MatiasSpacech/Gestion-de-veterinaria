import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  ColorInput,
  Group,
  Modal,
  Stack,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import type { GroomerRecord } from '@shared/types'
import { api } from '@renderer/lib/api'

interface GroomerFormModalProps {
  opened: boolean
  onClose: () => void
  groomer: GroomerRecord | null
}

interface GroomerFormValues {
  name: string
  phone: string
  color: string
}

const DEFAULT_COLOR = '#0ca678'
const COLOR_SWATCHES = [
  '#0ca678',
  '#1971c2',
  '#7048e8',
  '#e8590c',
  '#c2255c',
  '#2f9e44',
  '#1098ad',
  '#f08c00'
]

export function GroomerFormModal({
  opened,
  onClose,
  groomer
}: GroomerFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<GroomerFormValues>({
    initialValues: {
      name: '',
      phone: '',
      color: DEFAULT_COLOR
    },
    validate: {
      name: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el nombre del peluquero',
      color: (value) =>
        /^#[0-9a-fA-F]{6}$/.test(value) ? null : 'Elegí un color válido'
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    setValues({
      name: groomer?.name ?? '',
      phone: groomer?.phone ?? '',
      color: groomer?.color ?? DEFAULT_COLOR
    })
    resetDirty()
  }, [opened, groomer, setValues, resetDirty])

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
          phone: values.phone,
          color: values.color
        }

        if (groomer) {
          await api.grooming.updateGroomer({ id: groomer.id, ...input })
        } else {
          await api.grooming.createGroomer(input)
        }

        await queryClient.invalidateQueries({
          queryKey: ['grooming', 'groomers']
        })
        notifications.show({
          color: 'vetGreen',
          title: groomer ? 'Peluquero actualizado' : 'Peluquero creado',
          message: values.name
        })
        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar el peluquero',
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
      title={groomer ? 'Editar peluquero' : 'Nuevo peluquero'}
      size="md"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Nombre"
            placeholder="Nombre del peluquero"
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Teléfono"
            placeholder="Número de contacto"
            {...form.getInputProps('phone')}
          />
          <ColorInput
            label="Color en la agenda"
            format="hex"
            swatches={COLOR_SWATCHES}
            swatchesPerRow={8}
            {...form.getInputProps('color')}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {groomer ? 'Guardar cambios' : 'Crear peluquero'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
