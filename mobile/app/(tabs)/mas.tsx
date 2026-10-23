import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Card, Text, useTheme } from 'react-native-paper'

import { ListRow } from '../../src/components/ListRow'
import { Screen } from '../../src/components/Screen'
import { canAccess } from '../../src/data/controllers/permissions'
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
        {canAccess('usuarios') ? (
          <ListRow
            icon="shield-checkmark-outline"
            title="Usuarios y roles"
            description="Altas, permisos y contraseñas"
            onPress={() => router.push('/usuarios')}
          />
        ) : null}
        {canAccess('configuracion') ? (
          <ListRow
            icon="cog-outline"
            title="Configuración del negocio"
            description="Datos, agenda, alertas y respaldos"
            onPress={() => router.push('/configuracion')}
          />
        ) : null}
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
        {canAccess('reportes') ? (
          <ListRow
            icon="stats-chart-outline"
            title="Reportes"
            description="Resumen, ranking y exportación CSV/PDF"
            onPress={() => router.push('/reportes')}
          />
        ) : null}
        <ListRow
          icon="finger-print-outline"
          title="Seguridad"
          description="Bloqueo biométrico y automático"
          onPress={() => router.push('/seguridad')}
        />
        <ListRow
          icon="pulse-outline"
          title="Diagnóstico técnico"
          description="Verifica SQLite, servicios y scrypt nativo"
          onPress={() => router.push('/diagnostico')}
        />
      </Card>

      <View style={styles.footer}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          VetGestión Mobile 1.0.0 · Fase 4
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
