'use client'

import Badge from '@/components/ui/Badge'
import type { OrderStatus } from '@/types/order'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'gray' | 'secondary' | 'warning' | 'primary' | 'success' | 'danger' }
> = {
  DRAFT: { label: '임시저장', variant: 'gray' },
  CONFIRMED: { label: '확정', variant: 'secondary' },
  IN_PRODUCTION: { label: '생산중', variant: 'warning' },
  SHIPPED: { label: '출하', variant: 'primary' },
  COMPLETED: { label: '완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'danger' },
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'gray' as const }
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
