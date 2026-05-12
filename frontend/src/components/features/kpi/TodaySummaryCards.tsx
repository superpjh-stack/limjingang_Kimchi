'use client'

import React from 'react'
import {
  ClipboardDocumentListIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import type { DashboardSummary, ProductionKpi } from '@/types/kpi'
import { formatCurrency, cn } from '@/lib/utils'

const TARGET_HOURLY_KG = 700 // kg/h 목표

interface StatCardProps {
  title: string
  mainValue: string
  sub1?: string
  sub2?: string
  icon: React.ReactNode
  iconBg: string
  progress?: number
  progressColor?: string
  progressLabel?: string
}

function StatCard({
  title,
  mainValue,
  sub1,
  sub2,
  icon,
  iconBg,
  progress,
  progressColor = 'bg-blue-500',
  progressLabel,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{mainValue}</p>
          {sub1 && <p className="mt-0.5 text-xs text-gray-500">{sub1}</p>}
          {sub2 && <p className="text-xs text-gray-500">{sub2}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', iconBg)}>{icon}</div>
      </div>
      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{progressLabel}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={cn('h-full rounded-full transition-all duration-500', progressColor)}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface TodaySummaryCardsProps {
  dashboardData?: DashboardSummary
  productionData?: ProductionKpi
  isLoading?: boolean
}

export default function TodaySummaryCards({
  dashboardData,
  productionData,
  isLoading,
}: TodaySummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const wo = dashboardData?.today_work_orders
  const orders = dashboardData?.this_month_orders
  const alertCount = dashboardData?.inventory_alerts.count ?? 0
  const hourlyKg = productionData?.avg_hourly_production ?? 0
  const hourlyProgress = (hourlyKg / TARGET_HOURLY_KG) * 100

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 오늘 작업지시 */}
      <StatCard
        title="오늘 작업지시"
        mainValue={`${wo?.total ?? 0} 건`}
        sub1={`진행중 ${wo?.in_progress ?? 0}건`}
        sub2={`완료 ${wo?.completed ?? 0}건`}
        icon={<ClipboardDocumentListIcon className="h-5 w-5" />}
        iconBg="bg-blue-50 text-blue-600"
      />

      {/* 이번달 수주 */}
      <StatCard
        title="이번달 수주"
        mainValue={`${(orders?.count ?? 0).toLocaleString()} 건`}
        sub1={formatCurrency(orders?.amount ?? 0)}
        icon={<CubeIcon className="h-5 w-5" />}
        iconBg="bg-green-50 text-green-600"
      />

      {/* 재고 경고 */}
      <StatCard
        title="재고 경고"
        mainValue={`${alertCount} 건`}
        sub1={alertCount > 0 ? '즉시 확인 필요' : '정상 범위'}
        icon={<ExclamationTriangleIcon className="h-5 w-5" />}
        iconBg={alertCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}
      />

      {/* 시간당 생산량 */}
      <StatCard
        title="시간당 생산량"
        mainValue={`${hourlyKg.toLocaleString()} kg/h`}
        sub1={`목표 ${TARGET_HOURLY_KG} kg/h`}
        icon={<BoltIcon className="h-5 w-5" />}
        iconBg={hourlyKg >= TARGET_HOURLY_KG ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}
        progress={hourlyProgress}
        progressColor={hourlyKg >= TARGET_HOURLY_KG ? 'bg-green-500' : 'bg-yellow-400'}
        progressLabel="목표 대비"
      />
    </div>
  )
}
