import { useMemo, useState } from 'react'
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
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Timeline,
  Title
} from '@mantine/core'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCalendarEvent,
  IconChevronLeft,
  IconEdit,
  IconPaw,
  IconPlus,
  IconPower,
  IconScale,
  IconStethoscope,
  IconVaccine
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { MedicalRecord, MedicalRecordType } from '@shared/types'
import { api } from '@renderer/lib/api'
import {
  calculateAge,
  formatDate,
  formatDueIn,
  formatPetSex,
  formatShortDate,
  formatWeight
} from '@renderer/lib/format'
import { getPetPhotoUrl } from '@renderer/lib/pet-photo'
import { MedicalRecordModal } from './MedicalRecordModal'
import { PetFormModal } from './PetFormModal'
import { RECORD_TYPES, RECORD_TYPE_OPTIONS } from './record-types'

const HISTORY_FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos los registros' },
  ...RECORD_TYPE_OPTIONS
]

function latestVaccines(records: MedicalRecord[]): MedicalRecord[] {
  const latest = new Map<string, MedicalRecord>()

  for (const record of records) {
    if (record.type !== 'vacuna' || !record.nextDueDate) {
      continue
    }

    const key = record.title.toLocaleLowerCase('es')

    if (!latest.has(key)) {
      latest.set(key, record)
    }
  }

  return [...latest.values()].sort((a, b) =>
    (a.nextDueDate ?? '').localeCompare(b.nextDueDate ?? '')
  )
}

export function PetDetailPage(): React.JSX.Element {
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const modals = useModals()
  const id = Number(params.id)
  const [editOpened, setEditOpened] = useState(false)
  const [recordOpened, setRecordOpened] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<MedicalRecordType | 'todos'>(
    'todos'
  )

  const petQuery = useQuery({
    queryKey: ['pet', id],
    queryFn: () => api.pets.get({ id }),
    enabled: Number.isInteger(id) && id > 0
  })

  const recordsQuery = useQuery({
    queryKey: ['pet-records', id],
    queryFn: () => api.pets.medicalRecords({ petId: id, type: null }),
    enabled: Number.isInteger(id) && id > 0
  })

  const weightsQuery = useQuery({
    queryKey: ['pet-weights', id],
    queryFn: () => api.pets.weightHistory({ petId: id }),
    enabled: Number.isInteger(id) && id > 0
  })

  const toggleMutation = useMutation({
    mutationFn: () =>
      api.pets.setActive({ id, active: !(petQuery.data?.active ?? false) }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pet', id] }),
        queryClient.invalidateQueries({ queryKey: ['pets'] }),
        queryClient.invalidateQueries({ queryKey: ['client'] }),
        queryClient.invalidateQueries({ queryKey: ['upcoming-vaccines'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Estado actualizado',
        message: 'La ficha de la mascota se actualizó correctamente.'
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

  const records = useMemo(() => recordsQuery.data ?? [], [recordsQuery.data])
  const weights = useMemo(() => weightsQuery.data ?? [], [weightsQuery.data])
  const vaccines = useMemo(() => latestVaccines(records), [records])
  const historyRecords = useMemo(
    () =>
      historyFilter === 'todos'
        ? records
        : records.filter((record) => record.type === historyFilter),
    [records, historyFilter]
  )
  const chartData = useMemo(
    () =>
      weights.map((entry) => ({
        date: formatShortDate(entry.date),
        fullDate: formatDate(entry.date),
        weight: entry.weightKg
      })),
    [weights]
  )

  if (!Number.isInteger(id) || id <= 0) {
    return <Navigate to="/mascotas" replace />
  }

  if (petQuery.isPending) {
    return (
      <Center py={100}>
        <Loader color="vetGreen" />
      </Center>
    )
  }

  if (petQuery.isError || !petQuery.data) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={20} />} title="Mascota no encontrada">
        <Stack gap="md" align="flex-start">
          <Text size="sm">
            {petQuery.error instanceof Error
              ? petQuery.error.message
              : 'No se pudo cargar la ficha de la mascota.'}
          </Text>
          <Button variant="light" onClick={() => navigate('/mascotas')}>
            Volver a mascotas
          </Button>
        </Stack>
      </Alert>
    )
  }

  const pet = petQuery.data

  const confirmToggle = (): void => {
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
      onConfirm: () => toggleMutation.mutate()
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
              onClick={() => navigate('/mascotas')}
              aria-label="Volver a mascotas"
            >
              <IconChevronLeft size={20} />
            </ActionIcon>
            <div>
              <Group gap="sm">
                <Title order={2}>{pet.name}</Title>
                <Badge
                  variant="light"
                  color={pet.active ? 'vetGreen' : 'gray'}
                  radius="sm"
                >
                  {pet.active ? 'Activa' : 'Inactiva'}
                </Badge>
              </Group>
              <Text c="dimmed" mt={4}>
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ''} · Tutor:{' '}
                <Text
                  span
                  c="vetGreen.7"
                  fw={600}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/clientes/${pet.clientId}`)}
                >
                  {pet.clientName}
                </Text>
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <Button
              variant="default"
              leftSection={<IconEdit size={16} />}
              onClick={() => setEditOpened(true)}
            >
              Editar
            </Button>
            <Button
              variant="light"
              color={pet.active ? 'red' : 'vetGreen'}
              leftSection={<IconPower size={16} />}
              onClick={confirmToggle}
            >
              {pet.active ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setRecordOpened(true)}
            >
              Nuevo registro
            </Button>
          </Group>
        </Group>

        <Card padding="lg">
          <Group align="flex-start" gap="xl" wrap="wrap">
            <Avatar
              src={getPetPhotoUrl(pet.photoFileName)}
              size={148}
              radius="lg"
              color="vetGreen"
            >
              <IconPaw size={56} stroke={1.4} />
            </Avatar>

            <SimpleGrid
              cols={{ base: 1, sm: 2, lg: 4 }}
              spacing="lg"
              style={{ flex: 1, minWidth: 280 }}
            >
              <InfoItem label="Sexo" value={formatPetSex(pet.sex)} />
              <InfoItem label="Edad" value={calculateAge(pet.birthDate)} />
              <InfoItem
                label="Nacimiento"
                value={formatDate(pet.birthDate)}
              />
              <InfoItem label="Peso actual" value={formatWeight(pet.weightKg)} />
              <InfoItem label="Color" value={pet.color ?? 'Sin dato'} />
              <InfoItem
                label="Esterilizado/a"
                value={pet.sterilized ? 'Sí' : 'No'}
              />
              <InfoItem
                label="Último registro"
                value={formatDate(pet.lastRecordDate)}
              />
              <InfoItem
                label="Próxima vacuna"
                value={formatDate(pet.nextVaccineDue)}
                alert={
                  pet.nextVaccineDue
                    ? dayjs(pet.nextVaccineDue).isBefore(dayjs(), 'day')
                    : false
                }
              />
            </SimpleGrid>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="lg">
            <InfoBlock
              label="Alergias"
              value={pet.allergies ?? 'Sin alergias registradas'}
              alert={Boolean(pet.allergies)}
            />
            <InfoBlock
              label="Condiciones crónicas"
              value={pet.chronicConditions ?? 'Sin condiciones registradas'}
            />
          </SimpleGrid>

          {pet.notes ? (
            <Box mt="lg" pt="lg" style={{ borderTop: '1px solid #e6eeea' }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Notas
              </Text>
              <Text size="sm" mt={6} style={{ whiteSpace: 'pre-wrap' }}>
                {pet.notes}
              </Text>
            </Box>
          ) : null}
        </Card>

        <Card padding="lg">
          <Tabs defaultValue="historial">
            <Tabs.List mb="lg">
              <Tabs.Tab value="historial" leftSection={<IconStethoscope size={16} />}>
                Historial clínico
              </Tabs.Tab>
              <Tabs.Tab value="peso" leftSection={<IconScale size={16} />}>
                Evolución de peso
              </Tabs.Tab>
              <Tabs.Tab value="vacunas" leftSection={<IconVaccine size={16} />}>
                Vacunas
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="historial">
              <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
                <Select
                  data={HISTORY_FILTER_OPTIONS}
                  value={historyFilter}
                  onChange={(value) =>
                    setHistoryFilter((value as MedicalRecordType | 'todos') ?? 'todos')
                  }
                  allowDeselect={false}
                  w={240}
                />
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setRecordOpened(true)}
                >
                  Agregar registro
                </Button>
              </Group>

              {recordsQuery.isPending ? (
                <Center py={40}>
                  <Loader color="vetGreen" size="sm" />
                </Center>
              ) : recordsQuery.isError ? (
                <Alert color="red" icon={<IconAlertCircle size={18} />}>
                  No se pudo cargar el historial clínico.
                </Alert>
              ) : historyRecords.length === 0 ? (
                <EmptyPanel
                  icon={<IconStethoscope size={30} />}
                  title="Sin registros clínicos"
                  description={
                    records.length === 0
                      ? 'Agregá la primera consulta, vacuna o nota de esta mascota.'
                      : 'No hay registros para el filtro seleccionado.'
                  }
                  onAction={
                    records.length === 0
                      ? () => setRecordOpened(true)
                      : undefined
                  }
                />
              ) : (
                <Timeline bulletSize={34} lineWidth={2}>
                  {historyRecords.map((record) => {
                    const definition = RECORD_TYPES[record.type]
                    const Icon = definition.icon

                    return (
                      <Timeline.Item
                        key={record.id}
                        color={definition.color}
                        bullet={<Icon size={16} />}
                        title={
                          <Group gap="sm" wrap="wrap">
                            <Text fw={700} size="sm">
                              {record.title}
                            </Text>
                            <Badge
                              size="xs"
                              variant="light"
                              color={definition.color}
                              radius="sm"
                            >
                              {definition.label}
                            </Badge>
                          </Group>
                        }
                      >
                        <Text size="xs" c="dimmed" mb={6}>
                          {formatDate(record.date)}
                          {record.vetName ? ` · ${record.vetName}` : ''}
                          {record.createdByName
                            ? ` · Registrado por ${record.createdByName}`
                            : ''}
                        </Text>

                        {record.description ? (
                          <Text size="sm" mb={4} style={{ whiteSpace: 'pre-wrap' }}>
                            {record.description}
                          </Text>
                        ) : null}
                        {record.diagnosis ? (
                          <Text size="sm" mb={2}>
                            <Text span fw={600}>
                              Diagnóstico:
                            </Text>{' '}
                            {record.diagnosis}
                          </Text>
                        ) : null}
                        {record.treatment ? (
                          <Text size="sm" mb={2}>
                            <Text span fw={600}>
                              Tratamiento:
                            </Text>{' '}
                            {record.treatment}
                          </Text>
                        ) : null}
                        <Group gap="sm" mt={6}>
                          {record.weightKg !== null ? (
                            <Badge size="xs" variant="light" color="blue">
                              {formatWeight(record.weightKg)}
                            </Badge>
                          ) : null}
                          {record.nextDueDate ? (
                            <Badge
                              size="xs"
                              variant="light"
                              color={
                                dayjs(record.nextDueDate).isBefore(dayjs(), 'day')
                                  ? 'red'
                                  : 'violet'
                              }
                            >
                              Próxima dosis: {formatDate(record.nextDueDate)}
                            </Badge>
                          ) : null}
                        </Group>
                      </Timeline.Item>
                    )
                  })}
                </Timeline>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="peso">
              <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
                <div>
                  <Title order={4}>Evolución de peso</Title>
                  <Text size="sm" c="dimmed">
                    {weights.length === 0
                      ? 'Todavía no hay controles de peso registrados.'
                      : `${weights.length} ${
                          weights.length === 1 ? 'registro' : 'registros'
                        } de peso.`}
                  </Text>
                </div>
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setRecordOpened(true)}
                >
                  Registrar peso
                </Button>
              </Group>

              {weightsQuery.isPending ? (
                <Center py={40}>
                  <Loader color="vetGreen" size="sm" />
                </Center>
              ) : weights.length === 0 ? (
                <EmptyPanel
                  icon={<IconScale size={30} />}
                  title="Sin datos de peso"
                  description="Agregá un registro de peso para ver la evolución de la mascota."
                  onAction={() => setRecordOpened(true)}
                />
              ) : (
                <Stack gap="lg">
                  <Box h={300}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e6eeea" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          unit=" kg"
                          width={62}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toLocaleString('es-AR')} kg`,
                            'Peso'
                          ]}
                          labelFormatter={(_label, payload) =>
                            payload[0]?.payload?.fullDate ?? ''
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          name="Peso"
                          stroke="#0ca678"
                          strokeWidth={2.5}
                          dot={{ r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>

                  <Stack gap="xs">
                    {[...weights].reverse().map((entry) => (
                      <Group
                        key={entry.id}
                        justify="space-between"
                        py={8}
                        px="sm"
                        style={{
                          borderBottom: '1px solid #edf3f0'
                        }}
                      >
                        <div>
                          <Text size="sm" fw={600}>
                            {formatWeight(entry.weightKg)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {entry.title}
                          </Text>
                        </div>
                        <Text size="sm" c="dimmed">
                          {formatDate(entry.date)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="vacunas">
              <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap">
                <div>
                  <Title order={4}>Recordatorios de vacunas</Title>
                  <Text size="sm" c="dimmed">
                    Se toma la última dosis registrada de cada vacuna.
                  </Text>
                </div>
                <Button
                  variant="light"
                  leftSection={<IconVaccine size={16} />}
                  onClick={() => setRecordOpened(true)}
                >
                  Registrar vacuna
                </Button>
              </Group>

              {vaccines.length === 0 ? (
                <EmptyPanel
                  icon={<IconVaccine size={30} />}
                  title="Sin vacunas con próxima dosis"
                  description="Al registrar una vacuna podés indicar la fecha de la próxima dosis."
                  onAction={() => setRecordOpened(true)}
                />
              ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  {vaccines.map((record) => {
                    const days = record.nextDueDate
                      ? dayjs(record.nextDueDate).diff(dayjs().startOf('day'), 'day')
                      : 0
                    const overdue = days < 0

                    return (
                      <Card key={record.id} padding="lg" withBorder>
                        <Group justify="space-between" align="flex-start" mb="sm">
                          <Group gap="sm">
                            <IconVaccine
                              size={20}
                              color="var(--mantine-color-violet-6)"
                            />
                            <div>
                              <Text fw={700}>{record.title}</Text>
                              <Text size="xs" c="dimmed">
                                Última dosis: {formatDate(record.date)}
                              </Text>
                            </div>
                          </Group>
                          <Badge
                            color={overdue ? 'red' : days <= 30 ? 'orange' : 'vetGreen'}
                            variant="light"
                            radius="sm"
                          >
                            {formatDueIn(days)}
                          </Badge>
                        </Group>
                        <Group gap={6} mt="md">
                          <IconCalendarEvent
                            size={15}
                            color="var(--mantine-color-gray-6)"
                          />
                          <Text size="sm">
                            Próxima dosis: {formatDate(record.nextDueDate)}
                          </Text>
                        </Group>
                        {overdue ? (
                          <Alert
                            color="red"
                            variant="light"
                            icon={<IconAlertTriangle size={16} />}
                            mt="md"
                            p="xs"
                          >
                            <Text size="xs">
                              La fecha de refuerzo ya pasó. Revisá si corresponde
                              aplicarla.
                            </Text>
                          </Alert>
                        ) : null}
                      </Card>
                    )
                  })}
                </SimpleGrid>
              )}
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>

      <PetFormModal
        opened={editOpened}
        onClose={() => setEditOpened(false)}
        pet={pet}
      />

      <MedicalRecordModal
        opened={recordOpened}
        onClose={() => setRecordOpened(false)}
        petId={pet.id}
      />
    </>
  )
}

function InfoItem({
  label,
  value,
  alert = false
}: {
  label: string
  value: string
  alert?: boolean
}): React.JSX.Element {
  return (
    <Box>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Text size="sm" mt={3} c={alert ? 'red' : undefined} fw={alert ? 600 : 500}>
        {value}
      </Text>
    </Box>
  )
}

function InfoBlock({
  label,
  value,
  alert = false
}: {
  label: string
  value: string
  alert?: boolean
}): React.JSX.Element {
  return (
    <Box
      p="md"
      style={{
        background: alert ? '#fff5f5' : '#f7faf8',
        borderRadius: 10
      }}
    >
      <Text size="xs" fw={700} c={alert ? 'red' : 'dimmed'} tt="uppercase">
        {label}
      </Text>
      <Text size="sm" mt={4} style={{ whiteSpace: 'pre-wrap' }}>
        {value}
      </Text>
    </Box>
  )
}

function EmptyPanel({
  icon,
  title,
  description,
  onAction
}: {
  icon: React.ReactNode
  title: string
  description: string
  onAction?: () => void
}): React.JSX.Element {
  return (
    <Center py={45}>
      <Stack align="center" gap="sm" maw={420}>
        <Box c="var(--mantine-color-gray-5)">{icon}</Box>
        <Text fw={600}>{title}</Text>
        <Text size="sm" c="dimmed" ta="center">
          {description}
        </Text>
        {onAction ? (
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={onAction}>
            Agregar registro
          </Button>
        ) : null}
      </Stack>
    </Center>
  )
}
