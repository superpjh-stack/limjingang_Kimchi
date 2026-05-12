'use client'

import React from 'react'
import type { EquipmentAlert } from '@/types/ai_agent'

interface EquipmentAlertListProps {
  data: EquipmentAlert[]
}

const AlertBadge = ({
  alertType,
  alertLevel,
}: {
  alertType: EquipmentAlert['alert_type']
  alertLevel: EquipmentAlert['alert_level']
}) => {
  const levelCls =
    alertLevel === 'CRITICAL'
      ? 'bg-red-100 text-red-700'
      : 'bg-orange-100 text-orange-700'

  const label =
    alertType === 'MAINTENANCE_DUE' ? '점검임박' : '반복고장'

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${levelCls}`}>
      {label}
    </span>
  )
}

export default function EquipmentAlertList({ data }: EquipmentAlertListProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">설비 예방정비 알림</h3>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-sm font-medium text-green-700">모든 설비 정상</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">설비 예방정비 알림</h3>
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
          {data.length}건
        </span>
      </div>

      <div className="space-y-3">
        {data.map((alert) => (
          <div
            key={`${alert.equipment_id}-${alert.alert_type}`}
            className={`rounded-lg border p-4 ${
              alert.alert_level === 'CRITICAL'
                ? 'border-red-200 bg-red-50'
                : 'border-orange-200 bg-orange-50'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-gray-800">{alert.equipment_name}</span>
              <AlertBadge alertType={alert.alert_type} alertLevel={alert.alert_level} />
            </div>

            {alert.alert_type === 'MAINTENANCE_DUE' && alert.days_until_maintenance != null && (
              <div className="mb-1 text-sm font-semibold text-gray-700">
                {alert.days_until_maintenance >= 0
                  ? `D-${alert.days_until_maintenance}일 점검 예정`
                  : `${Math.abs(alert.days_until_maintenance)}일 점검 초과`}
              </div>
            )}

            {alert.alert_type === 'REPEAT_FAILURE' && alert.failure_count_30d != null && (
              <div className="mb-1 text-sm font-semibold text-gray-700">
                최근 30일 {alert.failure_count_30d}회 고장
              </div>
            )}

            {alert.failure_count_30d != null &&
              alert.alert_type === 'MAINTENANCE_DUE' && (
                <div className="mb-1 text-xs text-gray-500">
                  최근 30일 {alert.failure_count_30d}회 고장 이력 있음
                </div>
              )}

            <p className="text-xs text-gray-600">{alert.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
