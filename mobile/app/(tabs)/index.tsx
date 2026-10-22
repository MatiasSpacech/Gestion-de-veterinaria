import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Card, Text, useTheme } from 'react-native-paper'

import { AppButton } from '../../src/components/AppButton'
import { MetricCard } from '../../src/components/MetricCard'
import { Screen } from '../../src/components/Screen'

type IconName = keyof typeof Ionicons.glyphMap

const metrics: readonly { icon: IconName; label: string; value: string }[] = [
  { icon: 'cash-outline', label: 'Ventas de hoy', value: '—' },
  { icon: 'calendar-outline', label: 'Turnos de hoy', value: '—' },
  { icon: 'alert-circle-outline', label: 'Stock bajo', value: '—' },
  { icon: 'medkit-outline', label: 'Vacunas próximas', value: '—' }
]

export default function HomeScreen() {
  const router = useRouter()
  const theme = useTheme()

  return (
    <Screen
      title="Inicio"
      subtitle="Panel de operación diaria del local, disponible sin conexión."
    >
      <View style={styles.brandRow}>
        <View
          style={[styles.brandMark, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="paw" size={26} color={theme.colors.onPrimary} />
        </View>
        <View style={styles.brandText}>
          <Text variant="headlineSmall" style={styles.brandTitle}>
            VetGestión
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Fase 1 · Navegación y diseño base
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </View>

      <Card mode="contained">
        <Card.Title
          title="Datos locales listos"
          subtitle="Migraciones, autenticación y ventas ya funcionan sobre SQLite."
          left={() => (
            <Ionicons
              name="checkmark-circle-outline"
              size={26}
              color={theme.colors.primary}
            />
          )}
        />
        <Card.Content style={styles.cardContent}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            La verificación técnica de la Fase 0 sigue disponible desde Más →
            Diagnóstico técnico.
          </Text>
          <AppButton
            mode="contained-tonal"
            icon="pulse"
            onPress={() => router.push('/diagnostico')}
          >
            Abrir diagnóstico
          </AppButton>
        </Card.Content>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  brandText: {
    flex: 1,
    gap: 2
  },
  brandTitle: {
    fontWeight: '800'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  cardContent: {
    gap: 14
  }
})
