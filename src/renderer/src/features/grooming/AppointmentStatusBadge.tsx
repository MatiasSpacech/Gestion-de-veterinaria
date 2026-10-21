import { Badge } from '@mantine/core'
import type { AppointmentStatus } from '@shared/types'
import {
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS
} from './grooming-constants'

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus
}

export function AppointmentStatusBadge({
  status
}: AppointmentStatusBadgeProps): React.JSX.Element {
  return (
    <Badge
      variant="light"
      color={APPOINTMENT_STATUS_COLORS[status]}
      radius="sm"
    >
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  )
}
