import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text
} from '@mantine/core'
import { IconAlertTriangle, IconLock, IconShieldCheck } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MODULE_LABELS,
  PERMISSION_MODULES,
  ROLE_LABELS,
  type PermissionModule,
  type Role
} from '@shared/roles'
import { api } from '@renderer/lib/api'
import { useAuth } from '@renderer/lib/use-auth'

const CONFIGURABLE_ROLES: Array<Extract<Role, 'vendedor' | 'peluquero'>> = [
  'vendedor',
  'peluquero'
]

const CONFIGURABLE_MODULES = PERMISSION_MODULES.filter(
  (module) => module !== 'usuarios' && module !== 'configuracion'
)

type RolePermissions = Record<
  Extract<Role, 'vendedor' | 'peluquero'>,
  PermissionModule[]
>

export function RolePermissionsTab(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { refresh } = useAuth()
  const permissionsQuery = useQuery({
    queryKey: ['users', 'permissions'],
    queryFn: api.users.permissions
  })
  const [draft, setDraft] = useState<Partial<RolePermissions>>({})
  const [savingRole, setSavingRole] = useState<Role | null>(null)
  const values: RolePermissions = {
    vendedor:
      draft.vendedor ??
      permissionsQuery.data?.find((item) => item.role === 'vendedor')
        ?.permissions ??
      [],
    peluquero:
      draft.peluquero ??
      permissionsQuery.data?.find((item) => item.role === 'peluquero')
        ?.permissions ??
      []
  }
  const updateMutation = useMutation({
    mutationFn: api.users.updatePermissions
  })

  const saveRole = async (
    role: Extract<Role, 'vendedor' | 'peluquero'>
  ): Promise<void> => {
    setSavingRole(role)

    try {
      await updateMutation.mutateAsync({
        role,
        permissions: values[role].filter((module) =>
          (CONFIGURABLE_MODULES as readonly PermissionModule[]).includes(module)
        )
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users', 'permissions'] }),
        refresh()
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Permisos actualizados',
        message: `Se guardaron los accesos del rol ${ROLE_LABELS[role]}.`
      })
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudieron guardar los permisos',
        message:
          error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    } finally {
      setSavingRole(null)
    }
  }

  if (permissionsQuery.isPending) {
    return (
      <Group justify="center" py="xl">
        <Loader color="vetGreen" />
      </Group>
    )
  }

  if (permissionsQuery.isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={18} />}>
        {permissionsQuery.error.message}
      </Alert>
    )
  }

  return (
    <Stack gap="md">
      <Alert
        color="blue"
        variant="light"
        icon={<IconShieldCheck size={18} />}
      >
        El administrador siempre tiene acceso a todos los módulos. Los módulos
        Usuarios y Configuración permanecen exclusivos del administrador.
      </Alert>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {CONFIGURABLE_ROLES.map((role) => (
          <Card key={role} withBorder padding="lg" radius="md">
            <Stack gap="md">
              <Group justify="space-between">
                <div>
                  <Text fw={600}>{ROLE_LABELS[role]}</Text>
                  <Text size="xs" c="dimmed">
                    Marcá los módulos a los que puede acceder este rol.
                  </Text>
                </div>
                <IconLock size={20} />
              </Group>
              <Checkbox.Group
                value={values[role]}
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    [role]: next as PermissionModule[]
                  }))
                }
              >
                <Stack gap="sm">
                  {CONFIGURABLE_MODULES.map((module) => (
                    <Checkbox
                      key={module}
                      value={module}
                      label={MODULE_LABELS[module]}
                    />
                  ))}
                </Stack>
              </Checkbox.Group>
              <Group justify="flex-end">
                <Button
                  onClick={() => void saveRole(role)}
                  loading={savingRole === role}
                >
                  Guardar permisos
                </Button>
              </Group>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
