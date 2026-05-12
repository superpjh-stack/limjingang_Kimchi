'use client'

import Badge from '@/components/ui/Badge'
import type { PlanStatus, WorkOrderStatus } from '@/types/production'

interface PlanStatusBadgeProps {
  status: PlanStatus
}

const planStatusConfig: Record<
  PlanStatus,
  { label: string; variant: 'gray' | 'secondary' | 'warning' | 'primary' | 'success' | 'danger' }
> = {
  DRAFT: { label: '임시저장', variant: 'gray' },
  CONFIRMED: { label: '확정', variant: 'secondary' },
  IN_PROGRESS: { label: '진행중', variant: 'warning' },
  COMPLETED: { label: '완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'danger' },
}

export function PlanStatusBadge({ status }: PlanStatusBadgeProps) {
  const config = planStatusConfig[status] ?? { label: status, variant: 'gray' as const }
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus
}

const workOrderStatusConfig: Record<
  WorkOrderStatus,
  { label: string; variant: 'gray' | 'secondary' | 'warning' | 'primary' | 'success' | 'danger' }
> = {
  ISSUED: { label: '발행', variant: 'secondary' },
  IN_PROGRESS: { label: '진행', variant: 'warning' },
  PAUSED: { label: '중단', variant: 'gray' },
  COMPLETED: { label: '완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'danger' },
}

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  const config = workOrderStatusConfig[status] ?? { label: status, variant: 'gray' as const }
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
