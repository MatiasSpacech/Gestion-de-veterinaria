import { useEffect, useState, type FormEvent } from 'react'
import {
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Switch,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useQueryClient } from '@tanstack/react-query'
import { ROLE_LABELS, ROLES, type Role } from '@shared/roles'
import type { UserRecord } from '@shared/types'
import { api } from '@renderer/lib/api'

interface UserFormModalProps {
  opened: boolean
  onClose: () => void
  user?: UserRecord | null
}

interface UserFormValues {
  name: string
  username: string
  password: string
  role: Role
  active: boolean
}

const EMPTY_VALUES: UserFormValues = {
  name: '',
  username: '',
  password: '',
  role: 'vendedor',
  active: true
}

const ROLE_OPTIONS = ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role]
}))

export function UserFormModal({
  opened,
  onClose,
  user
}: UserFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<UserFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      name: (value) =>
        value.trim().length >= 2 ? null : 'Ingresá el nombre del empleado',
      username: (value) =>
        /^[a-zA-Z0-9._-]{3,30}$/.test(value.trim())
          ? null
          : 'Usá entre 3 y 30 letras, números, puntos o guiones',
      password: (value) =>
        user
          ? null
          : value.length >= 8
            ? null
            : 'La contraseña debe tener al menos 8 caracteres'
    }
  })
  const { reset, resetDirty, setValues } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    if (user) {
      setValues({
        name: user.name,
        username: user.username,
        password: '',
        role: user.role,
        active: user.active
      })
    } else {
      setValues(EMPTY_VALUES)
    }

    resetDirty()
  }, [opened, user, setValues, resetDirty])

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      setLoading(true)

      try {
        if (user) {
          await api.users.update({
            id: user.id,
            name: values.name,
            username: values.username,
            role: values.role,
            active: values.active
          })
        } else {
          await api.users.create({
            name: values.name,
            username: values.username,
            password: values.password,
            role: values.role
          })
        }

        await queryClient.invalidateQueries({ queryKey: ['users'] })
        notifications.show({
          color: 'vetGreen',
          title: user ? 'Usuario actualizado' : 'Usuario creado',
          message: user
            ? 'Los datos del empleado se actualizaron.'
            : 'El empleado ya puede iniciar sesión.'
        })
        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: 'No se pudo guardar el usuario',
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
      title={user ? 'Editar usuario' : 'Nuevo usuario'}
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Nombre completo"
            placeholder="Nombre y apellido"
            data-autofocus
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Usuario"
            placeholder="Nombre de inicio de sesión"
            {...form.getInputProps('username')}
          />
          {!user && (
            <PasswordInput
              label="Contraseña inicial"
              placeholder="Mínimo 8 caracteres"
              {...form.getInputProps('password')}
            />
          )}
          <Select
            label="Rol"
            data={ROLE_OPTIONS}
            allowDeselect={false}
            {...form.getInputProps('role')}
          />
          {user && (
            <Switch
              label="Usuario activo"
              description="Los usuarios inactivos no pueden iniciar sesión."
              checked={form.values.active}
              onChange={(event) =>
                form.setFieldValue('active', event.currentTarget.checked)
              }
            />
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {user ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
