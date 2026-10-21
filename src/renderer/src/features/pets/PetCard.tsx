import {
  ActionIcon,
  Avatar,
  Badge,
  Card,
  Group,
  Menu,
  Text
} from '@mantine/core'
import {
  IconCalendarEvent,
  IconDotsVertical,
  IconEdit,
  IconPaw,
  IconPower
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import type { PetRecord } from '@shared/types'
import {
  calculateAge,
  formatDate,
  formatPetSex,
  formatWeight
} from '@renderer/lib/format'
import { getPetPhotoUrl } from '@renderer/lib/pet-photo'

interface PetCardProps {
  pet: PetRecord
  showClient?: boolean
  onEdit?: (pet: PetRecord) => void
  onToggle?: (pet: PetRecord) => void
}

export function PetCard({
  pet,
  showClient = true,
  onEdit,
  onToggle
}: PetCardProps): React.JSX.Element {
  const navigate = useNavigate()
  const nextVaccineOverdue = pet.nextVaccineDue
    ? dayjs(pet.nextVaccineDue).isBefore(dayjs(), 'day')
    : false

  return (
    <Card
      padding="lg"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/mascotas/${pet.id}`)}
    >
      <Group align="flex-start" wrap="nowrap" gap="md">
        <Avatar
          src={getPetPhotoUrl(pet.photoFileName)}
          size={72}
          radius="lg"
          color="vetGreen"
        >
          <IconPaw size={30} stroke={1.6} />
        </Avatar>

        <div style={{ flex: 1, minWidth: 0 }}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Group gap={8} wrap="nowrap">
                <Text fw={700} fz="md" truncate>
                  {pet.name}
                </Text>
                {!pet.active ? (
                  <Badge size="xs" color="gray" variant="light">
                    Inactiva
                  </Badge>
                ) : null}
              </Group>
              <Text size="xs" c="dimmed" truncate>
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ''}
              </Text>
            </div>

            {onEdit || onToggle ? (
              <Menu shadow="md" position="bottom-end">
                <Menu.Target>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    aria-label="Acciones"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <IconDotsVertical size={18} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
                  <Menu.Item
                    leftSection={<IconPaw size={16} />}
                    onClick={() => navigate(`/mascotas/${pet.id}`)}
                  >
                    Ver ficha
                  </Menu.Item>
                  {onEdit ? (
                    <Menu.Item
                      leftSection={<IconEdit size={16} />}
                      onClick={() => onEdit(pet)}
                    >
                      Editar
                    </Menu.Item>
                  ) : null}
                  {onToggle ? (
                    <>
                      <Menu.Divider />
                      <Menu.Item
                        color={pet.active ? 'red' : 'vetGreen'}
                        leftSection={<IconPower size={16} />}
                        onClick={() => onToggle(pet)}
                      >
                        {pet.active ? 'Desactivar' : 'Reactivar'}
                      </Menu.Item>
                    </>
                  ) : null}
                </Menu.Dropdown>
              </Menu>
            ) : null}
          </Group>

          {showClient ? (
            <Text size="xs" c="dimmed" mt={6} truncate>
              Tutor: {pet.clientName}
            </Text>
          ) : null}

          <Group gap={6} mt={10} wrap="wrap">
            <Badge size="xs" variant="light" color="gray" radius="sm">
              {formatPetSex(pet.sex)}
            </Badge>
            <Badge size="xs" variant="light" color="gray" radius="sm">
              {calculateAge(pet.birthDate)}
            </Badge>
            <Badge size="xs" variant="light" color="blue" radius="sm">
              {formatWeight(pet.weightKg)}
            </Badge>
          </Group>

          {pet.nextVaccineDue ? (
            <Group gap={5} mt={10}>
              <IconCalendarEvent
                size={14}
                color={
                  nextVaccineOverdue
                    ? 'var(--mantine-color-red-6)'
                    : 'var(--mantine-color-vetGreen-7)'
                }
              />
              <Text
                size="xs"
                c={nextVaccineOverdue ? 'red' : 'dimmed'}
                fw={nextVaccineOverdue ? 600 : 400}
              >
                Próxima vacuna: {formatDate(pet.nextVaccineDue)}
              </Text>
            </Group>
          ) : null}
        </div>
      </Group>
    </Card>
  )
}
