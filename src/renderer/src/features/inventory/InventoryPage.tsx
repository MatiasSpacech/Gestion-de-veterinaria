import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Menu,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  type MantineColor
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useModals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconAlertTriangle,
  IconBoxSeam,
  IconCalendarEvent,
  IconCash,
  IconCategory,
  IconDotsVertical,
  IconEdit,
  IconFileSpreadsheet,
  IconHistory,
  IconPackage,
  IconPlus,
  IconPower,
  IconSearch,
  IconTruckDelivery,
  type TablerIcon
} from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ProductRecord } from '@shared/types'
import { api } from '@renderer/lib/api'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDueIn,
  formatQuantity
} from '@renderer/lib/format'
import { useAuth } from '@renderer/lib/use-auth'
import { CategoriesModal } from './CategoriesModal'
import { STOCK_FILTER_OPTIONS } from './inventory-constants'
import { MovementBadge } from './MovementBadge'
import { ProductFormModal } from './ProductFormModal'
import { ProductHistoryModal } from './ProductHistoryModal'
import { StockAdjustmentModal } from './StockAdjustmentModal'
import { StockEntryModal } from './StockEntryModal'

interface StatCardProps {
  label: string
  value: string | number
  hint: string
  icon: TablerIcon
  color: MantineColor
}

function StatCard({ label, value, hint, icon: Icon, color }: StatCardProps): React.JSX.Element {
  return (
    <Card padding="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase">
            {label}
          </Text>
          <Text fz={27} fw={800} lh={1.15} mt={8}>
            {value}
          </Text>
          <Text size="xs" c="dimmed" mt={6}>
            {hint}
          </Text>
        </div>
        <ThemeIcon size={42} radius="lg" variant="light" color={color}>
          <Icon size={22} stroke={1.7} />
        </ThemeIcon>
      </Group>
    </Card>
  )
}

export function InventoryPage(): React.JSX.Element {
  const { hasPermission, user } = useAuth()
  const queryClient = useQueryClient()
  const modals = useModals()
  const [tab, setTab] = useState<string | null>('productos')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>('all')
  const [stockFilter, setStockFilter] = useState<string | null>('all')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [debouncedSearch] = useDebouncedValue(search, 250)
  const isAdmin = user?.role === 'admin'

  const [productModalOpened, setProductModalOpened] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [entryProduct, setEntryProduct] = useState<ProductRecord | null>(null)
  const [adjustmentProduct, setAdjustmentProduct] = useState<ProductRecord | null>(null)
  const [historyProductId, setHistoryProductId] = useState<number | null>(null)
  const [categoriesOpened, setCategoriesOpened] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories', { includeInactive: true }],
    queryFn: () => api.inventory.listCategories({ includeInactive: true }),
    enabled: hasPermission('inventario')
  })

  const productsQuery = useQuery({
    queryKey: [
      'inventory',
      'products',
      {
        search: debouncedSearch,
        categoryId: categoryId === 'all' ? null : Number(categoryId),
        includeInactive,
        stockFilter
      }
    ],
    queryFn: () =>
      api.inventory.listProducts({
        search: debouncedSearch,
        categoryId: categoryId === 'all' ? null : Number(categoryId),
        includeInactive,
        stockFilter: (stockFilter ?? 'all') as 'all' | 'low' | 'out' | 'expiring'
      }),
    enabled: hasPermission('inventario')
  })

  const summaryQuery = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: () => api.inventory.summary(),
    enabled: hasPermission('inventario')
  })

  const expiringQuery = useQuery({
    queryKey: ['inventory', 'expiring'],
    queryFn: () => api.inventory.listExpiring(),
    enabled: hasPermission('inventario') && tab === 'vencimientos'
  })

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', { productId: null, limit: 200 }],
    queryFn: () => api.inventory.listMovements({ productId: null, limit: 200 }),
    enabled: hasPermission('inventario') && tab === 'movimientos'
  })

  if (!hasPermission('inventario')) {
    return (
      <Alert color="red" icon={<IconAlertCircle size={20} />} title="Sin acceso">
        No tenés permisos para acceder al inventario.
      </Alert>
    )
  }

  const products = productsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const expiring = expiringQuery.data ?? []
  const movements = movementsQuery.data ?? []
  const summary = summaryQuery.data

  const categoryOptions = [
    { value: 'all', label: 'Todas las categorías' },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.active ? category.name : `${category.name} (inactiva)`
    }))
  ]

  const openCreate = (): void => {
    setEditingProduct(null)
    setProductModalOpened(true)
  }

  const openEdit = (product: ProductRecord): void => {
    setEditingProduct(product)
    setProductModalOpened(true)
  }

  const invalidateInventory = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['inventory'] })
  }

  const confirmToggle = (product: ProductRecord): void => {
    modals.openConfirmModal({
      title: product.active ? 'Desactivar producto' : 'Reactivar producto',
      centered: true,
      children: (
        <Text size="sm">
          {product.active
            ? `¿Querés desactivar ${product.name}? Su historial de stock se conserva.`
            : `¿Querés reactivar ${product.name}?`}
        </Text>
      ),
      labels: {
        confirm: product.active ? 'Desactivar' : 'Reactivar',
        cancel: 'Cancelar'
      },
      confirmProps: { color: product.active ? 'red' : 'vetGreen' },
      onConfirm: () => {
        void (async () => {
          try {
            await api.inventory.setProductActive({
              id: product.id,
              active: !product.active
            })
            await invalidateInventory()
            notifications.show({
              color: 'vetGreen',
              title: 'Estado actualizado',
              message: product.active
                ? 'El producto quedó inactivo.'
                : 'El producto volvió a estar activo.'
            })
          } catch (error) {
            notifications.show({
              color: 'red',
              title: 'No se pudo actualizar el producto',
              message:
                error instanceof Error ? error.message : 'Intentá nuevamente.'
            })
          }
        })()
      }
    })
  }

  const handleExport = async (): Promise<void> => {
    setExporting(true)

    try {
      const filePath = await api.inventory.exportCsv()

      if (filePath) {
        notifications.show({
          color: 'vetGreen',
          title: 'Inventario exportado',
          message: filePath
        })
      }
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'No se pudo exportar el inventario',
        message: error instanceof Error ? error.message : 'Intentá nuevamente.'
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
          <div>
            <Title order={2}>Inventario</Title>
            <Text c="dimmed" mt={4}>
              Productos, lotes, vencimientos y movimientos de stock.
            </Text>
          </div>
          <Group gap="sm" wrap="wrap">
            <Button
              variant="default"
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={() => void handleExport()}
              loading={exporting}
            >
              Exportar CSV
            </Button>
            <Button
              variant="default"
              leftSection={<IconCategory size={16} />}
              onClick={() => setCategoriesOpened(true)}
            >
              Categorías
            </Button>
            <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
              Nuevo producto
            </Button>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
          <StatCard
            label="Productos activos"
            value={summary?.activeProducts ?? '—'}
            hint={`${summary?.totalProducts ?? 0} productos registrados`}
            icon={IconPackage}
            color="vetGreen"
          />
          <StatCard
            label="Stock bajo"
            value={summary?.lowStock ?? '—'}
            hint={`${summary?.outOfStock ?? 0} sin stock`}
            icon={IconAlertTriangle}
            color="orange"
          />
          <StatCard
            label="Por vencer"
            value={summary?.expiring ?? '—'}
            hint="Dentro del plazo configurado"
            icon={IconCalendarEvent}
            color="red"
          />
          <StatCard
            label="Valor del inventario"
            value={summary ? formatCurrency(summary.inventoryValueCents) : '—'}
            hint="Costo del stock activo"
            icon={IconCash}
            color="blue"
          />
        </SimpleGrid>

        {productsQuery.isError || summaryQuery.isError ? (
          <Alert color="red" icon={<IconAlertCircle size={19} />}>
            No se pudieron cargar los datos del inventario.
          </Alert>
        ) : null}

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="productos" leftSection={<IconPackage size={16} />}>
              Productos
            </Tabs.Tab>
            <Tabs.Tab value="vencimientos" leftSection={<IconCalendarEvent size={16} />}>
              Por vencer
            </Tabs.Tab>
            <Tabs.Tab value="movimientos" leftSection={<IconHistory size={16} />}>
              Movimientos
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="productos" pt="lg">
            <Card padding="lg" mb="md">
              <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                <TextInput
                  placeholder="Buscar por nombre, SKU o código de barras"
                  leftSection={<IconSearch size={17} />}
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  w={{ base: '100%', sm: 340 }}
                />
                <Group gap="sm" wrap="wrap">
                  <Select
                    data={categoryOptions}
                    value={categoryId}
                    onChange={setCategoryId}
                    allowDeselect={false}
                    w={220}
                  />
                  <Select
                    data={STOCK_FILTER_OPTIONS}
                    value={stockFilter}
                    onChange={setStockFilter}
                    allowDeselect={false}
                    w={170}
                  />
                  <Switch
                    label="Mostrar inactivos"
                    checked={includeInactive}
                    onChange={(event) => setIncludeInactive(event.currentTarget.checked)}
                  />
                </Group>
              </Group>
            </Card>

            {productsQuery.isPending ? (
              <Center py={80}>
                <Loader color="vetGreen" />
              </Center>
            ) : products.length === 0 ? (
              <Card>
                <Center py={60}>
                  <Stack align="center" gap="sm" maw={390}>
                    <IconBoxSeam size={38} stroke={1.5} color="var(--mantine-color-gray-5)" />
                    <Text fw={600}>No hay productos para mostrar</Text>
                    <Text size="sm" c="dimmed" ta="center">
                      {search || categoryId !== 'all' || stockFilter !== 'all'
                        ? 'Probá cambiar los filtros de búsqueda.'
                        : 'Creá el primer producto para empezar a controlar el stock.'}
                    </Text>
                    {!search && categoryId === 'all' ? (
                      <Button
                        variant="light"
                        leftSection={<IconPlus size={16} />}
                        onClick={openCreate}
                      >
                        Nuevo producto
                      </Button>
                    ) : null}
                  </Stack>
                </Center>
              </Card>
            ) : (
              <Card padding={0}>
                <Table.ScrollContainer minWidth={980}>
                  <Table highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Categoría</Table.Th>
                        <Table.Th>Stock</Table.Th>
                        <Table.Th>Precio</Table.Th>
                        <Table.Th>Próximo vencimiento</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {products.map((product) => {
                        const expiryDays = product.nextExpiryDate
                          ? dayjs(product.nextExpiryDate).diff(dayjs(), 'day')
                          : null

                        return (
                          <Table.Tr
                            key={product.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setHistoryProductId(product.id)}
                          >
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {product.name}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {product.sku
                                  ? `SKU ${product.sku}`
                                  : product.barcode
                                    ? `Código ${product.barcode}`
                                    : 'Sin código'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{product.categoryName ?? 'Sin categoría'}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {formatQuantity(product.stock, product.unit)}
                              </Text>
                              {product.outOfStock ? (
                                <Badge size="xs" color="red" variant="light" mt={3}>
                                  Sin stock
                                </Badge>
                              ) : product.lowStock ? (
                                <Badge size="xs" color="orange" variant="light" mt={3}>
                                  Stock bajo
                                </Badge>
                              ) : null}
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {formatCurrency(product.priceCents)}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Costo {formatCurrency(product.costCents)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {product.nextExpiryDate && expiryDays !== null ? (
                                <>
                                  <Text
                                    size="sm"
                                    c={
                                      expiryDays < 0
                                        ? 'red'
                                        : expiryDays <= 30
                                          ? 'orange'
                                          : undefined
                                    }
                                  >
                                    {formatDate(product.nextExpiryDate)}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {formatDueIn(expiryDays)}
                                  </Text>
                                </>
                              ) : (
                                <Text size="sm" c="dimmed">
                                  —
                                </Text>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                variant="light"
                                color={product.active ? 'vetGreen' : 'gray'}
                                radius="sm"
                              >
                                {product.active ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </Table.Td>
                            <Table.Td onClick={(event) => event.stopPropagation()}>
                              <Group justify="flex-end">
                                <Menu shadow="md" position="bottom-end">
                                  <Menu.Target>
                                    <ActionIcon
                                      variant="subtle"
                                      color="gray"
                                      aria-label="Acciones"
                                    >
                                      <IconDotsVertical size={18} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item
                                      leftSection={<IconTruckDelivery size={16} />}
                                      onClick={() => setEntryProduct(product)}
                                    >
                                      Registrar entrada
                                    </Menu.Item>
                                    {isAdmin ? (
                                      <Menu.Item
                                        leftSection={<IconAdjustmentsHorizontal size={16} />}
                                        onClick={() => setAdjustmentProduct(product)}
                                      >
                                        Ajustar stock
                                      </Menu.Item>
                                    ) : null}
                                    <Menu.Item
                                      leftSection={<IconHistory size={16} />}
                                      onClick={() => setHistoryProductId(product.id)}
                                    >
                                      Ver lotes y movimientos
                                    </Menu.Item>
                                    <Menu.Item
                                      leftSection={<IconEdit size={16} />}
                                      onClick={() => openEdit(product)}
                                    >
                                      Editar
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                      color={product.active ? 'red' : 'vetGreen'}
                                      leftSection={<IconPower size={16} />}
                                      onClick={() => confirmToggle(product)}
                                    >
                                      {product.active ? 'Desactivar' : 'Reactivar'}
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        )
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="vencimientos" pt="lg">
            {expiringQuery.isPending ? (
              <Center py={70}>
                <Loader color="vetGreen" />
              </Center>
            ) : expiring.length === 0 ? (
              <Card>
                <Center py={55}>
                  <Stack align="center" gap="sm">
                    <IconCalendarEvent
                      size={34}
                      stroke={1.5}
                      color="var(--mantine-color-gray-5)"
                    />
                    <Text fw={600}>Sin vencimientos próximos</Text>
                    <Text size="sm" c="dimmed">
                      No hay lotes con stock dentro del plazo configurado.
                    </Text>
                  </Stack>
                </Center>
              </Card>
            ) : (
              <Card padding={0}>
                <Table.ScrollContainer minWidth={820}>
                  <Table highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Lote</Table.Th>
                        <Table.Th>Vencimiento</Table.Th>
                        <Table.Th>Cantidad</Table.Th>
                        <Table.Th>Costo</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {expiring.map((batch) => (
                        <Table.Tr
                          key={batch.batchId}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setHistoryProductId(batch.productId)}
                        >
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {batch.productName}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {batch.categoryName ?? 'Sin categoría'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{batch.batchCode ?? 'Sin lote'}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size="sm"
                              c={batch.daysUntilExpiry < 0 ? 'red' : 'orange'}
                            >
                              {formatDate(batch.expiryDate)}
                            </Text>
                            <Text
                              size="xs"
                              c={batch.daysUntilExpiry < 0 ? 'red' : 'dimmed'}
                            >
                              {formatDueIn(batch.daysUntilExpiry)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatQuantity(batch.quantity, batch.unit)}
                            </Text>
                          </Table.Td>
                          <Table.Td>{formatCurrency(batch.costCents)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Card>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="movimientos" pt="lg">
            {movementsQuery.isPending ? (
              <Center py={70}>
                <Loader color="vetGreen" />
              </Center>
            ) : movements.length === 0 ? (
              <Card>
                <Center py={55}>
                  <Text size="sm" c="dimmed">
                    Todavía no hay movimientos de stock.
                  </Text>
                </Center>
              </Card>
            ) : (
              <Card padding={0}>
                <Table.ScrollContainer minWidth={900}>
                  <Table highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fecha</Table.Th>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th>Cantidad</Table.Th>
                        <Table.Th>Motivo</Table.Th>
                        <Table.Th>Usuario</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {movements.map((movement) => (
                        <Table.Tr
                          key={movement.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setHistoryProductId(movement.productId)}
                        >
                          <Table.Td>
                            <Text size="sm">{formatDateTime(movement.createdAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {movement.productName}
                            </Text>
                            {movement.batchCode ? (
                              <Text size="xs" c="dimmed">
                                Lote {movement.batchCode}
                              </Text>
                            ) : null}
                          </Table.Td>
                          <Table.Td>
                            <MovementBadge type={movement.type} />
                          </Table.Td>
                          <Table.Td>
                            <Text
                              size="sm"
                              fw={600}
                              c={movement.quantityDelta >= 0 ? 'vetGreen.7' : 'red.7'}
                            >
                              {movement.quantityDelta > 0 ? '+' : ''}
                              {formatQuantity(movement.quantityDelta)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {movement.reason ?? '—'}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {movement.createdByName ?? 'Sistema'}
                            </Text>
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

      <ProductFormModal
        opened={productModalOpened}
        onClose={() => setProductModalOpened(false)}
        product={editingProduct}
        categories={categories}
      />

      <StockEntryModal
        opened={Boolean(entryProduct)}
        onClose={() => setEntryProduct(null)}
        product={entryProduct}
      />

      <StockAdjustmentModal
        opened={Boolean(adjustmentProduct)}
        onClose={() => setAdjustmentProduct(null)}
        product={adjustmentProduct}
      />

      <ProductHistoryModal
        opened={historyProductId !== null}
        onClose={() => setHistoryProductId(null)}
        productId={historyProductId}
      />

      <CategoriesModal
        opened={categoriesOpened}
        onClose={() => setCategoriesOpened(false)}
      />
    </>
  )
}
