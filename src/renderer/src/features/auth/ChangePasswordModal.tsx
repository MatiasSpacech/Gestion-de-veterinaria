import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconLock } from '@tabler/icons-react'
import { useAuth } from '@renderer/lib/use-auth'

interface ChangePasswordModalProps {
  opened: boolean
  onClose: () => void
}

export function ChangePasswordModal({
  opened,
  onClose
}: ChangePasswordModalProps): React.JSX.Element {
  const { changePassword } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    validate: {
      currentPassword: (value) =>
        value.length > 0 ? null : 'Ingresá tu contraseña actual',
      newPassword: (value, values) => {
        if (value.length < 8) {
          return 'Usá al menos 8 caracteres'
        }

        if (value === values.currentPassword) {
          return 'La nueva contraseña debe ser diferente a la actual'
        }

        return null
      },
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : 'Las contraseñas no coinciden'
    }
  })

  const handleClose = (): void => {
    setError(null)
    form.reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    setError(null)

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await changePassword(values)
        notifications.show({
          title: 'Contraseña actualizada',
          message: 'La próxima vez ingresá con tu nueva contraseña.',
          color: 'vetGreen'
        })
        handleClose()
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : 'No se pudo cambiar la contraseña'
        )
      } finally {
        setLoading(false)
      }
    })(event)
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Cambiar contraseña"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {error ? (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />}>
              {error}
            </Alert>
          ) : null}

          <PasswordInput
            label="Contraseña actual"
            leftSection={<IconLock size={16} />}
            data-autofocus
            {...form.getInputProps('currentPassword')}
          />
          <PasswordInput
            label="Nueva contraseña"
            description="Mínimo 8 caracteres"
            leftSection={<IconLock size={16} />}
            {...form.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Repetir nueva contraseña"
            leftSection={<IconLock size={16} />}
            {...form.getInputProps('confirmPassword')}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Guardar contraseña
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
