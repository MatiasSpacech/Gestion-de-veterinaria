import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Card, Text, useTheme } from 'react-native-paper'

import { ListRow } from '../../src/components/ListRow'
import { Screen } from '../../src/components/Screen'
import { useSession } from '../../src/data/session-provider'

export default function MoreScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { user, signOut } = useSession()

  return (
    <Screen title="Más" subtitle="Administración, respaldos y herramientas.">
      {user ? (
        <Card mode="elevated">
          <Text variant="labelLarge" style={styles.sectionTitle}>
            Sesión
          </Text>
          <ListRow
            icon="person-circle-outline"
            title={user.name}
            description={`Usuario ${user.username}`}
            showChevron={false}
          />
        <ListRow
          icon="log-out-outline"
          title="Cerrar sesión"
          description="Volver a pedir usuario y contraseña"
          onPress={() => {
            signOut()
            router.replace('/login')
          }}
        />
        </Card>
      ) : null}

      <Card mode="elevated">
        <Text variant="labelLarge" style={styles.sectionTitle}>
          Operación
        </Text>
        <ListRow
          icon="cube-outline"
          title="Inventario"
          description="Productos, stock y alertas"
          onPress={() => router.push('/inventario')}
        />
        <ListRow
          icon="receipt-outline"
          title="Historial de ventas"
          description="Ventas registradas y anulaciones"
          onPress={() => router.push('/ventas')}
        />
      </Card>

      <Card mode="elevated">
        <Text variant="labelLarge" style={styles.sectionTitle}>
          Administración
        </Text>
        <ListRow
          disabled
          icon="shield-checkmark-outline"
          title="Usuarios y roles"
          description="Disponible en la Fase 4"
        />
        <ListRow
          disabled
          icon="cog-outline"
          title="Configuración del negocio"
          description="Disponible en la Fase 4"
        />
        <ListRow
          icon="archive-outline"
          title="Backups y restauración"
          description="Copias de seguridad de la base local"
          onPress={() => router.push('/backups')}
        />
      </Card>

      <Card mode="elevated">
        <Text variant="labelLarge" style={styles.sectionTitle}>
          Herramientas
        </Text>
        <ListRow
          icon="pulse-outline"
          title="Diagnóstico técnico"
          description="Verifica SQLite, servicios y scrypt nativo"
          onPress={() => router.push('/diagnostico')}
        />
      </Card>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          VetGestión Mobile 1.0.0 · Fase 2
        </Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: {
    paddingBottom: 4,
    paddingHorizontal: 12,
    paddingTop: 12
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 8
  }
})
