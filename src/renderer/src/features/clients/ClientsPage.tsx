import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Menu,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconPower,
  IconSearch,
  IconUser,
  IconUsers
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { ClientRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { ClientFormModal } from './ClientFormModal'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function ClientsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const modals = useModals()
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [debouncedSearch] = useDebouncedValue(search, 250)
  const [formOpened, setFormOpened] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null)

  const clientsQuery = useQuery({
    queryKey: ['clients', debouncedSearch, includeInactive],
    queryFn: () =>
      api.clients.list({ search: debouncedSearch, includeInactive })
  })

  const toggleMutation = useMutation({
    mutationFn: (client: ClientRecord) =>
      api.clients.setActive({ id: client.id, active: !client.active }),
    onSuccess: async (client) => {
      await queryClient.invalidateQueries({ queryKey: ['clients'] })
      notifications.show({
        color: client.active ? 'vetGreen' : 'orange',
        title: client.active ? 'Cliente reactivado' : 'Cliente desactivado',
        message: client.active
          ? 'El cliente vuelve a estar disponible.'
          : 'El cliente quedó archivado, pero su historial se conserva.'
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo actualizar el cliente',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  const openCreate = (): void => {
    setEditingClient(null)
    setFormOpened(true)
  }

  const openEdit = (client: ClientRecord): void => {
    setEditingClient(client)
    setFormOpened(true)
  }

  const confirmToggle = (client: ClientRecord): void => {
    modals.openConfirmModal({
      title: client.active ? 'Desactivar cliente' : 'Reactivar cliente',
      centered: true,
      children: (
        <Text size="sm">
          {client.active
            ? `¿Querés desactivar a ${client.name}? Sus mascotas e historial se conservan.`
            : `¿Querés reactivar a ${client.name}?`}
        </Text>
      ),
      labels: {
        confirm: client.active ? 'Desactivar' : 'Reactivar',
        cancel: 'Cancelar'
      },
      confirmProps: { color: client.active ? 'red' : 'vetGreen' },
      onConfirm: () => toggleMutation.mutate(client)
    })
  }

  const clients = clientsQuery.data ?? []

  return (
    <>
      <Box>
        <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="md">
          <div>
            <Title order={2}>Clientes</Title>
            <Text c="dimmed" mt={4}>
              Datos de contacto, mascotas e historial de cada tutor.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
            Nuevo cliente
          </Button>
        </Group>

        <Card padding="lg" mb="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <TextInput
              placeholder="Buscar por nombre, teléfono o documento"
              leftSection={<IconSearch size={17} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={{ base: '100%', sm: 380 }}
            />
            <Switch
              label="Mostrar inactivos"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.currentTarget.checked)}
            />
          </Group>
        </Card>

        {clientsQuery.isError ? (
          <Alert
            color="red"
            icon={<IconAlertCircle size={19} />}
            title="No se pudieron cargar los clientes"
            mb="md"
          >
            {clientsQuery.error instanceof Error
              ? clientsQuery.error.message
              : 'Intentá nuevamente.'}
          </Alert>
        ) : null}

        <Card padding={0}>
          {clientsQuery.isPending ? (
            <Center py={70}>
              <Loader color="vetGreen" />
            </Center>
          ) : clients.length === 0 ? (
            <Center py={70}>
              <Stack align="center" gap="sm" maw={380}>
                <IconUsers size={34} stroke={1.5} color="var(--mantine-color-gray-5)" />
                <Text fw={600}>No hay clientes para mostrar</Text>
                <Text size="sm" c="dimmed" ta="center">
                  {search
                    ? 'Probá con otra búsqueda o incluí los clientes inactivos.'
                    : 'Creá el primer cliente para empezar a registrar mascotas.'}
                </Text>
                {!search ? (
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={openCreate}
                  >
                    Nuevo cliente
                  </Button>
                ) : null}
              </Stack>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={820}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Cliente</Table.Th>
                    <Table.Th>Contacto</Table.Th>
                    <Table.Th>Mascotas</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th ta="right">Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {clients.map((client) => (
                    <Table.Tr
                      key={client.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/clientes/${client.id}`)}
                    >
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar color="vetGreen" radius="xl" size="md">
                            {initials(client.name)}
                          </Avatar>
                          <div>
                            <Text size="sm" fw={600}>
                              {client.name}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {client.docNumber
                                ? `Documento ${client.docNumber}`
                                : 'Documento sin registrar'}
                            </Text>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{client.phone ?? '—'}</Text>
                        <Text size="xs" c="dimmed">
                          {client.email ?? 'Sin correo'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="vetGreen" radius="sm">
                          {client.petCount}{' '}
                          {client.petCount === 1 ? 'mascota' : 'mascotas'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={client.active ? 'vetGreen' : 'gray'}
                          radius="sm"
                        >
                          {client.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </Table.Td>
                      <Table.Td onClick={(event) => event.stopPropagation()}>
                        <Group justify="flex-end">
                          <Menu shadow="md" position="bottom-end">
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray" aria-label="Acciones">
                                <IconDotsVertical size={18} />
                              </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconUser size={16} />}
                                onClick={() => navigate(`/clientes/${client.id}`)}
                              >
                                Ver ficha
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconEdit size={16} />}
                                onClick={() => openEdit(client)}
                              >
                                Editar
                              </Menu.Item>
                              <Menu.Divider />
                              <Menu.Item
                                color={client.active ? 'red' : 'vetGreen'}
                                leftSection={<IconPower size={16} />}
                                onClick={() => confirmToggle(client)}
                              >
                                {client.active ? 'Desactivar' : 'Reactivar'}
                              </Menu.Item>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      </Box>

      <ClientFormModal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        client={editingClient}
      />
    </>
  )
}
