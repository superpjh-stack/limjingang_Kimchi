'use client'

import React from 'react'
import type { DeliveryRisk } from '@/types/ai_agent'

interface DeliveryRiskTableProps {
  data: DeliveryRisk[]
}

const RiskBadge = ({ level }: { level: DeliveryRisk['risk_level'] }) => {
  const map = {
    CRITICAL: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
  }
  const label = { CRITICAL: '위험', HIGH: '주의', MEDIUM: '관찰' }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[level]}`}>
      {label[level]}
    </span>
  )
}

const DdayBadge = ({ days }: { days: number }) => {
  if (days < 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
        납기초과 {Math.abs(days)}일
      </span>
    )
  }
  if (days === 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
        D-day
      </span>
    )
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
      days <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
    }`}>
      D-{days}
    </span>
  )
}

const statusLabel: Record<string, string> = {
  CONFIRMED: '확정',
  IN_PROGRESS: '진행중',
  PENDING: '대기',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

export default function DeliveryRiskTable({ data }: DeliveryRiskTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">납기 리스크 분석</h3>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-sm font-medium text-green-700">납기 리스크 없음</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">납기 리스크 분석</h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          위험 수주 {data.length}건
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="pb-2 text-left font-medium">수주번호</th>
              <th className="pb-2 text-left font-medium">거래처</th>
              <th className="pb-2 text-center font-medium">납기일</th>
              <th className="pb-2 text-center font-medium">D-day</th>
              <th className="pb-2 text-center font-medium">상태</th>
              <th className="pb-2 text-center font-medium">리스크</th>
              <th className="pb-2 text-center font-medium">생산계획</th>
              <th className="pb-2 text-left font-medium">권장조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((risk) => (
              <tr
                key={risk.order_id}
                className={`hover:bg-gray-50 ${
                  risk.risk_level === 'CRITICAL' ? 'bg-red-50/40' : ''
                }`}
              >
                <td className="py-2.5 pr-3 font-medium text-gray-800">
                  {risk.order_no}
                </td>
                <td className="py-2.5 pr-3 text-gray-700">{risk.customer_name}</td>
                <td className="py-2.5 pr-3 text-center text-gray-600">
                  {risk.delivery_date}
                </td>
                <td className="py-2.5 pr-3 text-center">
                  <DdayBadge days={risk.days_remaining} />
                </td>
                <td className="py-2.5 pr-3 text-center text-gray-600">
                  {statusLabel[risk.status] ?? risk.status}
                </td>
                <td className="py-2.5 pr-3 text-center">
                  <RiskBadge level={risk.risk_level} />
                </td>
                <td className="py-2.5 pr-3 text-center">
                  {risk.has_production_plan ? (
                    <span className="text-xs text-green-600 font-medium">수립됨</span>
                  ) : (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                      ⚠ 미수립
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-xs text-gray-600">{risk.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
