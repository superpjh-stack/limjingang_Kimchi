'use client'

import React from 'react'
import type { AIDashboard } from '@/types/ai_agent'

interface AlertSummaryBarProps {
  data: AIDashboard
  onScrollTo: (section: string) => void
}

export default function AlertSummaryBar({ data, onScrollTo }: AlertSummaryBarProps) {
  const criticalEquipment = data.equipment_alerts.filter(
    (a) => a.alert_level === 'CRITICAL'
  ).length
  const warningEquipment = data.equipment_alerts.filter(
    (a) => a.alert_level === 'WARNING'
  ).length
  const criticalMaterial = data.material_alerts.filter(
    (m) => m.urgency === 'CRITICAL'
  ).length
  const criticalDelivery = data.delivery_risks.filter(
    (r) => r.risk_level === 'CRITICAL'
  ).length
  const highDelivery = data.delivery_risks.filter(
    (r) => r.risk_level === 'HIGH'
  ).length

  const generatedAt = new Date(data.generated_at)
  const timeStr = generatedAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const badges = [
    {
      label: `설비 긴급 ${criticalEquipment}건`,
      count: criticalEquipment,
      color: 'bg-red-100 text-red-700 border border-red-200',
      section: 'equipment',
    },
    {
      label: `설비 경고 ${warningEquipment}건`,
      count: warningEquipment,
      color: 'bg-orange-100 text-orange-700 border border-orange-200',
      section: 'equipment',
    },
    {
      label: `자재 부족 ${criticalMaterial}건`,
      count: criticalMaterial,
      color: 'bg-red-100 text-red-700 border border-red-200',
      section: 'material',
    },
    {
      label: `납기 위험 ${criticalDelivery}건`,
      count: criticalDelivery,
      color: 'bg-red-100 text-red-700 border border-red-200',
      section: 'delivery',
    },
    {
      label: `납기 주의 ${highDelivery}건`,
      count: highDelivery,
      color: 'bg-orange-100 text-orange-700 border border-orange-200',
      section: 'delivery',
    },
  ].filter((b) => b.count > 0)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {data.total_alert_count}
        </span>
        <span className="text-sm font-semibold text-gray-800">총 알림</span>
      </div>

      <div className="mx-3 h-5 w-px bg-gray-200" />

      <div className="flex flex-1 flex-wrap gap-2">
        {badges.length === 0 ? (
          <span className="text-sm text-green-600 font-medium">
            모든 항목 정상
          </span>
        ) : (
          badges.map((badge) => (
            <button
              key={badge.label}
              onClick={() => onScrollTo(badge.section)}
              className={`rounded-full px-3 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${badge.color}`}
            >
              {badge.label}
            </button>
          ))
        )}
      </div>

      <div className="ml-auto shrink-0 text-xs text-gray-400">
        마지막 분석: {timeStr}
      </div>
    </div>
  )
}
