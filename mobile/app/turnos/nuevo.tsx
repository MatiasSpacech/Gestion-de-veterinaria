import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Chip, Text, useTheme } from 'react-native-paper'
import { formatCurrency } from '@renderer/lib/format'
import { AppError } from '@shared/errors'
import type { ClientRecord, GroomerRecord, PetRecord, ServiceRecord } from '@shared/types'

import { AppButton } from '../../src/components/AppButton'
import { AppTextInput } from '../../src/components/AppTextInput'
import { EmptyState } from '../../src/components/EmptyState'
import { Screen } from '../../src/components/Screen'
import { SectionCard } from '../../src/components/SectionCard'
import { toAppError } from '../../src/data/controllers/validation'
import { listClientPets, listClientsDirectory } from '../../src/features/clients/clients-service'
import { localDateKey } from '../../src/features/dashboard/dashboard-service'
import {
  createTurn,
  listActiveGroomers,
  listGroomingServices
} from '../../src/features/grooming/grooming-service'

export default function NewAppointmentScreen() {
  const router = useRouter()
  const theme = useTheme()

  const [groomers, setGroomers] = useState<GroomerRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<ClientRecord[]>([])
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [pets, setPets] = useState<PetRecord[]>([])
  const [petId, setPetId] = useState<number | null>(null)
  const [groomerId, setGroomerId] = useState<number | null>(null)
  const [serviceIds, setServiceIds] = useState<number[]>([])
  const [date, setDate] = useState(localDateKey())
  const [time, setTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setGroomers(listActiveGroomers())
    setServices(listGroomingServices())
  }, [])

  useEffect(() => {
    setClientResults(listClientsDirectory({ search: clientSearch }))
  }, [clientSearch])

  const selectClient = (record: ClientRecord) => {
    setClient(record)
    setClientSearch(record.name)
    setPetId(null)
    setPets(listClientPets(record.id))
  }

  const toggleService = (serviceId: number) => {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    )
  }

  const selectedServices = useMemo(
    () => services.filter((service) => serviceIds.includes(service.id)),
    [serviceIds, services]
  )

  const totalCents = selectedServices.reduce(
    (total, service) => total + service.priceCents,
    0
  )
  const durationMinutes = selectedServices.reduce(
    (total, service) => total + service.durationMinutes,
    0
  )

  const handleSubmit = () => {
    setError(null)

    try {
      if (!client) {
        throw new AppError('VALIDATION_ERROR', 'Elegí un cliente')
      }

      if (petId === null) {
        throw new AppError('VALIDATION_ERROR', 'Elegí una mascota')
      }

      if (groomerId === null) {
        throw new AppError('VALIDATION_ERROR', 'Elegí un peluquero')
      }

      if (serviceIds.length === 0) {
        throw new AppError('VALIDATION_ERROR', 'Agregá al menos un servicio')
      }

      const startMinutes = parseTime(time)

      setBusy(true)

      createTurn({
        clientId: client.id,
        petId,
        groomerId,
        date: date.trim(),
        startMinutes,
        serviceIds,
        notes: notes.trim() === '' ? null : notes
      })

      router.back()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      showBack
      title="Nuevo turno"
      subtitle="Agenda un turno de peluquería o consulta."
    >
      <SectionCard title="Cliente y mascota">
        <AppTextInput
          dense
          label="Buscar cliente"
          onChangeText={setClientSearch}
          placeholder="Nombre o teléfono"
          value={clientSearch}
        />

        {client ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
            {`Cliente: ${client.name}`}
          </Text>
        ) : clientResults.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Sin clientes que coincidan.
          </Text>
        ) : (
          <ScrollView style={styles.results} nestedScrollEnabled>
            {clientResults.slice(0, 6).map((record) => (
              <Chip
                key={record.id}
                style={styles.resultChip}
                onPress={() => selectClient(record)}
              >
                {record.phone ? `${record.name} · ${record.phone}` : record.name}
              </Chip>
            ))}
          </ScrollView>
        )}

        {client ? (
          pets.length === 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              El cliente no tiene mascotas cargadas.
            </Text>
          ) : (
            <View style={styles.chips}>
              {pets.map((pet) => (
                <Chip
                  key={pet.id}
                  selected={petId === pet.id}
                  onPress={() => setPetId(pet.id)}
                >
                  {pet.name}
                </Chip>
              ))}
            </View>
          )
        ) : null}
      </SectionCard>

      <SectionCard title="Peluquero">
        {groomers.length === 0 ? (
          <EmptyState
            icon="person-outline"
            title="Sin peluqueros"
            description="Cargá peluqueros desde la app de escritorio."
          />
        ) : (
          <View style={styles.chips}>
            {groomers.map((groomer) => (
              <Chip
                key={groomer.id}
                selected={groomerId === groomer.id}
                onPress={() => setGroomerId(groomer.id)}
              >
                {groomer.name}
              </Chip>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Servicios"
        subtitle={
          selectedServices.length > 0
            ? `${formatCurrency(totalCents)} · ${durationMinutes} min`
            : 'Elegí uno o más servicios'
        }
      >
        {services.length === 0 ? (
          <EmptyState
            icon="pricetag-outline"
            title="Sin servicios"
            description="Cargá servicios desde la app de escritorio."
          />
        ) : (
          <View style={styles.chips}>
            {services.map((service) => (
              <Chip
                key={service.id}
                selected={serviceIds.includes(service.id)}
                onPress={() => toggleService(service.id)}
              >
                {`${service.name} · ${formatCurrency(service.priceCents)}`}
              </Chip>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Fecha y hora">
        <AppTextInput
          label="Fecha"
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          value={date}
        />
        <AppTextInput
          label="Hora"
          onChangeText={setTime}
          placeholder="HH:MM"
          value={time}
        />
        <AppTextInput
          label="Notas"
          multiline
          numberOfLines={2}
          onChangeText={setNotes}
          value={notes}
        />
      </SectionCard>

      {error ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : null}

      <AppButton disabled={busy} loading={busy} onPress={handleSubmit}>
        Agendar turno
      </AppButton>
    </Screen>
  )
}

function parseTime(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())

  if (!match) {
    throw new AppError('VALIDATION_ERROR', 'Ingresá la hora como HH:MM')
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  if (hours > 23 || minutes > 59) {
    throw new AppError('VALIDATION_ERROR', 'La hora no es válida')
  }

  return hours * 60 + minutes
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  results: {
    maxHeight: 180
  },
  resultChip: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    minHeight: 44
  }
})
