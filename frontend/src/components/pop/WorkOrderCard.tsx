'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { WorkOrder, WorkOrderStatus } from '@/types/production'

interface WorkOrderCardProps {
  workOrder: WorkOrder
  onStart: (id: number) => void
  onSelect: (id: number, processType?: string) => void
}

const statusConfig: Record<
  WorkOrderStatus,
  { label: string; badgeBg: string; badgeText: string; stripeBg: string }
> = {
  ISSUED: {
    label: '발행됨',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    stripeBg: 'bg-gray-400',
  },
  IN_PROGRESS: {
    label: '진행중',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    stripeBg: 'bg-blue-500',
  },
  PAUSED: {
    label: '일시정지',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
    stripeBg: 'bg-orange-400',
  },
  COMPLETED: {
    label: '완료',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    stripeBg: 'bg-green-500',
  },
  CANCELLED: {
    label: '취소',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    stripeBg: 'bg-red-400',
  },
}

export default function WorkOrderCard({ workOrder, onStart, onSelect }: WorkOrderCardProps) {
  const config = statusConfig[workOrder.status]
  const progressPct =
    workOrder.planned_qty > 0
      ? Math.min(100, Math.round((workOrder.actual_qty / workOrder.planned_qty) * 100))
      : 0

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md transition-shadow hover:shadow-lg">
      {/* 공정 색상 상단 띠 */}
      <div className={cn('h-2 w-full', config.stripeBg)} />

      <div className="p-5">
        {/* 헤더: 번호 + 상태배지 */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="font-mono text-xs text-gray-500">{workOrder.work_order_no}</span>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-bold',
              config.badgeBg,
              config.badgeText
            )}
          >
            {config.label}
          </span>
        </div>

        {/* 제품명 */}
        <p className="mb-1 text-2xl font-bold leading-tight text-gray-900">
          {workOrder.product_name}
        </p>

        {/* 공정명 */}
        {workOrder.process_name && (
          <p className="mb-4 text-lg text-gray-600">{workOrder.process_name}</p>
        )}

        {/* 수량 현황 */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500">지시수량</p>
            <p className="text-xl font-bold text-gray-900">
              {workOrder.planned_qty.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-gray-500">kg</span>
            </p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-center">
            <p className="text-xs text-blue-600">실적수량</p>
            <p className="text-xl font-bold text-blue-700">
              {workOrder.actual_qty.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-blue-500">kg</span>
            </p>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="mb-5">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>진행률</span>
            <span className="font-semibold text-gray-700">{progressPct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={cn('h-full rounded-full transition-all', config.stripeBg)}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {workOrder.status === 'ISSUED' && (
            <button
              onClick={() => onStart(workOrder.id)}
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-green-500 text-base font-bold text-white transition-colors hover:bg-green-600 active:bg-green-700"
            >
              작업 시작
            </button>
          )}
          <button
            onClick={() => onSelect(workOrder.id, (workOrder as WorkOrder & { process_type?: string }).process_type)}
            className={cn(
              'flex h-14 items-center justify-center rounded-xl text-base font-bold transition-colors',
              workOrder.status === 'ISSUED'
                ? 'flex-1 border-2 border-blue-500 text-blue-600 hover:bg-blue-50'
                : 'flex-1 bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
            )}
          >
            {workOrder.status === 'IN_PROGRESS' ? '실적 입력' : '상세 보기'}
          </button>
        </div>
      </div>
    </div>
  )
}
