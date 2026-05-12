import React from 'react'
import { cn } from '@/lib/utils'
import type { ImpactLevel } from '@/types/equipment_ext'

interface FailureImpactBadgeProps {
  level: ImpactLevel
}

const levelConfig: Record<ImpactLevel, { label: string; className: string }> = {
  LOW: {
    label: '낮음',
    className: 'bg-gray-100 text-gray-700 ring-gray-200',
  },
  MEDIUM: {
    label: '보통',
    className: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  },
  HIGH: {
    label: '높음',
    className: 'bg-orange-50 text-orange-800 ring-orange-200',
  },
  CRITICAL: {
    label: '치명적',
    className: 'bg-danger-50 text-danger-700 ring-danger-200 animate-pulse',
  },
}

export default function FailureImpactBadge({ level }: FailureImpactBadgeProps) {
  const config = levelConfig[level]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-xs font-medium ring-1 ring-inset',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
