'use client'

import React from 'react'
import type { AlarmRecord } from '@/types/cold_storage'
import { ALARM_LEVEL_LABELS } from '@/types/cold_storage'

interface Props {
  alarms: AlarmRecord[]
  isLoading?: boolean
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

const alarmBadgeStyle: Record<string, string> = {
  WARNING: 'bg-orange-100 text-orange-700 border border-orange-300',
  DANGER: 'bg-red-100 text-red-700 border border-red-300',
}

export default function AlarmHistoryTable({ alarms, isLoading = false }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">알람 이력</h3>
        <p className="text-xs text-gray-400 mt-0.5">최근 24시간 기준</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          불러오는 중...
        </div>
      ) : alarms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 gap-1">
          <span className="text-2xl" aria-hidden="true">✅</span>
          <p className="text-sm text-gray-400">최근 24시간 알람 없음</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">레벨</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">창고</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">측정값</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">기준범위</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">발생시각</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alarms.map((alarm, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span
                      className={[
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                        alarmBadgeStyle[alarm.alarm_level] ?? 'bg-gray-100 text-gray-600',
                      ].join(' ')}
                    >
                      {ALARM_LEVEL_LABELS[alarm.alarm_level] ?? alarm.alarm_level}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">
                    {alarm.warehouse_code}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                    {alarm.value?.toFixed(1)}°C
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                    {alarm.threshold_min}~{alarm.threshold_max}°C
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                    {formatDateTime(alarm.occurred_at)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs hidden md:table-cell max-w-xs truncate">
                    {alarm.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
