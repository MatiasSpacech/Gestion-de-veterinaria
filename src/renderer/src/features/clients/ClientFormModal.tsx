import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import type { ClientRecord } from '@shared/types'
import { api } from '@renderer/lib/api'

interface ClientFormModalProps {
  opened: boolean
  onClose: () => void
  client?: ClientRecord | null
}

interface ClientFormValues {
  name: string
  docNumber: string
  phone: string
  email: string
  address: string
  notes: string
}

const EMPTY_VALUES: ClientFormValues = {
  name: '',
  docNumber: '',
  phone: '',
  email: '',
  address: '',
  notes: ''
}

export function ClientFormModal({
  opened,
  onClose,
  client
}: ClientFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<ClientFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      name: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el nombre del cliente',
      email: (value) => {
        if (!value.trim()) {
          return null
        }

        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
          ? null
          : 'Ingresá un correo válido'
      },
      phone: (value) =>
        value.trim().length <= 30 ? null : 'El teléfono es demasiado largo'
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    if (client) {
      setValues({
        name: client.name,
        docNumber: client.docNumber ?? '',
        phone: client.phone ?? '',
        email: client.email ?? '',
        address: client.address ?? '',
        notes: client.notes ?? ''
      })
    } else {
      setValues(EMPTY_VALUES)
    }

    resetDirty()
  }, [opened, client, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        if (client) {
          await api.clients.update({
            id: client.id,
            ...values
          })
        } else {
          await api.clients.create(values)
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['clients'] }),
          queryClient.invalidateQueries({ queryKey: ['client'] })
        ])

        notifications.show({
          color: 'vetGreen',
          title: client ? 'Cliente actualizado' : 'Cliente creado',
          message: client
            ? 'Los datos del cliente se actualizaron correctamente.'
            : 'El cliente ya está disponible para asociarle mascotas.'
        })

        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar el cliente',
          message:
            error instanceof Error ? error.message : 'Intentá nuevamente.'
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
      title={client ? 'Editar cliente' : 'Nuevo cliente'}
      size="lg"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Nombre completo"
              placeholder="Nombre y apellido"
              data-autofocus
              {...form.getInputProps('name')}
            />
            <TextInput
              label="DNI / documento"
              placeholder="Opcional"
              {...form.getInputProps('docNumber')}
            />
            <TextInput
              label="Teléfono"
              placeholder="11 5555-1234"
              {...form.getInputProps('phone')}
            />
            <TextInput
              label="Correo electrónico"
              placeholder="cliente@correo.com"
              type="email"
              {...form.getInputProps('email')}
            />
          </SimpleGrid>

          <TextInput
            label="Dirección"
            placeholder="Calle, número, localidad"
            {...form.getInputProps('address')}
          />

          <Textarea
            label="Notas"
            placeholder="Preferencias, observaciones o datos útiles"
            minRows={3}
            autosize
            {...form.getInputProps('notes')}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {client ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
