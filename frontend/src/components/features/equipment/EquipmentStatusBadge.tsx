import React from 'react'
import Badge from '@/components/ui/Badge'
import type { EquipmentStatus } from '@/types/equipment_ext'

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus
}

const statusConfig: Record<EquipmentStatus, { label: string; variant: 'success' | 'gray' | 'warning' | 'danger' }> = {
  RUNNING: { label: '가동중', variant: 'success' },
  IDLE: { label: '대기', variant: 'gray' },
  MAINTENANCE: { label: '점검중', variant: 'warning' },
  BREAKDOWN: { label: '고장', variant: 'danger' },
}

export default function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
