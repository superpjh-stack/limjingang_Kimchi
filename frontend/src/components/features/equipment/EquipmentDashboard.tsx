'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { equipmentExtApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import EquipmentStatusBadge from './EquipmentStatusBadge'
import InspectionStatusBadge from './InspectionStatusBadge'
import type { Equipment, EquipmentInspection, EquipmentFailure } from '@/types/equipment_ext'
import {
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

// 설비 카드 컴포넌트
interface EquipmentCardProps {
  equipment: Equipment
  openFailures: EquipmentFailure[]
}

function EquipmentCard({ equipment, openFailures }: EquipmentCardProps) {
  const hasOpenFailure = openFailures.some((f) => f.equipment_id === equipment.id)

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md',
        hasOpenFailure ? 'border-danger' : 'border-gray-200'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 overflow-hidden">
          <p className="truncate font-semibold text-gray-900">{equipment.name}</p>
          <p className="text-xs text-gray-500">{equipment.code}</p>
        </div>
        <EquipmentStatusBadge status={equipment.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {equipment.throughput_per_hour !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500">시간당 처리량</span>
            <span className="font-medium text-gray-900">
              {equipment.throughput_per_hour.toLocaleString('ko-KR')} kg/h
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500">다음 점검일</span>
          <span className="font-medium text-gray-900">
            {equipment.next_inspection_date
              ? formatDate(equipment.next_inspection_date)
              : '-'}
          </span>
        </div>
        {hasOpenFailure && (
          <div className="flex items-center gap-1.5 rounded-md bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-700">
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            미해결 고장 {equipment.open_failure_count}건
          </div>
        )}
      </div>
    </div>
  )
}

// 점검 요약 패널
interface InspectionSummaryPanelProps {
  upcoming: EquipmentInspection[]
  overdue: EquipmentInspection[]
}

function InspectionSummaryPanel({ upcoming, overdue }: InspectionSummaryPanelProps) {
  return (
    <div className="space-y-4">
      {/* 지연 점검 */}
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-danger" />
          <h3 className="text-sm font-semibold text-danger-700">지연 점검</h3>
          <span className="ml-auto rounded-full bg-danger text-white text-xs px-2 py-0.5">
            {overdue.length}
          </span>
        </div>
        {overdue.length === 0 ? (
          <p className="text-xs text-danger-600">없음</p>
        ) : (
          <ul className="space-y-2">
            {overdue.slice(0, 5).map((ins) => (
              <li key={ins.id} className="text-xs">
                <p className="font-medium text-gray-900">{ins.equipment_name}</p>
                <p className="text-gray-500">
                  예정: {formatDate(ins.scheduled_date)}
                </p>
              </li>
            ))}
            {overdue.length > 5 && (
              <p className="text-xs text-danger-600">외 {overdue.length - 5}건</p>
            )}
          </ul>
        )}
      </div>

      {/* 예정 점검 (7일) */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-700">예정 점검 (7일)</h3>
          <span className="ml-auto rounded-full bg-primary text-white text-xs px-2 py-0.5">
            {upcoming.length}
          </span>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-gray-500">없음</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((ins) => (
              <li key={ins.id} className="text-xs">
                <p className="font-medium text-gray-900">{ins.equipment_name}</p>
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">{formatDate(ins.scheduled_date)}</p>
                  <InspectionStatusBadge status={ins.status} />
                </div>
              </li>
            ))}
            {upcoming.length > 5 && (
              <p className="text-xs text-gray-500">외 {upcoming.length - 5}건</p>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

// Mock 설비 목록 (실제 설비 API가 별도 구현되어 있다고 가정)
const MOCK_EQUIPMENT: Equipment[] = [
  { id: 1, name: '세척기 #1', code: 'EQ-001', status: 'RUNNING', throughput_per_hour: 850, next_inspection_date: '2026-05-20', open_failure_count: 0 },
  { id: 2, name: '절임조 #1', code: 'EQ-002', status: 'RUNNING', throughput_per_hour: 720, next_inspection_date: '2026-05-18', open_failure_count: 0 },
  { id: 3, name: '양념 혼합기', code: 'EQ-003', status: 'MAINTENANCE', throughput_per_hour: 650, next_inspection_date: '2026-05-12', open_failure_count: 0 },
  { id: 4, name: '포장기 #1', code: 'EQ-004', status: 'BREAKDOWN', throughput_per_hour: 0, next_inspection_date: '2026-05-15', open_failure_count: 1 },
  { id: 5, name: '포장기 #2', code: 'EQ-005', status: 'RUNNING', throughput_per_hour: 730, next_inspection_date: '2026-05-25', open_failure_count: 0 },
  { id: 6, name: '냉장창고 컨베이어', code: 'EQ-006', status: 'IDLE', throughput_per_hour: 0, next_inspection_date: '2026-06-01', open_failure_count: 0 },
]

export default function EquipmentDashboard() {
  const { data: overdueData } = useQuery({
    queryKey: ['overdue-inspections'],
    queryFn: async () => {
      const res = await equipmentExtApi.getOverdueInspections()
      return (res.data as EquipmentInspection[]) ?? []
    },
  })

  const { data: upcomingData } = useQuery({
    queryKey: ['upcoming-inspections'],
    queryFn: async () => {
      const res = await equipmentExtApi.getUpcomingInspections()
      return (res.data as EquipmentInspection[]) ?? []
    },
  })

  const { data: openFailuresData } = useQuery({
    queryKey: ['open-failures'],
    queryFn: async () => {
      const res = await equipmentExtApi.getOpenFailures()
      return (res.data as EquipmentFailure[]) ?? []
    },
  })

  const overdue = overdueData ?? []
  const upcoming = upcomingData ?? []
  const openFailures = openFailuresData ?? []

  // 상태별 요약
  const statusCounts = MOCK_EQUIPMENT.reduce(
    (acc, eq) => {
      acc[eq.status] = (acc[eq.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      {/* 상단 요약 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: '가동중', value: statusCounts['RUNNING'] ?? 0, color: 'text-success' },
          { label: '대기', value: statusCounts['IDLE'] ?? 0, color: 'text-gray-500' },
          { label: '점검중', value: statusCounts['MAINTENANCE'] ?? 0, color: 'text-warning' },
          { label: '고장', value: statusCounts['BREAKDOWN'] ?? 0, color: 'text-danger' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className={cn('text-2xl font-bold', item.color)}>{item.value}</p>
            <p className="mt-1 text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </div>

      {/* 설비 카드 그리드 + 점검 패널 */}
      <div className="flex gap-6">
        {/* 설비 카드 그리드 */}
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">설비 현황</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_EQUIPMENT.map((eq) => (
              <EquipmentCard key={eq.id} equipment={eq} openFailures={openFailures} />
            ))}
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="w-64 flex-shrink-0">
          <InspectionSummaryPanel upcoming={upcoming} overdue={overdue} />
        </div>
      </div>
    </div>
  )
}
