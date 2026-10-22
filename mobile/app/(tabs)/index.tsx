import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Card, Text, useTheme } from 'react-native-paper'
import { formatCurrency, formatDate } from '@renderer/lib/format'

import { EmptyState } from '../../src/components/EmptyState'
import { MetricCard } from '../../src/components/MetricCard'
import { Screen } from '../../src/components/Screen'
import { SectionCard } from '../../src/components/SectionCard'
import { getDashboard, type DashboardData } from '../../src/features/dashboard/dashboard-service'

export default function HomeScreen() {
  const router = useRouter()
  const theme = useTheme()
  const [data, setData] = useState<DashboardData | null>(null)

  const load = useCallback(() => {
    setData(getDashboard())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <Screen title="Inicio" subtitle="Panel de operación diaria del local.">
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Cargando el panel...
        </Text>
      </Screen>
    )
  }

  return (
    <Screen
      title="Inicio"
      subtitle="Panel de operación diaria del local, disponible sin conexión."
      actions={
        <Button compact onPress={load}>
          Actualizar
        </Button>
      }
    >
      <View style={styles.grid}>
        <MetricCard
          icon="cash-outline"
          label="Ventas de hoy"
          value={String(data.sales.todayCount)}
          hint={formatCurrency(data.sales.todayTotalCents)}
        />
        <MetricCard
          icon="calendar-outline"
          label="Turnos de hoy"
          value={String(data.appointments.todayCount)}
          hint={`${data.appointments.activeCount} activos`}
        />
        <MetricCard
          icon="alert-circle-outline"
          label="Stock bajo"
          value={String(data.inventory.lowStock)}
          hint={`${data.inventory.outOfStock} sin stock`}
        />
        <MetricCard
          icon="medkit-outline"
          label="Vacunas próximas"
          value={String(data.vaccines.length)}
          hint={`${data.inventory.totalProducts} productos`}
        />
      </View>

      <SectionCard
        title="Turnos de hoy"
        subtitle={`${data.todayAppointments.length} turnos`}
        action={
          <Button compact onPress={() => router.push('/(tabs)/agenda')}>
            Ver agenda
          </Button>
        }
      >
        {data.todayAppointments.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Sin turnos para hoy"
            description="Los turnos de peluquería y consulta aparecen acá."
          />
        ) : (
          <View style={styles.list}>
            {data.todayAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {appointment.petName} · {appointment.clientName}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {formatTimeRange(appointment.startMinutes, appointment.endMinutes)}
                    {' · '}
                    {appointment.groomerName} · {formatCurrency(appointment.totalCents)}
                  </Text>
                </View>
                <Text variant="labelSmall" style={styles.badge}>
                  {appointment.status}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Stock bajo"
        subtitle={`${data.lowStockProducts.length} productos por reponer`}
        action={
          <Button compact onPress={() => router.push('/inventario')}>
            Ver inventario
          </Button>
        }
      >
        {data.lowStockProducts.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="Todo el stock en orden"
            description="No hay productos por debajo del mínimo."
          />
        ) : (
          <View style={styles.list}>
            {data.lowStockProducts.slice(0, 5).map((product) => (
              <View key={product.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {product.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    Stock {product.stock} {product.unit} · mínimo {product.minStock}
                  </Text>
                </View>
                <Ionicons
                  name={product.outOfStock ? 'close-circle' : 'alert-circle'}
                  size={20}
                  color={theme.colors.error}
                />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Vacunas próximas"
        subtitle={`${data.vaccines.length} pendientes`}
      >
        {data.vaccines.length === 0 ? (
          <EmptyState
            icon="medkit-outline"
            title="Sin vacunas pendientes"
            description="No hay vacunas con vencimiento dentro del plazo configurado."
          />
        ) : (
          <View style={styles.list}>
            {data.vaccines.slice(0, 5).map((vaccine) => (
              <View key={`${vaccine.petId}-${vaccine.title}`} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {vaccine.petName} · {vaccine.title}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {vaccine.clientName} · {formatDate(vaccine.nextDueDate)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Últimas ventas"
        subtitle="Movimientos más recientes"
        action={
          <Button compact onPress={() => router.push('/(tabs)/vender')}>
            Vender
          </Button>
        }
      >
        {data.recentSales.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Todavía no hay ventas"
            description="Las ventas del local aparecen en esta lista."
          />
        ) : (
          <View style={styles.list}>
            {data.recentSales.map((sale) => (
              <View key={sale.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {sale.number}
                    {sale.clientName ? ` · ${sale.clientName}` : ''}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {formatDate(sale.createdAt)} · {sale.status}
                  </Text>
                </View>
                <Text variant="titleSmall" style={styles.amount}>
                  {formatCurrency(sale.totalCents)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <Card mode="contained">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleSmall" style={styles.title}>
            Cierre del mes
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Ventas del mes: {formatCurrency(data.sales.monthTotalCents)} · ticket promedio de
            hoy: {formatCurrency(data.sales.todayAverageCents)}
          </Text>
        </Card.Content>
      </Card>
    </Screen>
  )
}

function formatTimeRange(start: number, end: number): string {
  return `${minutesToTime(start)} - ${minutesToTime(end)}`
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  list: {
    gap: 10
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  title: {
    fontWeight: '700'
  },
  badge: {
    fontWeight: '700',
    opacity: 0.7
  },
  amount: {
    fontWeight: '800'
  },
  cardContent: {
    gap: 6
  }
})
