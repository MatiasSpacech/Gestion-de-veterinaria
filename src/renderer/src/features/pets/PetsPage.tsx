import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle, IconPaw, IconPlus, IconSearch } from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PetRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import { PetCard } from './PetCard'
import { PetFormModal } from './PetFormModal'

export function PetsPage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const modals = useModals()
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [debouncedSearch] = useDebouncedValue(search, 250)
  const [formOpened, setFormOpened] = useState(false)
  const [editingPet, setEditingPet] = useState<PetRecord | null>(null)

  const petsQuery = useQuery({
    queryKey: ['pets', debouncedSearch, includeInactive],
    queryFn: () =>
      api.pets.list({
        search: debouncedSearch,
        clientId: null,
        includeInactive
      })
  })

  const toggleMutation = useMutation({
    mutationFn: (pet: PetRecord) =>
      api.pets.setActive({ id: pet.id, active: !pet.active }),
    onSuccess: async (pet) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pets'] }),
        queryClient.invalidateQueries({ queryKey: ['pet'] }),
        queryClient.invalidateQueries({ queryKey: ['client'] }),
        queryClient.invalidateQueries({ queryKey: ['upcoming-vaccines'] })
      ])
      notifications.show({
        color: pet.active ? 'vetGreen' : 'orange',
        title: pet.active ? 'Mascota reactivada' : 'Mascota desactivada',
        message: pet.active
          ? 'La mascota vuelve a estar disponible.'
          : 'La ficha y el historial clínico se conservan.'
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

  const openCreate = (): void => {
    setEditingPet(null)
    setFormOpened(true)
  }

  const openEdit = (pet: PetRecord): void => {
    setEditingPet(pet)
    setFormOpened(true)
  }

  const confirmToggle = (pet: PetRecord): void => {
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
      onConfirm: () => toggleMutation.mutate(pet)
    })
  }

  const pets = petsQuery.data ?? []

  return (
    <>
      <Box>
        <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="md">
          <div>
            <Title order={2}>Mascotas</Title>
            <Text c="dimmed" mt={4}>
              Fichas, historial clínico, evolución de peso y próximas vacunas.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
            Nueva mascota
          </Button>
        </Group>

        <Card padding="lg" mb="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <TextInput
              placeholder="Buscar por mascota, tutor, especie o raza"
              leftSection={<IconSearch size={17} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              w={{ base: '100%', sm: 400 }}
            />
            <Switch
              label="Mostrar inactivas"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.currentTarget.checked)}
            />
          </Group>
        </Card>

        {petsQuery.isError ? (
          <Alert
            color="red"
            icon={<IconAlertCircle size={19} />}
            title="No se pudieron cargar las mascotas"
            mb="md"
          >
            {petsQuery.error instanceof Error
              ? petsQuery.error.message
              : 'Intentá nuevamente.'}
          </Alert>
        ) : null}

        {petsQuery.isPending ? (
          <Center py={70}>
            <Loader color="vetGreen" />
          </Center>
        ) : pets.length === 0 ? (
          <Card>
            <Center py={60}>
              <Stack align="center" gap="sm" maw={380}>
                <IconPaw size={36} stroke={1.5} color="var(--mantine-color-gray-5)" />
                <Text fw={600}>No hay mascotas para mostrar</Text>
                <Text size="sm" c="dimmed" ta="center">
                  {search
                    ? 'Probá con otra búsqueda o incluí las mascotas inactivas.'
                    : 'Registrá la primera mascota desde un cliente o desde este módulo.'}
                </Text>
                {!search ? (
                  <Button
                    variant="light"
                    leftSection={<IconPlus size={16} />}
                    onClick={openCreate}
                  >
                    Nueva mascota
                  </Button>
                ) : null}
              </Stack>
            </Center>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2, xl: 3 }} spacing="md">
            {pets.map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onEdit={openEdit}
                onToggle={confirmToggle}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>

      <PetFormModal
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        pet={editingPet}
      />
    </>
  )
}
