import React from 'react'
import Badge from '@/components/ui/Badge'
import type { ShipmentStatus } from '@/types/inventory'

const STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; variant: 'gray' | 'secondary' | 'success' | 'danger' }
> = {
  READY: { label: '준비', variant: 'gray' },
  SHIPPED: { label: '출하', variant: 'secondary' },
  DELIVERED: { label: '완료', variant: 'success' },
  RETURNED: { label: '반품', variant: 'danger' },
}

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus
  dot?: boolean
}

export default function ShipmentStatusBadge({ status, dot }: ShipmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} dot={dot}>
      {config.label}
    </Badge>
  )
}
