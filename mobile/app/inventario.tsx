import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import {
  Button,
  Chip,
  Dialog,
  IconButton,
  Portal,
  Text,
  useTheme
} from 'react-native-paper'
import { formatCurrency } from '@renderer/lib/format'
import { AppError } from '@shared/errors'

import { AppButton } from '../src/components/AppButton'
import { AppTextInput } from '../src/components/AppTextInput'
import { BarcodeScannerModal } from '../src/components/BarcodeScannerModal'
import { EmptyState } from '../src/components/EmptyState'
import { Screen } from '../src/components/Screen'
import { SectionCard } from '../src/components/SectionCard'
import { toAppError } from '../src/data/controllers/validation'
import {
  getInventoryOverview,
  listInventory,
  registerStockEntry
} from '../src/features/inventory/inventory-service'
import type { ProductRecord } from '@shared/types'

type StockFilter = 'all' | 'low' | 'out'

export default function InventoryScreen() {
  const router = useRouter()
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0
  })
  const [selected, setSelected] = useState<ProductRecord | null>(null)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setProducts(listInventory({ search, stockFilter: filter }))
    const overview = getInventoryOverview()

    setSummary({
      totalProducts: overview.totalProducts,
      lowStock: overview.lowStock,
      outOfStock: overview.outOfStock
    })
  }, [search, filter])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const openEntry = (product: ProductRecord) => {
    setSelected(product)
    setQuantity('')
    setCost('')
    setError(null)
  }

  const handleEntry = () => {
    if (!selected) {
      return
    }

    setError(null)

    try {
      const parsedQuantity = Number(quantity)
      const parsedCost = cost.trim() === '' ? 0 : Number(cost)

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new AppError('VALIDATION_ERROR', 'La cantidad debe ser mayor a cero')
      }

      if (!Number.isFinite(parsedCost) || parsedCost < 0) {
        throw new AppError('VALIDATION_ERROR', 'El costo no es válido')
      }

      setBusy(true)

      registerStockEntry({
        productId: selected.id,
        quantity: parsedQuantity,
        costCents: Math.round(parsedCost * 100),
        batchCode: null,
        expiryDate: null,
        reason: null
      })

      setSelected(null)
      load()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  const grouped = useMemo(() => products, [products])

  return (
    <Screen title="Inventario" subtitle="Productos, stock y alertas del local.">
      <SectionCard
        title="Resumen"
        subtitle={`${summary.totalProducts} productos cargados`}
      >
        <View style={styles.chips}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          >
            Todos
          </Chip>
          <Chip selected={filter === 'low'} onPress={() => setFilter('low')}>
            Stock bajo ({summary.lowStock})
          </Chip>
          <Chip selected={filter === 'out'} onPress={() => setFilter('out')}>
            Sin stock ({summary.outOfStock})
          </Chip>
        </View>

        <View style={styles.searchBar}>
          <AppTextInput
            dense
            label="Buscar producto"
            onChangeText={setSearch}
            placeholder="Nombre, SKU o código de barras"
            style={styles.searchInput}
            value={search}
          />
          <IconButton
            accessibilityLabel="Escanear código de barras"
            icon="barcode-scan"
            mode="contained"
            onPress={() => setScannerVisible(true)}
            size={24}
          />
        </View>

        <AppButton
          icon="plus"
          mode="contained-tonal"
          onPress={() => router.push('/inventario/nuevo')}
        >
          Nuevo producto
        </AppButton>
      </SectionCard>

      {grouped.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Sin productos"
          description="No hay productos que coincidan con la búsqueda."
        />
      ) : (
        <SectionCard title="Productos" subtitle={`${grouped.length} resultados`}>
          <View style={styles.list}>
            {grouped.map((product) => (
              <View key={product.id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="titleSmall" style={styles.title}>
                    {product.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {product.sku ?? 'Sin SKU'} · {formatCurrency(product.priceCents)}
                  </Text>
                </View>
                <View style={styles.stockBox}>
                  <Text
                    variant="titleSmall"
                    style={{
                      color: product.outOfStock
                        ? theme.colors.error
                        : product.lowStock
                          ? theme.colors.tertiary
                          : theme.colors.onSurface
                    }}
                  >
                    {product.stock} {product.unit}
                  </Text>
                  <Button compact onPress={() => openEntry(product)}>
                    Cargar
                  </Button>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>
      )}

      <BarcodeScannerModal
        onClose={() => setScannerVisible(false)}
        onScanned={setSearch}
        visible={scannerVisible}
      />

      <Portal>
        <Dialog visible={selected !== null} onDismiss={() => setSelected(null)}>
          <Dialog.Title>Cargar stock</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium" style={styles.title}>
              {selected?.name}
            </Text>
            <AppTextInput
              keyboardType="numeric"
              label="Cantidad"
              onChangeText={setQuantity}
              value={quantity}
            />
            <AppTextInput
              keyboardType="numeric"
              label="Costo unitario"
              onChangeText={setCost}
              value={cost}
            />
            {error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {error}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>Cancelar</Button>
            <Button loading={busy} onPress={handleEntry}>
              Confirmar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  searchBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  searchInput: {
    flex: 1
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  list: {
    gap: 12
  },
  row: {
    alignItems: 'center',
    borderTopColor: 'rgba(0,0,0,0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  stockBox: {
    alignItems: 'flex-end',
    gap: 4
  },
  title: {
    fontWeight: '700'
  },
  dialogContent: {
    gap: 12
  }
})
