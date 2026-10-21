import {
  useCallback,
  useMemo,
  type ReactNode
} from 'react'
import { Alert, Button, Center, Group, Loader, Stack, Text } from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChangePasswordInput, LoginInput, SetupAdminInput } from '@shared/schemas'
import type { PermissionModule } from '@shared/roles'
import { api } from './api'
import {
  AUTH_QUERY_KEY,
  AuthContext,
  type AuthContextValue
} from './use-auth'

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: api.auth.status,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 1
  })

  const login = useCallback(
    async (input: LoginInput) => {
      const nextStatus = await api.auth.login(input)
      queryClient.setQueryData(AUTH_QUERY_KEY, nextStatus)
      return nextStatus
    },
    [queryClient]
  )

  const setup = useCallback(
    async (input: SetupAdminInput) => {
      const nextStatus = await api.auth.setup(input)
      queryClient.setQueryData(AUTH_QUERY_KEY, nextStatus)
      return nextStatus
    },
    [queryClient]
  )

  const logout = useCallback(async () => {
    const nextStatus = await api.auth.logout()
    queryClient.setQueryData(AUTH_QUERY_KEY, nextStatus)
    return nextStatus
  }, [queryClient])

  const changePassword = useCallback(async (input: ChangePasswordInput) => {
    await api.auth.changePassword(input)
  }, [])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
  }, [queryClient])

  const status = query.data
  const permissions = useMemo(
    () => status?.user?.permissions ?? [],
    [status?.user?.permissions]
  )

  const hasPermission = useCallback(
    (module: PermissionModule) => permissions.includes(module),
    [permissions]
  )

  const value = useMemo<AuthContextValue | null>(() => {
    if (!status) {
      return null
    }

    return {
      status,
      user: status.user,
      permissions,
      businessName: status.businessName,
      hasPermission,
      login,
      setup,
      logout,
      changePassword,
      refresh
    }
  }, [status, permissions, hasPermission, login, setup, logout, changePassword, refresh])

  if (query.isPending) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader color="vetGreen.7" size="lg" />
          <Text c="dimmed" size="sm">
            Iniciando VetGestión...
          </Text>
        </Stack>
      </Center>
    )
  }

  if (query.isError || !value) {
    return (
      <Center h="100vh" p="xl">
        <Alert
          color="red"
          icon={<IconAlertCircle size={20} />}
          title="No se pudo iniciar la aplicación"
          maw={520}
        >
          <Stack gap="md">
            <Text size="sm">
              {query.error instanceof Error
                ? query.error.message
                : 'Ocurrió un error al conectar con la base de datos.'}
            </Text>
            <Group>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={() => void query.refetch()}
              >
                Reintentar
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Center>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
