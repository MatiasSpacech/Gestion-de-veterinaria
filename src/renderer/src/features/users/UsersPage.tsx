import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
  Tooltip
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  IconAlertTriangle,
  IconEdit,
  IconKey,
  IconShieldLock,
  IconUserCheck,
  IconUserOff,
  IconUserPlus
} from '@tabler/icons-react'
import { ROLE_LABELS, type Role } from '@shared/roles'
import type { UserRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatDateTime } from '@renderer/lib/format'
import { useAuth } from '@renderer/lib/use-auth'
import { ResetUserPasswordModal } from './ResetUserPasswordModal'
import { RolePermissionsTab } from './RolePermissionsTab'
import { UserFormModal } from './UserFormModal'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'vetGreen',
  vendedor: 'blue',
  peluquero: 'grape'
}

export function UsersPage(): React.JSX.Element {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const modals = useModals()
  const [formOpen, setFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetUser, setResetUser] = useState<UserRecord | null>(null)
  const isAdmin = currentUser?.role === 'admin'
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: api.users.list,
    enabled: isAdmin
  })

  const openCreate = (): void => {
    setEditingUser(null)
    setFormOpen(true)
  }

  const openEdit = (user: UserRecord): void => {
    setEditingUser(user)
    setFormOpen(true)
  }

  const openReset = (user: UserRecord): void => {
    setResetUser(user)
    setResetOpen(true)
  }

  const toggleActive = async (user: UserRecord): Promise<void> => {
    try {
      await api.users.update({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        active: !user.active
      })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({
        color: 'vetGreen',
        title: user.active ? 'Usuario desactivado' : 'Usuario activado',
        message: `${user.name} ${user.active ? 'ya no puede' : 'ya puede'} iniciar sesión.`
      })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo actualizar el usuario',
        message:
          error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  }

  const confirmToggle = (user: UserRecord): void => {
    modals.openConfirmModal({
      title: user.active ? 'Desactivar usuario' : 'Activar usuario',
      children: (
        <Text size="sm">
          {user.active
            ? `${user.name} no podrá iniciar sesión hasta que lo actives nuevamente.`
            : `${user.name} podrá volver a iniciar sesión.`}
        </Text>
      ),
      labels: {
        confirm: user.active ? 'Desactivar' : 'Activar',
        cancel: 'Cancelar'
      },
      confirmProps: { color: user.active ? 'red' : 'vetGreen' },
      onConfirm: () => void toggleActive(user)
    })
  }

  if (!isAdmin) {
    return (
      <Stack gap="lg">
        <Title order={2}>Usuarios</Title>
        <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
          Solo un administrador puede gestionar usuarios y permisos.
        </Alert>
      </Stack>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={2}>Usuarios y permisos</Title>
          <Text c="dimmed" size="sm">
            Administrá el personal y los accesos a cada módulo.
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={17} />} onClick={openCreate}>
          Nuevo usuario
        </Button>
      </Group>

      <Tabs defaultValue="users" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab
            value="users"
            leftSection={<IconShieldLock size={16} />}
          >
            Usuarios
          </Tabs.Tab>
          <Tabs.Tab value="permissions" leftSection={<IconKey size={16} />}>
            Permisos por rol
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="users" pt="md">
          <Paper withBorder radius="md">
            {usersQuery.isPending ? (
              <Group justify="center" py="xl">
                <Loader color="vetGreen" />
              </Group>
            ) : usersQuery.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />} m="md">
                {usersQuery.error.message}
              </Alert>
            ) : (
              <Table.ScrollContainer minWidth={760}>
                <Table verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nombre</Table.Th>
                      <Table.Th>Usuario</Table.Th>
                      <Table.Th>Rol</Table.Th>
                      <Table.Th>Estado</Table.Th>
                      <Table.Th>Alta</Table.Th>
                      <Table.Th ta="right">Acciones</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(usersQuery.data ?? []).map((user) => (
                      <Table.Tr key={user.id}>
                        <Table.Td>
                          <Group gap="xs">
                            <Text size="sm" fw={500}>
                              {user.name}
                            </Text>
                            {currentUser?.id === user.id && (
                              <Badge size="xs" variant="light">
                                Vos
                              </Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {user.username}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={ROLE_COLORS[user.role]} variant="light">
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={user.active ? 'green' : 'gray'}>
                            {user.active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {formatDateTime(user.createdAt)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="flex-end">
                            <Tooltip label="Editar">
                              <ActionIcon
                                variant="subtle"
                                onClick={() => openEdit(user)}
                                aria-label={`Editar ${user.name}`}
                              >
                                <IconEdit size={17} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Restablecer contraseña">
                              <ActionIcon
                                variant="subtle"
                                color="orange"
                                onClick={() => openReset(user)}
                                aria-label={`Restablecer contraseña de ${user.name}`}
                              >
                                <IconKey size={17} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip
                              label={
                                user.active ? 'Desactivar' : 'Activar'
                              }
                            >
                              <ActionIcon
                                variant="subtle"
                                color={user.active ? 'red' : 'green'}
                                onClick={() => confirmToggle(user)}
                                disabled={currentUser?.id === user.id}
                                aria-label={
                                  user.active ? 'Desactivar usuario' : 'Activar usuario'
                                }
                              >
                                {user.active ? (
                                  <IconUserOff size={17} />
                                ) : (
                                  <IconUserCheck size={17} />
                                )}
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="permissions" pt="md">
          <RolePermissionsTab />
        </Tabs.Panel>
      </Tabs>

      <UserFormModal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        user={editingUser}
      />
      <ResetUserPasswordModal
        opened={resetOpen}
        onClose={() => setResetOpen(false)}
        user={resetUser}
      />
    </Stack>
  )
}
