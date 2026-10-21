import { Badge } from '@mantine/core'
import type { SaleStatus } from '@shared/types'
import { SALE_STATUS_COLORS, SALE_STATUS_LABELS } from './sales-constants'

interface SaleStatusBadgeProps {
  status: SaleStatus
}

export function SaleStatusBadge({ status }: SaleStatusBadgeProps): React.JSX.Element {
  return (
    <Badge variant="light" color={SALE_STATUS_COLORS[status]} radius="sm">
      {SALE_STATUS_LABELS[status]}
    </Badge>
  )
}
