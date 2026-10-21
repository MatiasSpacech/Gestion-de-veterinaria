import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Stack,
  Text
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import type { UserRecord } from '@shared/types'
import { api } from '@renderer/lib/api'

interface ResetUserPasswordModalProps {
  opened: boolean
  onClose: () => void
  user: UserRecord | null
}

interface ResetFormValues {
  newPassword: string
  confirmPassword: string
}

const EMPTY_VALUES: ResetFormValues = {
  newPassword: '',
  confirmPassword: ''
}

export function ResetUserPasswordModal({
  opened,
  onClose,
  user
}: ResetUserPasswordModalProps): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const form = useForm<ResetFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      newPassword: (value) =>
        value.length >= 8
          ? null
          : 'La contraseña debe tener al menos 8 caracteres',
      confirmPassword: (value, values) =>
        value === values.newPassword ? null : 'Las contraseñas no coinciden'
    }
  })
  const { reset } = form

  useEffect(() => {
    if (opened) {
      reset()
    }
  }, [opened, reset])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (!user) {
      return
    }

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        await api.users.resetPassword({
          id: user.id,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword
        })
        notifications.show({
          color: 'vetGreen',
          title: 'Contraseña restablecida',
          message: `Se actualizó la contraseña de ${user.name}.`
        })
        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo restablecer la contraseña',
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
      title="Restablecer contraseña"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm">
            Vas a asignar una nueva contraseña a{' '}
            <Text span fw={600}>
              {user?.name}
            </Text>
            .
          </Text>
          <PasswordInput
            label="Nueva contraseña"
            data-autofocus
            {...form.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Confirmar contraseña"
            {...form.getInputProps('confirmPassword')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              Restablecer
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
