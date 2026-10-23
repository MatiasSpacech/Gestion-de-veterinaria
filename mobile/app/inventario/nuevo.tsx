import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Chip, Text, TextInput, useTheme } from 'react-native-paper'
import { AppError } from '@shared/errors'
import type { ProductCategory } from '@shared/types'

import { AppButton } from '../../src/components/AppButton'
import { AppTextInput } from '../../src/components/AppTextInput'
import { BarcodeScannerModal } from '../../src/components/BarcodeScannerModal'
import { Screen } from '../../src/components/Screen'
import { SectionCard } from '../../src/components/SectionCard'
import { toAppError } from '../../src/data/controllers/validation'
import {
  createProduct,
  listProductCategories
} from '../../src/features/inventory/inventory-service'

function parseAmount(
  value: string,
  label: string,
  required: boolean
): number {
  const trimmed = value.trim()

  if (trimmed === '') {
    if (required) {
      throw new AppError('VALIDATION_ERROR', `Ingresá el ${label}`)
    }

    return 0
  }

  const parsed = Number(trimmed.replace(',', '.'))

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError('VALIDATION_ERROR', `Ingresá un ${label} válido`)
  }

  return parsed
}

export default function NewProductScreen() {
  const router = useRouter()
  const theme = useTheme()

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [unit, setUnit] = useState('unidad')
  const [cost, setCost] = useState('')
  const [price, setPrice] = useState('')
  const [minStock, setMinStock] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [scannerVisible, setScannerVisible] = useState(false)

  useEffect(() => {
    try {
      setCategories(listProductCategories())
    } catch (caught) {
      setError(toAppError(caught).message)
    }
  }, [])

  const handleSubmit = () => {
    setError(null)

    try {
      const parsedCost = parseAmount(cost, 'costo', false)
      const parsedPrice = parseAmount(price, 'precio de venta', true)
      const parsedMinStock = parseAmount(minStock, 'stock mínimo', false)

      setBusy(true)

      createProduct({
        name,
        categoryId,
        sku: sku.trim() === '' ? null : sku,
        barcode: barcode.trim() === '' ? null : barcode,
        unit: unit.trim() === '' ? 'unidad' : unit,
        costCents: Math.round(parsedCost * 100),
        priceCents: Math.round(parsedPrice * 100),
        minStock: parsedMinStock,
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
      title="Nuevo producto"
      subtitle="El stock inicial se carga después desde Inventario."
    >
      <SectionCard title="Datos del producto">
        <AppTextInput
          label="Nombre"
          onChangeText={setName}
          placeholder="Ej. Alimento balanceado 10 kg"
          value={name}
        />

        <View style={styles.group}>
          <Text variant="labelLarge">Categoría</Text>
          <View style={styles.chips}>
            <Chip
              selected={categoryId === null}
              onPress={() => setCategoryId(null)}
            >
              Sin categoría
            </Chip>
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </View>
        </View>

        <AppTextInput
          autoCapitalize="characters"
          label="SKU"
          onChangeText={setSku}
          placeholder="Opcional"
          value={sku}
        />
        <AppTextInput
          label="Código de barras"
          onChangeText={setBarcode}
          placeholder="Opcional"
          right={
            <TextInput.Icon
              accessibilityLabel="Escanear código de barras"
              forceTextInputFocus={false}
              icon="barcode-scan"
              onPress={() => setScannerVisible(true)}
            />
          }
          value={barcode}
        />
      </SectionCard>

      <SectionCard title="Precios y stock">
        <View style={styles.row}>
          <AppTextInput
            keyboardType="decimal-pad"
            label="Costo"
            onChangeText={setCost}
            placeholder="0,00"
            style={styles.flex}
            value={cost}
          />
          <AppTextInput
            keyboardType="decimal-pad"
            label="Precio de venta"
            onChangeText={setPrice}
            placeholder="0,00"
            style={styles.flex}
            value={price}
          />
        </View>
        <View style={styles.row}>
          <AppTextInput
            keyboardType="decimal-pad"
            label="Stock mínimo"
            onChangeText={setMinStock}
            placeholder="0"
            style={styles.flex}
            value={minStock}
          />
          <AppTextInput
            autoCapitalize="none"
            label="Unidad"
            onChangeText={setUnit}
            placeholder="unidad"
            style={styles.flex}
            value={unit}
          />
        </View>
      </SectionCard>

      <SectionCard title="Notas">
        <AppTextInput
          label="Observaciones"
          multiline
          numberOfLines={3}
          onChangeText={setNotes}
          placeholder="Opcional"
          value={notes}
        />
      </SectionCard>

      {error ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {error}
        </Text>
      ) : null}

      <AppButton disabled={busy} loading={busy} onPress={handleSubmit}>
        Crear producto
      </AppButton>

      <BarcodeScannerModal
        onClose={() => setScannerVisible(false)}
        onScanned={setBarcode}
        visible={scannerVisible}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  flex: {
    flex: 1
  },
  group: {
    gap: 8
  },
  row: {
    flexDirection: 'row',
    gap: 12
  }
})
