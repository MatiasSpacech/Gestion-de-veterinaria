import { Badge } from '@mantine/core'
import type { StockMovementType } from '@shared/types'
import { MOVEMENT_COLORS, MOVEMENT_LABELS } from './inventory-constants'

interface MovementBadgeProps {
  type: StockMovementType
}

export function MovementBadge({ type }: MovementBadgeProps): React.JSX.Element {
  return (
    <Badge variant="light" color={MOVEMENT_COLORS[type]} radius="sm">
      {MOVEMENT_LABELS[type]}
    </Badge>
  )
}
