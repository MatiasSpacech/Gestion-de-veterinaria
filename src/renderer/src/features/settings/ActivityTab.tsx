import { useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useQuery } from '@tanstack/react-query'
import {
  IconAlertTriangle,
  IconRefresh,
  IconSearch
} from '@tabler/icons-react'
import { api } from '@renderer/lib/api'
import { formatDateTime } from '@renderer/lib/format'
import { ACTION_LABELS } from './settings-constants'

function actionColor(action: string): string {
  if (action.startsWith('sale.cancel') || action.includes('restore')) {
    return 'red'
  }

  if (action.startsWith('user.') || action.startsWith('backup.')) {
    return 'violet'
  }

  if (action.startsWith('settings.')) {
    return 'blue'
  }

  return 'gray'
}

export function ActivityTab(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 250)
  const activityQuery = useQuery({
    queryKey: ['activity', debouncedSearch],
    queryFn: () =>
      api.activity.list({
        limit: 200,
        search: debouncedSearch.trim() || null
      })
  })
  const records = activityQuery.data ?? []

  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <div>
            <Text fw={600}>Auditoría</Text>
            <Text size="xs" c="dimmed">
              Últimas 200 operaciones registradas en el sistema.
            </Text>
          </div>
          <Group gap="sm">
            <TextInput
              placeholder="Buscar acción, entidad o usuario"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={280}
            />
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void activityQuery.refetch()}
              loading={activityQuery.isFetching}
            >
              Actualizar
            </Button>
          </Group>
        </Group>

        {activityQuery.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {activityQuery.error.message}
          </Alert>
        ) : activityQuery.isPending ? (
          <Group justify="center" py="xl">
            <Loader color="vetGreen" />
          </Group>
        ) : records.length === 0 ? (
          <Text size="sm" c="dimmed">
            No hay operaciones registradas para esta búsqueda.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fecha</Table.Th>
                  <Table.Th>Usuario</Table.Th>
                  <Table.Th>Acción</Table.Th>
                  <Table.Th>Entidad</Table.Th>
                  <Table.Th>Detalle</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {records.map((record) => (
                  <Table.Tr key={record.id}>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDateTime(record.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{record.userName ?? 'Sistema'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={actionColor(record.action)}
                        size="sm"
                      >
                        {ACTION_LABELS[record.action] ?? record.action}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {record.entityType
                          ? `${record.entityType}${record.entityId ? ` #${record.entityId}` : ''}`
                          : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {record.details ? (
                        <Tooltip
                          label={record.details}
                          multiline
                          maw={420}
                          withinPortal
                        >
                          <Text size="xs" c="dimmed" lineClamp={2} maw={280}>
                            {record.details}
                          </Text>
                        </Tooltip>
                      ) : (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Card>
  )
}
