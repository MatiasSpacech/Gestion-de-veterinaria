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
import type { GroomerRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { GroomerFormModal } from './GroomerFormModal'

interface GroomersPanelProps {
  groomers: GroomerRecord[]
}

export function GroomersPanel({
  groomers
}: GroomersPanelProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const modals = useModals()
  const [formOpened, setFormOpened] = useState(false)
  const [editingGroomer, setEditingGroomer] = useState<GroomerRecord | null>(null)

  const toggleMutation = useMutation({
    mutationFn: (groomer: GroomerRecord) =>
      api.grooming.setGroomerActive({
        id: groomer.id,
        active: !groomer.active
      }),
    onSuccess: async (groomer) => {
      await queryClient.invalidateQueries({
        queryKey: ['grooming', 'groomers']
      })
      notifications.show({
        color: 'vetGreen',
        title: groomer.active ? 'Peluquero activado' : 'Peluquero desactivado',
        message: groomer.name
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo actualizar el peluquero',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  const openCreate = (): void => {
    setEditingGroomer(null)
    setFormOpened(true)
  }

  const openEdit = (groomer: GroomerRecord): void => {
    setEditingGroomer(groomer)
    setFormOpened(true)
  }

  const confirmToggle = (groomer: GroomerRecord): void => {
    modals.openConfirmModal({
      title: groomer.active ? 'Desactivar peluquero' : 'Reactivar peluquero',
      centered: true,
      children: (
        <Text size="sm">
          {groomer.active
            ? `${groomer.name} dejará de aparecer para nuevos turnos. Los turnos existentes se conservan.`
            : `${groomer.name} volverá a estar disponible para agendar.`}
        </Text>
      ),
      labels: {
        confirm: groomer.active ? 'Desactivar' : 'Reactivar',
        cancel: 'Cancelar'
      },
      confirmProps: { color: groomer.active ? 'red' : 'vetGreen' },
      onConfirm: () => toggleMutation.mutate(groomer)
    })
  }

  return (
    <Card padding="lg">
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <div>
          <Title order={4}>Peluqueros</Title>
          <Text size="sm" c="dimmed">
            Profesionales disponibles y color identificatorio en la agenda.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
          Nuevo peluquero
        </Button>
      </Group>

      {groomers.length === 0 ? (
        <Text size="sm" c="dimmed" py="xl" ta="center">
          Todavía no hay peluqueros cargados.
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={620}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Peluquero</Table.Th>
                <Table.Th>Teléfono</Table.Th>
                <Table.Th>Color</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th ta="right">Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {groomers.map((groomer) => (
                <Table.Tr key={groomer.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 99,
                          background: groomer.color,
                          flexShrink: 0
                        }}
                      />
                      <Text size="sm" fw={600}>
                        {groomer.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={groomer.phone ? undefined : 'dimmed'}>
                      {groomer.phone ?? 'Sin teléfono'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {groomer.color}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={groomer.active ? 'vetGreen' : 'gray'}
                      radius="sm"
                    >
                      {groomer.active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group justify="flex-end" gap={4}>
                      <ActionIcon
                        variant="subtle"
                        aria-label={`Editar ${groomer.name}`}
                        onClick={() => openEdit(groomer)}
                      >
                        <IconEdit size={17} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color={groomer.active ? 'red' : 'vetGreen'}
                        aria-label={
                          groomer.active
                            ? `Desactivar ${groomer.name}`
                            : `Reactivar ${groomer.name}`
                        }
                        onClick={() => confirmToggle(groomer)}
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

      <GroomerFormModal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        groomer={editingGroomer}
      />
    </Card>
  )
}
