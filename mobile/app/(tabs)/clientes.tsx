import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Text, useTheme } from 'react-native-paper'

import { AppTextInput } from '../../src/components/AppTextInput'
import { EmptyState } from '../../src/components/EmptyState'
import { ListRow } from '../../src/components/ListRow'
import { Screen } from '../../src/components/Screen'
import { SectionCard } from '../../src/components/SectionCard'
import { listClientsDirectory } from '../../src/features/clients/clients-service'
import type { ClientRecord } from '@shared/types'

export default function ClientsScreen() {
  const router = useRouter()
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [clients, setClients] = useState<ClientRecord[]>([])

  const load = useCallback(() => {
    setClients(listClientsDirectory({ search }))
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Screen
      title="Clientes"
      subtitle="Fichas de clientes, mascotas e historial clínico."
      actions={
        <Button compact icon="account-plus" onPress={() => router.push('/clientes/nuevo')}>
          Nuevo
        </Button>
      }
    >
      <AppTextInput
        dense
        label="Buscar"
        onChangeText={setSearch}
        placeholder="Nombre, teléfono o documento"
        value={search}
      />

      {clients.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Sin clientes"
          description="Cargá el primer cliente para empezar a registrar ventas y turnos."
        />
      ) : (
        <SectionCard title="Listado" subtitle={`${clients.length} clientes`}>
          <View style={styles.list}>
            {clients.map((client) => (
              <ListRow
                key={client.id}
                icon="person-outline"
                title={client.name}
                description={`${client.petCount} mascotas${
                  client.phone ? ` · ${client.phone}` : ''
                }`}
                onPress={() => router.push(`/clientes/${client.id}`)}
              />
            ))}
          </View>
        </SectionCard>
      )}

      <Text
        variant="bodySmall"
        style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
      >
        Tocá un cliente para ver sus mascotas y el historial.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: 4
  }
})
