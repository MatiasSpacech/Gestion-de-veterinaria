import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Button, Chip, Dialog, Portal, Text, useTheme } from 'react-native-paper'
import { formatCurrency, formatDateTime } from '@renderer/lib/format'

import { AppTextInput } from '../src/components/AppTextInput'
import { EmptyState } from '../src/components/EmptyState'
import { Screen } from '../src/components/Screen'
import { SectionCard } from '../src/components/SectionCard'
import { toAppError } from '../src/data/controllers/validation'
import { annulSale, listRecentSales } from '../src/features/sales/sales-service'
import type { SaleListRecord } from '@shared/types'

export default function SalesHistoryScreen() {
  const theme = useTheme()
  const [sales, setSales] = useState<SaleListRecord[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SaleListRecord | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setSales(listRecentSales({ search }))
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  const handleCancel = () => {
    if (!selected) {
      return
    }

    setError(null)
    setBusy(true)

    try {
      annulSale({ id: selected.id, reason })
      setSelected(null)
      setReason('')
      load()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen showBack title="Ventas" subtitle="Historial de ventas del local.">
      <AppTextInput
        dense
        label="Buscar"
        onChangeText={setSearch}
        placeholder="Número o cliente"
        value={search}
      />

      {sales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Sin ventas"
          description="Todavía no hay ventas registradas en este dispositivo."
        />
      ) : (
        <SectionCard title="Listado" subtitle={`${sales.length} ventas`}>
          <View style={styles.list}>
            {sales.map((sale) => (
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
                    {formatDateTime(sale.createdAt)} · {sale.paymentMethod}
                  </Text>
                </View>
                <Text variant="titleSmall" style={styles.amount}>
                  {formatCurrency(sale.totalCents)}
                </Text>
                <Chip
                  compact
                  selected={sale.status === 'anulada'}
                  onPress={() => {
                    if (sale.status === 'completada') {
                      setSelected(sale)
                      setError(null)
                    }
                  }}
                >
                  {sale.status}
                </Chip>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      <Portal>
        <Dialog visible={selected !== null} onDismiss={() => setSelected(null)}>
          <Dialog.Title>Anular venta</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium" style={styles.title}>
              {selected?.number} · {selected ? formatCurrency(selected.totalCents) : ''}
            </Text>
            <AppTextInput
              label="Motivo"
              multiline
              numberOfLines={2}
              onChangeText={setReason}
              value={reason}
            />
            {error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {error}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>Cancelar</Button>
            <Button loading={busy} onPress={handleCancel}>
              Anular
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  )
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
  amount: {
    fontWeight: '800'
  },
  dialogContent: {
    gap: 12
  }
})
