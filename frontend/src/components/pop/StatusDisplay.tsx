'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { WorkOrderStatus } from '@/types/production'

interface StatusDisplayProps {
  status: WorkOrderStatus
  actualQty: number
  plannedQty: number
}

const statusConfig: Record<
  WorkOrderStatus,
  { label: string; icon: string; bg: string; text: string; bar: string; border: string }
> = {
  ISSUED: {
    label: '발행됨',
    icon: '⏳',
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    bar: 'bg-gray-400',
    border: 'border-gray-300',
  },
  IN_PROGRESS: {
    label: '진행중',
    icon: '▶',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    bar: 'bg-blue-500',
    border: 'border-blue-300',
  },
  PAUSED: {
    label: '일시정지',
    icon: '⏸',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    bar: 'bg-orange-400',
    border: 'border-orange-300',
  },
  COMPLETED: {
    label: '완료',
    icon: '✓',
    bg: 'bg-green-50',
    text: 'text-green-700',
    bar: 'bg-green-500',
    border: 'border-green-300',
  },
  CANCELLED: {
    label: '취소됨',
    icon: '✕',
    bg: 'bg-red-50',
    text: 'text-red-700',
    bar: 'bg-red-400',
    border: 'border-red-300',
  },
}

export default function StatusDisplay({ status, actualQty, plannedQty }: StatusDisplayProps) {
  const config = statusConfig[status]
  const progressPct =
    plannedQty > 0 ? Math.min(100, Math.round((actualQty / plannedQty) * 100)) : 0

  return (
    <div className={cn('rounded-2xl border-2 p-6', config.bg, config.border)}>
      {/* 상태 표시 */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className="text-5xl">{config.icon}</span>
        <span className={cn('text-4xl font-black', config.text)}>{config.label}</span>
      </div>

      {/* 달성률 수치 */}
      <div className="mb-3 text-center">
        <span className={cn('font-mono text-6xl font-black tabular-nums', config.text)}>
          {progressPct}
        </span>
        <span className={cn('text-3xl font-bold', config.text)}>%</span>
        <p className="mt-1 text-sm text-gray-500">
          {actualQty.toLocaleString()} / {plannedQty.toLocaleString()} kg
        </p>
      </div>

      {/* 진행률 바 */}
      <div className="h-5 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className={cn('h-full rounded-full transition-all duration-500', config.bar)}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  )
}
