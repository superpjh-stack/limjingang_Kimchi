import React from 'react'
import Badge from '@/components/ui/Badge'
import type { InspectionStatus } from '@/types/equipment_ext'

interface InspectionStatusBadgeProps {
  status: InspectionStatus
}

const statusConfig: Record<InspectionStatus, { label: string; variant: 'secondary' | 'success' | 'gray' | 'danger' }> = {
  SCHEDULED: { label: '예정', variant: 'secondary' },
  COMPLETED: { label: '완료', variant: 'success' },
  SKIPPED: { label: '생략', variant: 'gray' },
  OVERDUE: { label: '지연', variant: 'danger' },
}

export default function InspectionStatusBadge({ status }: InspectionStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
