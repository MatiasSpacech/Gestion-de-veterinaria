import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'
import { formatDate, formatPetSex } from '@renderer/lib/format'

import { AppButton } from '../../src/components/AppButton'
import { EmptyState } from '../../src/components/EmptyState'
import { ListRow } from '../../src/components/ListRow'
import { Screen } from '../../src/components/Screen'
import { SectionCard } from '../../src/components/SectionCard'
import {
  getClient,
  listClientPets,
  listPetHistory
} from '../../src/features/clients/clients-service'
import type { ClientDetail, MedicalRecord, PetRecord } from '@shared/types'

export default function ClientDetailScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { id } = useLocalSearchParams<{ id: string }>()
  const clientId = Number(id)

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [pets, setPets] = useState<PetRecord[]>([])
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null)
  const [history, setHistory] = useState<MedicalRecord[]>([])

  const selectedPetId = selectedPet?.id ?? null

  const load = useCallback(() => {
    setClient(getClient(clientId))

    const nextPets = listClientPets(clientId)
    setPets(nextPets)

    if (selectedPetId) {
      const refreshed =
        nextPets.find((pet) => pet.id === selectedPetId) ?? null

      if (refreshed) {
        setSelectedPet(refreshed)
      }

      setHistory(listPetHistory({ petId: selectedPetId }))
    }
  }, [clientId, selectedPetId])

  useFocusEffect(
    useCallback(() => {
      if (!Number.isFinite(clientId)) {
        return
      }

      load()
    }, [clientId, load])
  )

  const handleSelectPet = (pet: PetRecord) => {
    setSelectedPet(pet)
    setHistory(listPetHistory({ petId: pet.id }))
  }

  const openNewRecord = (pet: PetRecord) => {
    router.push(`/mascotas/${pet.id}/registro`)
  }

  if (!client) {
    return (
      <Screen showBack title="Cliente">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Cargando la ficha...
        </Text>
      </Screen>
    )
  }

  return (
    <Screen showBack title={client.name} subtitle="Ficha del cliente">
      <SectionCard title="Datos">
        <View style={styles.list}>
          {client.phone ? (
            <ListRow
              icon="call-outline"
              title={client.phone}
              description="Llamar al cliente"
              onPress={() => {
                void Linking.openURL(`tel:${client.phone}`)
              }}
              showChevron={false}
            />
          ) : null}
          {client.email ? (
            <ListRow
              icon="mail-outline"
              title={client.email}
              description="Enviar un correo"
              showChevron={false}
            />
          ) : null}
          {client.docNumber ? (
            <ListRow
              icon="card-outline"
              title={client.docNumber}
              description="Documento"
              showChevron={false}
            />
          ) : null}
          {client.address ? (
            <ListRow
              icon="location-outline"
              title={client.address}
              description="Dirección"
              showChevron={false}
            />
          ) : null}
          {client.notes ? (
            <ListRow
              icon="document-text-outline"
              title={client.notes}
              description="Notas"
              showChevron={false}
            />
          ) : null}
        </View>
      </SectionCard>

      <SectionCard
        title="Mascotas"
        subtitle={`${pets.length} en la ficha`}
        action={
          <Button
            compact
            icon="plus"
            onPress={() =>
              router.push(`/clientes/nueva-mascota?clientId=${client.id}`)
            }
          >
            Agregar
          </Button>
        }
      >
        {pets.length === 0 ? (
          <EmptyState
            icon="paw-outline"
            title="Sin mascotas"
            description="Este cliente todavía no tiene mascotas cargadas."
          />
        ) : (
          <View style={styles.list}>
            {pets.map((pet) => (
              <ListRow
                key={pet.id}
                icon="paw"
                title={pet.name}
                description={`${pet.species}${
                  pet.breed ? ` · ${pet.breed}` : ''
                } · ${formatPetSex(pet.sex)}`}
                onPress={() => handleSelectPet(pet)}
              />
            ))}
          </View>
        )}
      </SectionCard>

      {selectedPet ? (
        <SectionCard
          title={`Historial de ${selectedPet.name}`}
          subtitle={
            selectedPet.nextVaccineDue
              ? `Próxima vacuna: ${formatDate(selectedPet.nextVaccineDue)}`
              : 'Sin vacunas programadas'
          }
          action={
            <Button
              compact
              icon="plus"
              onPress={() => openNewRecord(selectedPet)}
            >
              Registro
            </Button>
          }
        >
          {history.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Sin registros"
              description="Todavía no hay consultas ni vacunas cargadas."
            />
          ) : (
            <View style={styles.list}>
              {history.map((record) => (
                <View key={record.id} style={styles.record}>
                  <Text variant="titleSmall" style={styles.title}>
                    {record.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {formatDate(record.date)}
                    {record.nextDueDate
                      ? ` · próxima: ${formatDate(record.nextDueDate)}`
                      : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      ) : null}

      {selectedPet ? (
        <AppButton
          icon="document-text-outline"
          mode="outlined"
          onPress={() => openNewRecord(selectedPet)}
        >
          Agregar registro al historial
        </AppButton>
      ) : null}

      <Button
        mode="outlined"
        icon="cart-outline"
        onPress={() =>
          router.push({
            pathname: '/(tabs)/vender',
            params: { clientId: String(client.id) }
          })
        }
      >
        Ir a vender
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 4
  },
  record: {
    borderTopColor: 'rgba(0,0,0,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingTop: 10
  },
  title: {
    fontWeight: '700'
  }
})
