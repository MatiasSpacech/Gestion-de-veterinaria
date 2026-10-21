import { useMemo, useState, type FormEvent } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import {
  IconAlertCircle,
  IconCash,
  IconCashRegister,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconShoppingCart,
  IconTrash,
  IconTruckDelivery
} from '@tabler/icons-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  PaymentMethod,
  ProductRecord,
  SaleDetail
} from '@shared/types'
import type { CreateSaleInput, ListSalesInput } from '@shared/schemas'
import { api } from '@renderer/lib/api'
import {
  formatCurrency,
  formatDateTime,
  formatQuantity
} from '@renderer/lib/format'
import { useAuth } from '@renderer/lib/use-auth'
import { CancelSaleModal } from './CancelSaleModal'
import { PAYMENT_LABELS, PAYMENT_OPTIONS } from './sales-constants'
import { SaleDetailModal } from './SaleDetailModal'
import { SaleStatusBadge } from './SaleStatusBadge'

interface CartItem {
  product: ProductRecord
  quantity: number
}

export function SalesPage(): React.JSX.Element {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState<string | null>('pos')

  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 250)
  const [cart, setCart] = useState<CartItem[]>([])
  const [clientId, setClientId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>('efectivo')
  const [discount, setDiscount] = useState<number | string>('')
  const [notes, setNotes] = useState('')

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [saleToCancel, setSaleToCancel] = useState<SaleDetail | null>(null)

  const [historySearch, setHistorySearch] = useState('')
  const [debouncedHistorySearch] = useDebouncedValue(historySearch, 250)
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const productsQuery = useQuery({
    queryKey: ['inventory', 'products', { posSearch: debouncedSearch }],
    queryFn: () =>
      api.inventory.listProducts({
        search: debouncedSearch,
        categoryId: null,
        includeInactive: false,
        stockFilter: 'all'
      }),
    enabled: hasPermission('ventas')
  })

  const clientsQuery = useQuery({
    queryKey: ['clients', 'pos'],
    queryFn: () => api.clients.list({ search: '', includeInactive: false }),
    enabled: hasPermission('ventas') && hasPermission('clientes')
  })

  const summaryQuery = useQuery({
    queryKey: ['sales', 'summary'],
    queryFn: api.sales.summary,
    enabled: hasPermission('ventas')
  })

  const salesQuery = useQuery({
    queryKey: [
      'sales',
      'list',
      {
        search: debouncedHistorySearch,
        status: statusFilter,
        dateFrom,
        dateTo
      }
    ],
    queryFn: () =>
      api.sales.list({
        search: debouncedHistorySearch,
        status: (statusFilter ?? 'all') as ListSalesInput['status'],
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        limit: 200
      }),
    enabled: hasPermission('ventas') && tab === 'historial'
  })

  const saleMutation = useMutation({
    mutationFn: (input: CreateSaleInput) => api.sales.create(input),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] })
      ])
      notifications.show({
        color: 'vetGreen',
        title: 'Venta registrada',
        message: `${sale.number} · ${formatCurrency(sale.totalCents)}`
      })
      setCart([])
      setClientId(null)
      setPaymentMethod('efectivo')
      setDiscount('')
      setNotes('')
      setSelectedSaleId(sale.id)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        title: 'No se pudo registrar la venta',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    }
  })

  const clients = clientsQuery.data ?? []
  const sales = salesQuery.data ?? []
  const summary = summaryQuery.data
  const availableProducts = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.stock > 0),
    [productsQuery.data]
  )
  const cartSubtotal = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Math.round(item.product.priceCents * item.quantity),
        0
      ),
    [cart]
  )
  const discountCents = Math.min(
    Math.max(Math.round(Number(discount) || 0), 0),
    cartSubtotal
  )
  const saleTotal = cartSubtotal - discountCents
  const cartUnits = cart.reduce((total, item) => total + item.quantity, 0)
  const clientOptions = clients.map((client) => ({
    value: String(client.id),
    label: client.phone ? `${client.name} · ${client.phone}` : client.name
  }))

  if (!hasPermission('ventas')) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={20} />} title="Sin acceso">
        No tenés permisos para acceder al módulo de ventas.
      </Alert>
    )
  }

  const addProduct = (product: ProductRecord): void => {
    const current = cart.find((item) => item.product.id === product.id)
    const quantity = current?.quantity ?? 0

    if (quantity + 1 > product.stock) {
      notifications.show({
        color: 'orange',
        title: 'Stock insuficiente',
        message: `Solo hay ${formatQuantity(product.stock, product.unit)} de ${product.name}.`
      })
      return
    }

    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id)

      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...items, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: number, value: number | string): void => {
    if (value === '') {
      return
    }

    const numeric = Number(value)

    if (!Number.isFinite(numeric)) {
      return
    }

    setCart((items) =>
      items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: Math.min(
                Math.max(numeric, 0.01),
                item.product.stock
              )
            }
          : item
      )
    )
  }

  const removeItem = (productId: number): void => {
    setCart((items) => items.filter((item) => item.product.id !== productId))
  }

  const resetCart = (): void => {
    setCart([])
    setClientId(null)
    setPaymentMethod('efectivo')
    setDiscount('')
    setNotes('')
  }

  const handleCheckout = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    if (cart.length === 0) {
      notifications.show({
        color: 'orange',
        title: 'Carrito vacío',
        message: 'Agregá al menos un producto para registrar la venta.'
      })
      return
    }

    if (discountCents > cartSubtotal) {
      notifications.show({
        color: 'red',
        title: 'Descuento inválido',
        message: 'El descuento no puede superar el subtotal.'
      })
      return
    }

    saleMutation.mutate({
      clientId: clientId ? Number(clientId) : null,
      petId: null,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        discountCents: 0
      })),
      discountCents,
      paymentMethod: paymentMethod as PaymentMethod,
      notes
    })
  }

  const clearHistoryFilters = (): void => {
    setHistorySearch('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const handleRequestCancel = (sale: SaleDetail): void => {
    setSelectedSaleId(null)
    setSaleToCancel(sale)
  }

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <Title order={2}>Ventas</Title>
            <Text c="dimmed" mt={4}>
              Punto de venta, cobros y historial de operaciones.
            </Text>
          </div>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card padding="lg">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Ventas de hoy
                </Text>
                <Text fz={26} fw={800} mt={6}>
                  {summaryQuery.isPending ? '—' : (summary?.todayCount ?? 0)}
                </Text>
              </div>
              <ThemeIcon variant="light" color="vetGreen" size={40} radius="lg">
                <IconCashRegister size={21} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card padding="lg">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Facturado hoy
                </Text>
                <Text fz={26} fw={800} mt={6}>
                  {summary ? formatCurrency(summary.todayTotalCents) : '—'}
                </Text>
              </div>
              <ThemeIcon variant="light" color="blue" size={40} radius="lg">
                <IconCash size={21} />
              </ThemeIcon>
            </Group>
          </Card>
          <Card padding="lg">
            <Group justify="space-between">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  Ticket promedio
                </Text>
                <Text fz={26} fw={800} mt={6}>
                  {summary ? formatCurrency(summary.todayAverageCents) : '—'}
                </Text>
              </div>
              <ThemeIcon variant="light" color="violet" size={40} radius="lg">
                <IconReceipt size={21} />
              </ThemeIcon>
            </Group>
          </Card>
        </SimpleGrid>

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="pos" leftSection={<IconShoppingCart size={16} />}>
              Punto de venta
            </Tabs.Tab>
            <Tabs.Tab value="historial" leftSection={<IconReceipt size={16} />}>
              Historial
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pos" pt="lg">
            <Grid gap="lg">
              <Grid.Col span={{ base: 12, lg: 7 }}>
                <Card padding="lg">
                  <Stack gap="md">
                    <TextInput
                      placeholder="Buscar producto por nombre, SKU o código"
                      leftSection={<IconSearch size={17} />}
                      value={search}
                      onChange={(event) => setSearch(event.currentTarget.value)}
                    />

                    {productsQuery.isError ? (
                      <Alert color="red" icon={<IconAlertCircle size={18} />}>
                        No se pudieron cargar los productos.
                      </Alert>
                    ) : productsQuery.isPending ? (
                      <Center py={60}>
                        <Loader color="vetGreen" />
                      </Center>
                    ) : availableProducts.length === 0 ? (
                      <Center py={60}>
                        <Stack align="center" gap="xs">
                          <IconTruckDelivery
                            size={34}
                            color="var(--mantine-color-gray-5)"
                          />
                          <Text fw={600}>No hay productos disponibles</Text>
                          <Text size="sm" c="dimmed" ta="center">
                            {search
                              ? 'Probá con otra búsqueda.'
                              : 'Cargá stock desde Inventario para empezar a vender.'}
                          </Text>
                        </Stack>
                      </Center>
                    ) : (
                      <ScrollArea.Autosize mah={560}>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                          {availableProducts.map((product) => {
                            const inCart =
                              cart.find((item) => item.product.id === product.id)
                                ?.quantity ?? 0

                            return (
                              <Card key={product.id} padding="md" withBorder>
                                <Stack gap="xs" h="100%" justify="space-between">
                                  <div>
                                    <Text size="sm" fw={700} lineClamp={2}>
                                      {product.name}
                                    </Text>
                                    <Text size="xs" c="dimmed" mt={3}>
                                      {product.sku ?? product.barcode ?? 'Sin código'}
                                    </Text>
                                  </div>
                                  <Group justify="space-between" align="flex-end">
                                    <div>
                                      <Text fw={800}>
                                        {formatCurrency(product.priceCents)}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        Stock: {formatQuantity(product.stock, product.unit)}
                                      </Text>
                                    </div>
                                    <Button
                                      size="compact-sm"
                                      variant="light"
                                      leftSection={<IconPlus size={15} />}
                                      onClick={() => addProduct(product)}
                                      disabled={inCart >= product.stock}
                                    >
                                      Agregar
                                    </Button>
                                  </Group>
                                </Stack>
                              </Card>
                            )
                          })}
                        </SimpleGrid>
                      </ScrollArea.Autosize>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>

              <Grid.Col span={{ base: 12, lg: 5 }}>
                <Card padding="lg">
                  <form onSubmit={handleCheckout}>
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconShoppingCart size={18} />
                          <Title order={4}>Carrito</Title>
                          <Badge variant="light" color="vetGreen" radius="sm">
                            {formatQuantity(cartUnits)} u.
                          </Badge>
                        </Group>
                        <Button
                          variant="subtle"
                          color="gray"
                          size="compact-sm"
                          leftSection={<IconTrash size={15} />}
                          onClick={resetCart}
                          disabled={cart.length === 0}
                        >
                          Limpiar
                        </Button>
                      </Group>

                      {cart.length === 0 ? (
                        <Center py={36}>
                          <Stack align="center" gap={6}>
                            <IconShoppingCart
                              size={32}
                              color="var(--mantine-color-gray-5)"
                            />
                            <Text size="sm" c="dimmed">
                              Agregá productos para comenzar.
                            </Text>
                          </Stack>
                        </Center>
                      ) : (
                        <ScrollArea.Autosize mah={270}>
                          <Stack gap="sm">
                            {cart.map((item) => (
                              <div key={item.product.id}>
                                <Group justify="space-between" align="flex-start">
                                  <div style={{ minWidth: 0 }}>
                                    <Text size="sm" fw={600} lineClamp={2}>
                                      {item.product.name}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {formatCurrency(item.product.priceCents)} ·{' '}
                                      {formatQuantity(item.product.stock, item.product.unit)}{' '}
                                      disponibles
                                    </Text>
                                  </div>
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    aria-label={`Quitar ${item.product.name}`}
                                    onClick={() => removeItem(item.product.id)}
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Group>
                                <Group justify="space-between" mt={6}>
                                  <NumberInput
                                    size="xs"
                                    w={110}
                                    min={0.01}
                                    max={item.product.stock}
                                    decimalScale={2}
                                    step={1}
                                    value={item.quantity}
                                    onChange={(value) =>
                                      updateQuantity(item.product.id, value)
                                    }
                                    aria-label={`Cantidad de ${item.product.name}`}
                                  />
                                  <Text size="sm" fw={700}>
                                    {formatCurrency(
                                      Math.round(
                                        item.product.priceCents * item.quantity
                                      )
                                    )}
                                  </Text>
                                </Group>
                              </div>
                            ))}
                          </Stack>
                        </ScrollArea.Autosize>
                      )}

                      <Divider />

                      <Select
                        label="Cliente"
                        placeholder="Consumidor final"
                        data={clientOptions}
                        searchable
                        clearable
                        value={clientId}
                        onChange={setClientId}
                        disabled={!hasPermission('clientes')}
                      />
                      <Select
                        label="Método de pago"
                        data={PAYMENT_OPTIONS}
                        value={paymentMethod}
                        onChange={(value) => setPaymentMethod(value ?? 'efectivo')}
                        allowDeselect={false}
                      />
                      <NumberInput
                        label="Descuento"
                        placeholder="0,00"
                        min={0}
                        max={cartSubtotal / 100}
                        decimalScale={2}
                        fixedDecimalScale
                        value={discount}
                        onChange={setDiscount}
                      />
                      <Textarea
                        label="Notas"
                        placeholder="Observaciones de la venta"
                        minRows={2}
                        autosize
                        value={notes}
                        onChange={(event) => setNotes(event.currentTarget.value)}
                      />

                      <Divider />

                      <Stack gap={6}>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Subtotal
                          </Text>
                          <Text size="sm">{formatCurrency(cartSubtotal)}</Text>
                        </Group>
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">
                            Descuento
                          </Text>
                          <Text size="sm" c={discountCents > 0 ? 'orange.8' : undefined}>
                            {discountCents > 0
                              ? `- ${formatCurrency(discountCents)}`
                              : '—'}
                          </Text>
                        </Group>
                        <Group justify="space-between">
                          <Text fw={700}>Total</Text>
                          <Text fw={800} size="xl">
                            {formatCurrency(saleTotal)}
                          </Text>
                        </Group>
                      </Stack>

                      <Button
                        type="submit"
                        size="md"
                        fullWidth
                        leftSection={<IconCash size={18} />}
                        loading={saleMutation.isPending}
                        disabled={cart.length === 0}
                      >
                        Registrar venta
                      </Button>
                    </Stack>
                  </form>
                </Card>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="historial" pt="lg">
            <Card padding="lg" mb="md">
              <Group align="flex-end" wrap="wrap" gap="sm">
                <TextInput
                  label="Buscar"
                  placeholder="Número, cliente o producto"
                  leftSection={<IconSearch size={16} />}
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.currentTarget.value)}
                  w={{ base: '100%', sm: 280 }}
                />
                <Select
                  label="Estado"
                  data={[
                    { value: 'all', label: 'Todas' },
                    { value: 'completada', label: 'Completadas' },
                    { value: 'anulada', label: 'Anuladas' }
                  ]}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowDeselect={false}
                  w={160}
                />
                <TextInput
                  label="Desde"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.currentTarget.value)}
                />
                <TextInput
                  label="Hasta"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.currentTarget.value)}
                />
                <Button variant="default" onClick={clearHistoryFilters}>
                  Limpiar filtros
                </Button>
              </Group>
            </Card>

            {salesQuery.isPending ? (
              <Center py={80}>
                <Loader color="vetGreen" />
              </Center>
            ) : sales.length === 0 ? (
              <Card>
                <Center py={60}>
                  <Stack align="center" gap="sm">
                    <IconReceipt
                      size={36}
                      color="var(--mantine-color-gray-5)"
                    />
                    <Text fw={600}>No hay ventas para mostrar</Text>
                    <Text size="sm" c="dimmed">
                      Registrá una venta o cambiá los filtros de búsqueda.
                    </Text>
                  </Stack>
                </Center>
              </Card>
            ) : (
              <Card padding={0}>
                <Table.ScrollContainer minWidth={900}>
                  <Table highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Venta</Table.Th>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Ítems</Table.Th>
                        <Table.Th>Pago</Table.Th>
                        <Table.Th>Total</Table.Th>
                        <Table.Th>Estado</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sales.map((sale) => (
                        <Table.Tr
                          key={sale.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSaleId(sale.id)}
                        >
                          <Table.Td>
                            <Text size="sm" fw={700}>
                              {sale.number}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {formatDateTime(sale.createdAt)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{sale.clientName ?? 'Consumidor final'}</Text>
                            {sale.petName ? (
                              <Text size="xs" c="dimmed">
                                {sale.petName}
                              </Text>
                            ) : null}
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{sale.itemCount}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" color="gray" radius="sm">
                              {PAYMENT_LABELS[sale.paymentMethod]}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={700}>
                              {formatCurrency(sale.totalCents)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <SaleStatusBadge status={sale.status} />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <SaleDetailModal
        saleId={selectedSaleId}
        onClose={() => setSelectedSaleId(null)}
        onRequestCancel={isAdmin ? handleRequestCancel : undefined}
      />

      {saleToCancel ? (
        <CancelSaleModal
          sale={saleToCancel}
          onClose={() => {
            setSaleToCancel(null)
            void queryClient.invalidateQueries({ queryKey: ['sales'] })
          }}
        />
      ) : null}
    </>
  )
}
