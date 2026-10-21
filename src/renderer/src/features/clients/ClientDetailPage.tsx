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
  SimpleGrid,
  Stack,
  Text,
  Title
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconCalendar,
  IconChevronLeft,
  IconEdit,
  IconMail,
  IconMapPin,
  IconPaw,
  IconPhone,
  IconPlus,
  IconUser
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { PetRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatDate } from '@renderer/lib/format'
import { PetCard } from '@renderer/features/pets/PetCard'
import { PetFormModal } from '@renderer/features/pets/PetFormModal'
import { ClientFormModal } from './ClientFormModal'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function ClientDetailPage(): React.JSX.Element {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const modals = useModals()
  const id = Number(params.id)
  const [clientModalOpened, setClientModalOpened] = useState(false)
  const [petModalOpened, setPetModalOpened] = useState(false)
  const [editingPet, setEditingPet] = useState<PetRecord | null>(null)

  const clientQuery = useQuery({
    queryKey: ['client', id],
    queryFn: () => api.clients.get({ id }),
    enabled: Number.isInteger(id) && id > 0
  })

  const togglePetMutation = useMutation({
    mutationFn: (pet: PetRecord) =>
      api.pets.setActive({ id: pet.id, active: !pet.active }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client', id] }),
        queryClient.invalidateQueries({ queryKey: ['pets'] }),
        queryClient.invalidateQueries({ queryKey: ['upcoming-vaccines'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Mascota actualizada',
        message: 'El estado de la mascota se modificó correctamente.'
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo actualizar la mascota',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  if (!Number.isInteger(id) || id <= 0) {
    return <Navigate to="/clientes" replace />
  }

  if (clientQuery.isPending) {
    return (
      <Center py={100}>
        <Loader color="vetGreen" />
      </Center>
    )
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={20} />} title="Cliente no encontrado">
        <Stack gap="md" align="flex-start">
          <Text size="sm">
            {clientQuery.error instanceof Error
              ? clientQuery.error.message
              : 'No se pudo cargar la ficha del cliente.'}
          </Text>
          <Button variant="light" onClick={() => navigate('/clientes')}>
            Volver a clientes
          </Button>
        </Stack>
      </Alert>
    )
  }

  const client = clientQuery.data
  const activePets = client.pets.filter((pet) => pet.active)

  const openNewPet = (): void => {
    setEditingPet(null)
    setPetModalOpened(true)
  }

  const openEditPet = (pet: PetRecord): void => {
    setEditingPet(pet)
    setPetModalOpened(true)
  }

  const confirmTogglePet = (pet: PetRecord): void => {
    modals.openConfirmModal({
      title: pet.active ? 'Desactivar mascota' : 'Reactivar mascota',
      centered: true,
      children: (
        <Text size="sm">
          {pet.active
            ? `¿Querés desactivar a ${pet.name}? Su historial clínico se conserva.`
            : `¿Querés reactivar a ${pet.name}?`}
        </Text>
      ),
      labels: {
        confirm: pet.active ? 'Desactivar' : 'Reactivar',
        cancel: 'Cancelar'
      },
      confirmProps: { color: pet.active ? 'red' : 'vetGreen' },
      onConfirm: () => togglePetMutation.mutate(pet)
    })
  }

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group align="flex-start" gap="sm" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              mt={2}
              onClick={() => navigate('/clientes')}
              aria-label="Volver a clientes"
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="sm">
                <Title order={2}>{client.name}</Title>
                <Badge
                  variant="light"
                  color={client.active ? 'vetGreen' : 'gray'}
                  radius="sm"
                >
                  {client.active ? 'Activo' : 'Inactivo'}
                </Badge>
              </Group>
              <Text c="dimmed" mt={4}>
                Ficha del cliente y sus mascotas.
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconEdit size={16} />}
              onClick={() => setClientModalOpened(true)}
            >
              Editar cliente
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={openNewPet}
              disabled={!client.active}
            >
              Agregar mascota
            </Button>
          </Group>
        </Group>

        <Card padding="lg">
          <Group align="flex-start" gap="lg" wrap="wrap">
            <Avatar color="vetGreen" radius="xl" size={64}>
              {initials(client.name)}
            </Avatar>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg" style={{ flex: 1 }}>
              <ContactItem
                icon={<IconUser size={17} />}
                label="Documento"
                value={client.docNumber ?? 'Sin registrar'}
              />
              <ContactItem
                icon={<IconPhone size={17} />}
                label="Teléfono"
                value={client.phone ?? 'Sin registrar'}
              />
              <ContactItem
                icon={<IconMail size={17} />}
                label="Correo"
                value={client.email ?? 'Sin registrar'}
              />
              <ContactItem
                icon={<IconCalendar size={17} />}
                label="Cliente desde"
                value={formatDate(client.createdAt)}
              />
              <ContactItem
                icon={<IconMapPin size={17} />}
                label="Dirección"
                value={client.address ?? 'Sin registrar'}
                span={2}
              />
              <ContactItem
                icon={<IconPaw size={17} />}
                label="Mascotas activas"
                value={String(activePets.length)}
              />
            </SimpleGrid>
          </Group>

          {client.notes ? (
            <Box mt="lg" pt="lg" style={{ borderTop: '1px solid #e6eeea' }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Notas
              </Text>
              <Text size="sm" mt={6} style={{ whiteSpace: 'pre-wrap' }}>
                {client.notes}
              </Text>
            </Box>
          ) : null}
        </Card>

        <Box>
          <Group justify="space-between" mb="sm">
            <div>
              <Title order={3}>Mascotas</Title>
              <Text size="sm" c="dimmed">
                {client.pets.length === 0
                  ? 'Este cliente todavía no tiene mascotas registradas.'
                  : `${client.pets.length} ${
                      client.pets.length === 1 ? 'mascota registrada' : 'mascotas registradas'
                    }`}
              </Text>
            </div>
            {!client.active ? (
              <Badge color="gray" variant="light">
                Cliente inactivo
              </Badge>
            ) : null}
          </Group>

          {client.pets.length === 0 ? (
            <Card>
              <Center py={40}>
                <Stack align="center" gap="sm">
                  <IconPaw size={32} stroke={1.5} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" c="dimmed">
                    Agregá la primera mascota de este cliente.
                  </Text>
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={openNewPet}
                    disabled={!client.active}
                  >
                    Agregar mascota
                  </Button>
                </Stack>
              </Center>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              {client.pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  showClient={false}
                  onEdit={openEditPet}
                  onToggle={confirmTogglePet}
                />
              ))}
            </SimpleGrid>
          )}
        </Box>
      </Stack>

      <ClientFormModal
        opened={clientModalOpened}
        onClose={() => setClientModalOpened(false)}
        client={client}
      />

      <PetFormModal
        opened={petModalOpened}
        onClose={() => setPetModalOpened(false)}
        pet={editingPet}
        fixedClientId={client.id}
        fixedClientName={client.name}
      />
    </>
  )
}

function ContactItem({
  icon,
  label,
  value,
  span = 1
}: {
  icon: React.ReactNode
  label: string
  value: string
  span?: number
}): React.JSX.Element {
  return (
    <Box style={{ gridColumn: `span ${span}` }}>
      <Group gap={6} mb={2}>
        <Box c="dimmed">{icon}</Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {label}
        </Text>
      </Group>
      <Text size="sm">{value}</Text>
    </Box>
  )
}
