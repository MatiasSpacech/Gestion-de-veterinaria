import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertCircle } from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AppointmentRecord,
  GroomerRecord,
  ServiceRecord
} from '@shared/types'
import { api } from '@renderer/lib/api'
import { formatCurrency } from '@renderer/lib/format'
import { formatMinutes, parseTime } from './grooming-constants'

interface AppointmentFormModalProps {
  opened: boolean
  onClose: () => void
  appointment: AppointmentRecord | null
  defaultDate: string
  groomers: GroomerRecord[]
  services: ServiceRecord[]
}

interface AppointmentFormValues {
  clientId: string | null
  petId: string | null
  groomerId: string | null
  date: string
  startTime: string
  serviceIds: string[]
  notes: string
}

export function AppointmentFormModal({
  opened,
  onClose,
  appointment,
  defaultDate,
  groomers,
  services
}: AppointmentFormModalProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const form = useForm<AppointmentFormValues>({
    initialValues: {
      clientId: null,
      petId: null,
      groomerId: null,
      date: defaultDate,
      startTime: '09:00',
      serviceIds: [],
      notes: ''
    },
    validate: {
      clientId: (value) => (value ? null : 'Seleccioná el cliente'),
      petId: (value) => (value ? null : 'Seleccioná la mascota'),
      groomerId: (value) => (value ? null : 'Seleccioná el peluquero'),
      date: (value) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Ingresá una fecha válida',
      startTime: (value) =>
        parseTime(value) === null ? 'Ingresá una hora válida' : null,
      serviceIds: (value) =>
        value.length > 0 ? null : 'Agregá al menos un servicio'
    }
  })
  const { reset, resetDirty, setValues, setFieldValue } = form

  useEffect(() => {
    if (!opened) {
      return
    }

    if (appointment) {
      setValues({
        clientId: String(appointment.clientId),
        petId: String(appointment.petId),
        groomerId: String(appointment.groomerId),
        date: appointment.date,
        startTime: formatMinutes(appointment.startMinutes),
        serviceIds: appointment.services
          .filter((service) => service.serviceId !== null)
          .map((service) => String(service.serviceId)),
        notes: appointment.notes ?? ''
      })
    } else {
      setValues({
        clientId: null,
        petId: null,
        groomerId: null,
        date: defaultDate,
        startTime: '09:00',
        serviceIds: [],
        notes: ''
      })
    }

    resetDirty()
  }, [opened, appointment, defaultDate, setValues, resetDirty])

  const clientsQuery = useQuery({
    queryKey: ['clients', 'grooming-options'],
    queryFn: () => api.clients.list({ search: '', includeInactive: false }),
    enabled: opened
  })

  const clientId = form.values.clientId ? Number(form.values.clientId) : null
  const clientQuery = useQuery({
    queryKey: ['clients', 'detail', clientId],
    queryFn: () => api.clients.get({ id: clientId! }),
    enabled: opened && clientId !== null
  })

  const clientOptions = useMemo(
    () =>
      (clientsQuery.data ?? []).map((client) => ({
        value: String(client.id),
        label: client.phone ? `${client.name} · ${client.phone}` : client.name
      })),
    [clientsQuery.data]
  )

  const petOptions = useMemo(
    () =>
      (clientQuery.data?.pets ?? [])
        .filter((pet) => pet.active)
        .map((pet) => ({
          value: String(pet.id),
          label: `${pet.name} · ${pet.species}`
        })),
    [clientQuery.data]
  )

  const activeGroomers = groomers.filter((groomer) => groomer.active)
  const groomingServices = services.filter(
    (service) => service.active && service.category === 'peluqueria'
  )
  const groomerOptions = activeGroomers.map((groomer) => ({
    value: String(groomer.id),
    label: groomer.name
  }))
  const serviceOptions = groomingServices.map((service) => ({
    value: String(service.id),
    label: `${service.name} · ${service.durationMinutes} min · ${formatCurrency(
      service.priceCents
    )}`
  }))

  const selectedServices = form.values.serviceIds
    .map((id) => groomingServices.find((service) => String(service.id) === id))
    .filter((service): service is ServiceRecord => Boolean(service))
  const totalDuration = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0
  )
  const totalCents = selectedServices.reduce(
    (total, service) => total + service.priceCents,
    0
  )

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    void form.onSubmit(async (values) => {
      const startMinutes = parseTime(values.startTime)

      if (startMinutes === null) {
        return
      }

      setLoading(true)

      try {
        const input = {
          clientId: Number(values.clientId),
          petId: Number(values.petId),
          groomerId: Number(values.groomerId),
          date: values.date,
          startMinutes,
          serviceIds: values.serviceIds.map(Number),
          notes: values.notes
        }

        if (appointment) {
          await api.grooming.updateAppointment({ id: appointment.id, ...input })
        } else {
          await api.grooming.createAppointment(input)
        }

        await queryClient.invalidateQueries({ queryKey: ['grooming'] })
        notifications.show({
          color: 'vetGreen',
          title: appointment ? 'Turno actualizado' : 'Turno agendado',
          message: `${values.date.split('-').reverse().join('/')} a las ${
            values.startTime
          }`
        })
        handleClose()
      } catch (error) {
        notifications.show({
          color: 'red',
          title: appointment
            ? 'No se pudo actualizar el turno'
            : 'No se pudo agendar el turno',
          message: error instanceof Error ? error.message : 'Intentá nuevamente.'
        })
      } finally {
        setLoading(false)
      }
    })(event)
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={appointment ? 'Editar turno' : 'Nuevo turno'}
      size="lg"
      centered
      closeOnClickOutside={!loading}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Cliente"
              placeholder="Buscar cliente"
              data={clientOptions}
              searchable
              clearable
              nothingFoundMessage="No hay clientes"
              {...form.getInputProps('clientId')}
              onChange={(value) => {
                setFieldValue('clientId', value)
                setFieldValue('petId', null)
              }}
            />
            <Select
              label="Mascota"
              placeholder={
                form.values.clientId ? 'Seleccionar mascota' : 'Elegí un cliente'
              }
              data={petOptions}
              disabled={!form.values.clientId || clientQuery.isPending}
              searchable
              nothingFoundMessage="El cliente no tiene mascotas activas"
              {...form.getInputProps('petId')}
            />
          </SimpleGrid>

          {form.values.clientId &&
          clientQuery.isSuccess &&
          petOptions.length === 0 ? (
            <Alert color="orange" variant="light" icon={<IconAlertCircle />}>
              El cliente no tiene mascotas activas. Cargá una mascota antes de
              agendar el turno.
            </Alert>
          ) : null}

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Select
              label="Peluquero"
              placeholder="Seleccionar"
              data={groomerOptions}
              searchable
              {...form.getInputProps('groomerId')}
            />
            <TextInput
              label="Fecha"
              type="date"
              {...form.getInputProps('date')}
            />
            <TextInput
              label="Hora de inicio"
              type="time"
              {...form.getInputProps('startTime')}
            />
          </SimpleGrid>

          <MultiSelect
            label="Servicios"
            placeholder="Seleccionar uno o más servicios"
            data={serviceOptions}
            searchable
            nothingFoundMessage="No hay servicios de peluquería activos"
            {...form.getInputProps('serviceIds')}
          />

          {selectedServices.length > 0 ? (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Duración estimada: {totalDuration} min
              </Text>
              <Text size="sm" fw={700}>
                Total: {formatCurrency(totalCents)}
              </Text>
            </Group>
          ) : null}

          <Textarea
            label="Notas"
            placeholder="Indicaciones, alergias o preferencias"
            minRows={2}
            maxLength={500}
            {...form.getInputProps('notes')}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {appointment ? 'Guardar cambios' : 'Agendar turno'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
