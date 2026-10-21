import {
  Alert,
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text
} from '@mantine/core'
import { IconAlertTriangle, IconReceipt } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import type { SaleDetail } from '@shared/types'
import { api } from '@renderer/lib/api'
import {
  formatCurrency,
  formatDateTime,
  formatQuantity
} from '@renderer/lib/format'
import { PAYMENT_LABELS } from './sales-constants'
import { SaleStatusBadge } from './SaleStatusBadge'

interface SaleDetailModalProps {
  saleId: number | null
  onClose: () => void
  onRequestCancel?: (sale: SaleDetail) => void
}

export function SaleDetailModal({
  saleId,
  onClose,
  onRequestCancel
}: SaleDetailModalProps): React.JSX.Element {
  const saleQuery = useQuery({
    queryKey: ['sales', 'detail', saleId],
    queryFn: () => api.sales.get({ id: saleId ?? 0 }),
    enabled: saleId !== null
  })
  const sale = saleQuery.data

  return (
    <Modal
      opened={saleId !== null}
      onClose={onClose}
      title={sale ? `Venta ${sale.number}` : 'Detalle de venta'}
      size="lg"
      centered
    >
      {saleQuery.isPending ? (
        <Center py="xl">
          <Loader color="vetGreen" />
        </Center>
      ) : !sale ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No se pudo cargar la venta.
        </Text>
      ) : (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Group gap="sm">
              <SaleStatusBadge status={sale.status} />
              <Badge variant="light" color="gray" radius="sm">
                {PAYMENT_LABELS[sale.paymentMethod]}
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {formatDateTime(sale.createdAt)}
            </Text>
          </Group>

          <Group gap="xl" wrap="wrap">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Cliente
              </Text>
              <Text size="sm" fw={600}>
                {sale.clientName ?? 'Consumidor final'}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Atendió
              </Text>
              <Text size="sm" fw={600}>
                {sale.userName ?? 'Sistema'}
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Ítems
              </Text>
              <Text size="sm" fw={600}>
                {sale.itemCount}
              </Text>
            </div>
          </Group>

          {sale.status === 'anulada' ? (
            <Alert
              color="red"
              variant="light"
              icon={<IconAlertTriangle size={19} />}
              title="Venta anulada"
            >
              <Text size="sm">
                {sale.cancelReason ?? 'Sin motivo registrado'}
                {sale.cancelledByName ? ` · ${sale.cancelledByName}` : ''}
                {sale.cancelledAt ? ` · ${formatDateTime(sale.cancelledAt)}` : ''}
              </Text>
            </Alert>
          ) : null}

          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Producto</Table.Th>
                <Table.Th>Cantidad</Table.Th>
                <Table.Th>Precio</Table.Th>
                <Table.Th>Descuento</Table.Th>
                <Table.Th>Subtotal</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sale.items.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {item.description}
                    </Text>
                    {item.allocations.length > 0 ? (
                      <Text size="xs" c="dimmed">
                        Lotes:{' '}
                        {item.allocations
                          .map(
                            (allocation) =>
                              `${allocation.batchCode ?? 'Sin lote'} (${formatQuantity(allocation.quantity)})`
                          )
                          .join(' · ')}
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td>{formatQuantity(item.quantity, item.productUnit)}</Table.Td>
                  <Table.Td>{formatCurrency(item.unitPriceCents)}</Table.Td>
                  <Table.Td>
                    {item.discountCents > 0
                      ? formatCurrency(item.discountCents)
                      : '—'}
                  </Table.Td>
                  <Table.Td>{formatCurrency(item.lineTotalCents)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Divider />

          <Stack gap={6} align="flex-end">
            <Group justify="space-between" w={{ base: '100%', sm: 300 }}>
              <Text size="sm" c="dimmed">
                Subtotal
              </Text>
              <Text size="sm">{formatCurrency(sale.subtotalCents)}</Text>
            </Group>
            <Group justify="space-between" w={{ base: '100%', sm: 300 }}>
              <Text size="sm" c="dimmed">
                Descuentos
              </Text>
              <Text size="sm" c={sale.discountCents > 0 ? 'orange.8' : undefined}>
                {sale.discountCents > 0 ? `- ${formatCurrency(sale.discountCents)}` : '—'}
              </Text>
            </Group>
            <Group justify="space-between" w={{ base: '100%', sm: 300 }}>
              <Text fw={700}>Total</Text>
              <Text fw={800} size="lg">
                {formatCurrency(sale.totalCents)}
              </Text>
            </Group>
          </Stack>

          {sale.notes ? (
            <Text size="sm" c="dimmed">
              Notas: {sale.notes}
            </Text>
          ) : null}

          <Group justify="space-between" mt="sm">
            <Group gap="xs">
              <IconReceipt size={17} color="var(--mantine-color-gray-5)" />
              <Text size="xs" c="dimmed">
                Pago registrado: {PAYMENT_LABELS[sale.paymentMethod]}
              </Text>
            </Group>
            <Group>
              <Button variant="default" onClick={onClose}>
                Cerrar
              </Button>
              {onRequestCancel && sale.status === 'completada' ? (
                <Button color="red" variant="light" onClick={() => onRequestCancel(sale)}>
                  Anular venta
                </Button>
              ) : null}
            </Group>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}
