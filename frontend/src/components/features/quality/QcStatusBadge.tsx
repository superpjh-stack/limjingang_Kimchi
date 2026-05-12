import React from 'react'
import Badge from '@/components/ui/Badge'
import type { QcStatus } from '@/types/inventory'

const STATUS_CONFIG: Record<
  QcStatus,
  { label: string; variant: 'gray' | 'success' | 'danger' }
> = {
  PENDING: { label: '대기', variant: 'gray' },
  PASS: { label: '합격', variant: 'success' },
  FAIL: { label: '불합격', variant: 'danger' },
  SKIP: { label: '생략', variant: 'gray' },
}

interface QcStatusBadgeProps {
  status: QcStatus
  dot?: boolean
}

export default function QcStatusBadge({ status, dot }: QcStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} dot={dot}>
      {config.label}
    </Badge>
  )
}
