import {
  Badge,
  Center,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Tabs,
  Text
} from '@mantine/core'
import { IconBox, IconHistory, IconPackage } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '@renderer/lib/api'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity
} from '@renderer/lib/format'
import { MovementBadge } from './MovementBadge'

interface ProductHistoryModalProps {
  opened: boolean
  onClose: () => void
  productId: number | null
}

export function ProductHistoryModal({
  opened,
  onClose,
  productId
}: ProductHistoryModalProps): React.JSX.Element {
  const productQuery = useQuery({
    queryKey: ['inventory', 'product', productId],
    queryFn: () => api.inventory.getProduct({ id: productId ?? 0 }),
    enabled: opened && Boolean(productId)
  })
  const product = productQuery.data
  const batchesQuery = useQuery({
    queryKey: ['inventory', 'batches', productId],
    queryFn: () => api.inventory.listBatches({ productId: productId ?? 0 }),
    enabled: opened && Boolean(productId)
  })
  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', { productId, limit: 100 }],
    queryFn: () => api.inventory.listMovements({ productId, limit: 100 }),
    enabled: opened && Boolean(productId)
  })

  const batches = batchesQuery.data ?? []
  const movements = movementsQuery.data ?? []

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={product ? `Stock de ${product.name}` : 'Stock del producto'}
      size="xl"
      centered
    >
      {productQuery.isPending ? (
        <Center py="xl">
          <Loader color="vetGreen" />
        </Center>
      ) : !product ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No se pudo cargar el producto.
        </Text>
      ) : (
        <Stack gap="md">
          <Group gap="lg" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Disponible
              </Text>
              <Text fw={700} size="lg">
                {formatQuantity(product.stock, product.unit)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Stock mínimo
              </Text>
              <Text fw={600}>
                {formatQuantity(product.minStock, product.unit)}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Costo
              </Text>
              <Text fw={600}>{formatCurrency(product.costCents)}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Precio
              </Text>
              <Text fw={600}>{formatCurrency(product.priceCents)}</Text>
            </div>
          </Group>

          <Tabs defaultValue="lotes">
            <Tabs.List>
              <Tabs.Tab value="lotes" leftSection={<IconBox size={16} />}>
                Lotes
              </Tabs.Tab>
              <Tabs.Tab value="movimientos" leftSection={<IconHistory size={16} />}>
                Movimientos
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="lotes" pt="md">
              {batchesQuery.isPending ? (
                <Center py="xl">
                  <Loader color="vetGreen" size="sm" />
                </Center>
              ) : batches.length === 0 ? (
                <Stack align="center" gap="xs" py="xl">
                  <IconPackage size={30} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" c="dimmed">
                    Todavía no hay lotes registrados.
                  </Text>
                </Stack>
              ) : (
                <ScrollArea.Autosize mah={340}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Lote</Table.Th>
                        <Table.Th>Vencimiento</Table.Th>
                        <Table.Th>Cantidad</Table.Th>
                        <Table.Th>Costo</Table.Th>
                        <Table.Th>Ingreso</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {batches.map((batch) => {
                        const expiring =
                          batch.expiryDate &&
                          dayjs(batch.expiryDate).diff(dayjs(), 'day') <= 60

                        return (
                          <Table.Tr key={batch.id}>
                            <Table.Td>
                              <Text size="sm" fw={600}>
                                {batch.batchCode ?? 'Sin lote'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c={expiring ? 'red' : undefined}>
                                {formatDate(batch.expiryDate)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {formatQuantity(batch.quantity, product.unit)}
                            </Table.Td>
                            <Table.Td>{formatCurrency(batch.costCents)}</Table.Td>
                            <Table.Td>{formatDate(batch.receivedAt)}</Table.Td>
                          </Table.Tr>
                        )
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="movimientos" pt="md">
              {movementsQuery.isPending ? (
                <Center py="xl">
                  <Loader color="vetGreen" size="sm" />
                </Center>
              ) : movements.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="xl">
                  Todavía no hay movimientos.
                </Text>
              ) : (
                <ScrollArea.Autosize mah={340}>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fecha</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th>Cantidad</Table.Th>
                        <Table.Th>Motivo</Table.Th>
                        <Table.Th>Usuario</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {movements.map((movement) => (
                        <Table.Tr key={movement.id}>
                          <Table.Td>
                            <Text size="sm">{formatDateTime(movement.createdAt)}</Text>
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
                              {formatQuantity(movement.quantityDelta, product.unit)}
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
                </ScrollArea.Autosize>
              )}
            </Tabs.Panel>
          </Tabs>

          <Group justify="flex-end">
            <Badge variant="light" color={product.active ? 'vetGreen' : 'gray'}>
              {product.active ? 'Producto activo' : 'Producto inactivo'}
            </Badge>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
