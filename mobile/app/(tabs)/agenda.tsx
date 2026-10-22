import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Chip, Dialog, Portal, Text, useTheme } from 'react-native-paper'
import { formatCurrency } from '@renderer/lib/format'
import type { AppointmentStatus, PaymentMethod } from '@shared/types'

import { AppButton } from '../../src/components/AppButton'
import { EmptyState } from '../../src/components/EmptyState'
import { Screen } from '../../src/components/Screen'
import { SectionCard } from '../../src/components/SectionCard'
import { toAppError } from '../../src/data/controllers/validation'
import {
  changeAppointmentStatus,
  chargeTurn,
  listDayAppointments
} from '../../src/features/grooming/grooming-service'
import type { AppointmentRecord } from '@shared/types'

const STATUS_OPTIONS: readonly { value: AppointmentStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'en_proceso', label: 'En curso' },
  { value: 'completado', label: 'Completado' }
]

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' }
]

export default function AgendaScreen() {
  const router = useRouter()
  const theme = useTheme()
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([])
  const [selected, setSelected] = useState<AppointmentRecord | null>(null)
  const [status, setStatus] = useState<AppointmentStatus>('en_proceso')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setAppointments(listDayAppointments())
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const handleStatus = () => {
    if (!selected) {
      return
    }

    setError(null)
    setBusy(true)

    try {
      changeAppointmentStatus({ id: selected.id, status })
      setSelected(null)
      load()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  const handleCharge = () => {
    if (!selected) {
      return
    }

    setError(null)
    setBusy(true)

    try {
      chargeTurn({ id: selected.id, paymentMethod })
      setSelected(null)
      load()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title="Agenda" subtitle="Turnos, estados y cobro de peluquería.">
      <AppButton
        icon="calendar-plus"
        onPress={() => router.push('/turnos/nuevo')}
      >
        Nuevo turno
      </AppButton>

      {appointments.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Sin turnos hoy"
          description="Los turnos de peluquería y consulta aparecen en esta agenda."
        />
      ) : (
        <SectionCard title="Turnos de hoy" subtitle={`${appointments.length} turnos`}>
          <View style={styles.list}>
            {appointments.map((appointment) => (
              <View key={appointment.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {appointment.petName} · {appointment.clientName}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {minutesToTime(appointment.startMinutes)} ·{' '}
                    {appointment.groomerName} · {formatCurrency(appointment.totalCents)}
                  </Text>
                </View>
                <Chip compact>{appointment.status}</Chip>
                <Button
                  compact
                  onPress={() => {
                    setSelected(appointment)
                    setStatus(appointment.status === 'pendiente' ? 'confirmado' : 'en_proceso')
                    setError(null)
                  }}
                >
                  Gestionar
                </Button>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      <Portal>
        <Dialog
          visible={selected !== null}
          onDismiss={() => setSelected(null)}
        >
          <Dialog.Title>Turno de {selected?.petName ?? ''}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium" style={styles.title}>
              {selected?.clientName}
              {selected?.clientPhone ? ` · ${selected.clientPhone}` : ''}
            </Text>

            <Text variant="labelLarge">Estado</Text>
            <View style={styles.chips}>
              {STATUS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={status === option.value}
                  onPress={() => setStatus(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            <Text variant="labelLarge">Medio de pago</Text>
            <View style={styles.chips}>
              {PAYMENT_METHODS.map((method) => (
                <Chip
                  key={method.value}
                  selected={paymentMethod === method.value}
                  onPress={() => setPaymentMethod(method.value)}
                >
                  {method.label}
                </Chip>
              ))}
            </View>

            {error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {error}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>Cerrar</Button>
            <Button disabled={busy} onPress={handleStatus}>
              Guardar estado
            </Button>
            <Button disabled={busy} onPress={handleCharge}>
              Cobrar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  )
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  list: {
    gap: 12
  },
  row: {
    alignItems: 'center',
    borderTopColor: 'rgba(0,0,0,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  title: {
    fontWeight: '700'
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dialogContent: {
    gap: 10
  }
})
