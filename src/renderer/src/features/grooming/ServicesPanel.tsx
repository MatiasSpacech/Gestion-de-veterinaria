import { useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Table,
  Text,
  Title
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconPower } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ServiceRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatCurrency } from '@renderer/lib/format'
import { SERVICE_CATEGORY_LABELS } from './grooming-constants'
import { ServiceFormModal } from './ServiceFormModal'

interface ServicesPanelProps {
  services: ServiceRecord[]
}

export function ServicesPanel({
  services
}: ServicesPanelProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const modals = useModals()
  const [formOpened, setFormOpened] = useState(false)
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null)

  const toggleMutation = useMutation({
    mutationFn: (service: ServiceRecord) =>
      api.grooming.setServiceActive({
        id: service.id,
        active: !service.active
      }),
    onSuccess: async (service) => {
      await queryClient.invalidateQueries({
        queryKey: ['grooming', 'services']
      })
      notifications.show({
        color: 'vetGreen',
        title: service.active ? 'Servicio activado' : 'Servicio desactivado',
        message: service.name
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo actualizar el servicio',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  const openCreate = (): void => {
    setEditingService(null)
    setFormOpened(true)
  }

  const openEdit = (service: ServiceRecord): void => {
    setEditingService(service)
    setFormOpened(true)
  }

  const confirmToggle = (service: ServiceRecord): void => {
    modals.openConfirmModal({
      title: service.active ? 'Desactivar servicio' : 'Reactivar servicio',
      centered: true,
      children: (
        <Text size="sm">
          {service.active
            ? `El servicio ${service.name} dejará de estar disponible para nuevos turnos.`
            : `El servicio ${service.name} volverá a estar disponible.`}
        </Text>
      ),
      labels: {
        confirm: service.active ? 'Desactivar' : 'Reactivar',
        cancel: 'Cancelar'
      },
      confirmProps: { color: service.active ? 'red' : 'vetGreen' },
      onConfirm: () => toggleMutation.mutate(service)
    })
  }

  return (
    <Card padding="lg">
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <div>
          <Title order={4}>Servicios</Title>
          <Text size="sm" c="dimmed">
            Precios y duraciones usados al agendar y cobrar.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
          Nuevo servicio
        </Button>
      </Group>

      {services.length === 0 ? (
        <Text size="sm" c="dimmed" py="xl" ta="center">
          Todavía no hay servicios cargados.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={680}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Servicio</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Duración</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th ta="right">Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {services.map((service) => (
                <Table.Tr key={service.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {service.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {SERVICE_CATEGORY_LABELS[service.category]}
                    </Text>
                  </Table.Td>
                  <Table.Td>{service.durationMinutes} min</Table.Td>
                  <Table.Td>{formatCurrency(service.priceCents)}</Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={service.active ? 'vetGreen' : 'gray'}
                      radius="sm"
                    >
                      {service.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap={4}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={`Editar ${service.name}`}
                        onClick={() => openEdit(service)}
                      >
                        <IconEdit size={17} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color={service.active ? 'red' : 'vetGreen'}
                        aria-label={
                          service.active
                            ? `Desactivar ${service.name}`
                            : `Reactivar ${service.name}`
                        }
                        onClick={() => confirmToggle(service)}
                      >
                        <IconPower size={17} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <ServiceFormModal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        service={editingService}
      />
    </Card>
  )
}
