import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
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
import type {
  ClientRecord,
  PaymentMethod,
  PetRecord,
  ProductRecord
} from '@shared/types'

import { AppButton } from '../../src/components/AppButton'
import { AppTextInput } from '../../src/components/AppTextInput'
import { BarcodeScannerModal } from '../../src/components/BarcodeScannerModal'
import { EmptyState } from '../../src/components/EmptyState'
import { Screen } from '../../src/components/Screen'
import { toAppError } from '../../src/data/controllers/validation'
import {
  listClientPets,
  listClientsDirectory
} from '../../src/features/clients/clients-service'
import {
  findProductByCode,
  listInventory
} from '../../src/features/inventory/inventory-service'
import { registerSale } from '../../src/features/sales/sales-service'
import { TOUCH_TARGET } from '../../src/theme/tokens'

interface CartItem {
  product: ProductRecord
  quantity: number
}

const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' }
]

export default function SellScreen() {
  const router = useRouter()
  const theme = useTheme()
  const { clientId } = useLocalSearchParams<{ clientId?: string }>()

  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [discount, setDiscount] = useState('')
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [scannerVisible, setScannerVisible] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [client, setClient] = useState<ClientRecord | null>(null)
  const [pet, setPet] = useState<PetRecord | null>(null)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [pickerStep, setPickerStep] = useState<'client' | 'pet'>('client')
  const [pickerClient, setPickerClient] = useState<ClientRecord | null>(null)
  const [pickerPets, setPickerPets] = useState<PetRecord[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<ClientRecord[]>([])

  const load = useCallback(() => {
    setProducts(listInventory({ search }))
  }, [search])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setClientResults(listClientsDirectory({ search: clientSearch }))
  }, [clientSearch])

  useEffect(() => {
    const wanted = Number(clientId)

    if (!Number.isFinite(wanted) || wanted <= 0) {
      return
    }

    const found =
      listClientsDirectory({ search: '' }).find((record) => record.id === wanted) ??
      null

    if (found) {
      setClient(found)
      setPet(null)
    }
  }, [clientId])

  const openClientPicker = () => {
    setPickerVisible(true)
    setPickerStep('client')
    setPickerClient(null)
    setPickerPets([])
    setClientSearch('')
    setError(null)
  }

  const selectPickerClient = (record: ClientRecord) => {
    const pets = listClientPets(record.id)

    if (pets.length === 0) {
      setClient(record)
      setPet(null)
      setPickerVisible(false)
      return
    }

    setPickerClient(record)
    setPickerPets(pets)
    setPickerStep('pet')
  }

  const confirmPickerPet = (selectedPet: PetRecord | null) => {
    if (!pickerClient) {
      return
    }

    setClient(pickerClient)
    setPet(selectedPet)
    setPickerVisible(false)
  }

  const clearClient = () => {
    setClient(null)
    setPet(null)
  }

  const addToCart = (product: ProductRecord) => {
    setMessage(null)

    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...current, { product, quantity: 1 }]
    })
  }

  const handleBarcode = (code: string) => {
    const product = findProductByCode(code)

    if (!product) {
      setScanError(`No hay un producto con el código ${code}`)
      return
    }

    setScanError(null)
    setSearch('')
    addToCart(product)
    setMessage(`${product.name} agregado al carrito`)
  }

  const changeQuantity = (productId: number, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const subtotalCents = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + item.product.priceCents * item.quantity,
        0
      ),
    [cart]
  )

  const discountCents = useMemo(() => {
    const parsed = Number(discount)

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0
    }

    return Math.min(Math.round(parsed * 100), subtotalCents)
  }, [discount, subtotalCents])

  const totalCents = subtotalCents - discountCents

  const handleCheckout = () => {
    setError(null)
    setBusy(true)

    try {
      const sale = registerSale({
        clientId: client?.id ?? null,
        petId: pet?.id ?? null,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discountCents: 0
        })),
        discountCents,
        paymentMethod,
        notes: null
      })

      setCart([])
      setDiscount('')
      setCheckoutVisible(false)
      clearClient()
      setMessage(`Venta ${sale.number} registrada por ${formatCurrency(sale.totalCents)}`)
      load()
    } catch (caught) {
      setError(toAppError(caught).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title="Vender" subtitle="Punto de venta táctil con cálculo de vuelto.">
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

      <View style={styles.clientBar}>
        <Button
          icon="account-outline"
          mode="outlined"
          onPress={openClientPicker}
          style={styles.clientButton}
        >
          {client
            ? `${client.name}${pet ? ` · ${pet.name}` : ''}`
            : 'Consumidor final'}
        </Button>
        {client ? (
          <Button compact onPress={clearClient}>
            Quitar
          </Button>
        ) : null}
      </View>

      {message ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
          {message}
        </Text>
      ) : null}

      {scanError ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {scanError}
        </Text>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Sin productos"
          description="Buscá por nombre o cargá stock desde Inventario."
        />
      ) : (
        <View style={styles.products}>
          {products.slice(0, 30).map((product) => (
            <Button
              key={product.id}
              mode="outlined"
              onPress={() => addToCart(product)}
              style={styles.productButton}
            >
              {`${product.name} · ${formatCurrency(product.priceCents)}`}
            </Button>
          ))}
        </View>
      )}

      <View style={styles.cartBar}>
        <View style={styles.cartHeader}>
          <Text variant="titleMedium" style={styles.cartTitle}>
            Carrito ({cart.length})
          </Text>
          <Text variant="titleMedium" style={styles.cartTotal}>
            {formatCurrency(totalCents)}
          </Text>
        </View>

        <ScrollView style={styles.cartList} nestedScrollEnabled>
          {cart.length === 0 ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Tocá un producto para agregarlo al carrito.
            </Text>
          ) : (
            cart.map((item) => (
              <View key={item.product.id} style={styles.cartRow}>
                <Text variant="bodyMedium" style={styles.cartName}>
                  {item.product.name}
                </Text>
                <View style={styles.quantityBox}>
                  <Button compact onPress={() => changeQuantity(item.product.id, -1)}>
                    -
                  </Button>
                  <Text variant="titleSmall">{item.quantity}</Text>
                  <Button compact onPress={() => changeQuantity(item.product.id, 1)}>
                    +
                  </Button>
                </View>
                <Text variant="titleSmall" style={styles.cartName}>
                  {formatCurrency(item.product.priceCents * item.quantity)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>

        <AppButton
          disabled={cart.length === 0}
          icon="cart-check"
          onPress={() => setCheckoutVisible(true)}
        >
          Cobrar {formatCurrency(totalCents)}
        </AppButton>

        <Button
          compact
          icon="receipt-outline"
          onPress={() => router.push('/ventas')}
        >
          Historial de ventas
        </Button>
      </View>

      <BarcodeScannerModal
        onClose={() => setScannerVisible(false)}
        onScanned={handleBarcode}
        visible={scannerVisible}
      />

      <Portal>
        <Dialog
          visible={pickerVisible}
          onDismiss={() => setPickerVisible(false)}
        >
          <Dialog.Title>
            {pickerStep === 'client'
              ? 'Asociar cliente'
              : `Mascota de ${pickerClient?.name ?? ''}`}
          </Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            {pickerStep === 'client' ? (
              <>
                <AppTextInput
                  dense
                  label="Buscar cliente"
                  onChangeText={setClientSearch}
                  placeholder="Nombre o teléfono"
                  value={clientSearch}
                />
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {clientResults.length === 0 ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      Sin clientes que coincidan.
                    </Text>
                  ) : (
                    clientResults.slice(0, 12).map((record) => (
                      <Button
                        key={record.id}
                        mode="text"
                        onPress={() => selectPickerClient(record)}
                        style={styles.pickerRow}
                      >
                        {record.phone
                          ? `${record.name} · ${record.phone}`
                          : record.name}
                      </Button>
                    ))
                  )}
                </ScrollView>
              </>
            ) : (
              <View style={styles.chips}>
                <Chip onPress={() => confirmPickerPet(null)}>Sin mascota</Chip>
                {pickerPets.map((record) => (
                  <Chip
                    key={record.id}
                    onPress={() => confirmPickerPet(record)}
                  >
                    {record.name}
                  </Chip>
                ))}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            {pickerStep === 'pet' ? (
              <Button onPress={() => setPickerStep('client')}>Volver</Button>
            ) : null}
            <Button onPress={() => setPickerVisible(false)}>Cancelar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={checkoutVisible}
          onDismiss={() => setCheckoutVisible(false)}
        >
          <Dialog.Title>Cobrar</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="titleMedium" style={styles.cartTitle}>
              Total {formatCurrency(totalCents)}
            </Text>

            {client ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {`Cliente: ${client.name}${pet ? ` · ${pet.name}` : ''}`}
              </Text>
            ) : null}

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

            <AppTextInput
              keyboardType="numeric"
              label="Descuento en pesos"
              onChangeText={setDiscount}
              value={discount}
            />

            {error ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {error}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCheckoutVisible(false)}>Cancelar</Button>
            <Button loading={busy} onPress={handleCheckout}>
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
  products: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  productButton: {
    minHeight: TOUCH_TARGET
  },
  clientBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  clientButton: {
    flex: 1,
    minHeight: TOUCH_TARGET
  },
  pickerList: {
    maxHeight: 260
  },
  pickerRow: {
    minHeight: TOUCH_TARGET
  },
  cartBar: {
    backgroundColor: 'transparent',
    gap: 10,
    paddingBottom: 8
  },
  cartHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  cartTitle: {
    fontWeight: '800'
  },
  cartTotal: {
    fontWeight: '800'
  },
  cartList: {
    gap: 8,
    maxHeight: 220
  },
  cartRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  cartName: {
    flex: 1
  },
  quantityBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dialogContent: {
    gap: 12
  }
})
