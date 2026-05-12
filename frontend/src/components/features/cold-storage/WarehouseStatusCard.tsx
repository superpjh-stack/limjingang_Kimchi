'use client'

import React from 'react'
import type { WarehouseStatus } from '@/types/cold_storage'

interface Props {
  warehouse: WarehouseStatus
  selected?: boolean
  onClick?: () => void
}

function formatTemp(value: number | null): string {
  if (value === null) return '--'
  return `${value.toFixed(1)}°C`
}

function formatHumidity(value: number | null): string {
  if (value === null) return '--'
  return `${value.toFixed(1)}%`
}

function formatTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${min}`
}

const alarmStyles = {
  NORMAL: {
    border: 'border-green-400',
    bg: 'bg-green-50',
    badge: 'bg-green-100 text-green-700',
    label: '정상',
    dot: 'bg-green-500',
  },
  WARNING: {
    border: 'border-orange-400',
    bg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    label: '경고',
    dot: 'bg-orange-500',
  },
  DANGER: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-700',
    label: '위험',
    dot: 'bg-red-500',
  },
}

export default function WarehouseStatusCard({ warehouse, selected = false, onClick }: Props) {
  const level = warehouse.alarm_level ?? 'NORMAL'
  const style = alarmStyles[level as keyof typeof alarmStyles] ?? alarmStyles.NORMAL

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer',
        style.border,
        style.bg,
        selected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md' : 'hover:shadow-sm',
      ].join(' ')}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            {warehouse.warehouse_type === 'FREEZE' ? '🧊' : '❄️'}
          </span>
          <span className="text-sm font-semibold text-gray-700">{warehouse.warehouse_name}</span>
        </div>
        <span
          className={[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
            style.badge,
          ].join(' ')}
        >
          <span className={['inline-block w-1.5 h-1.5 rounded-full', style.dot].join(' ')} />
          {style.label}
        </span>
      </div>

      {/* 온도 (대형) */}
      <div className="mb-2">
        <p className="text-[36px] font-bold leading-none text-gray-900">
          {formatTemp(warehouse.current_temperature)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          기준 {warehouse.threshold_min}~{warehouse.threshold_max}°C
        </p>
      </div>

      {/* 습도 */}
      <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
        <span className="text-base" aria-hidden="true">💧</span>
        <span>습도 {formatHumidity(warehouse.current_humidity)}</span>
      </div>

      {/* 마지막 업데이트 */}
      <p className="text-[11px] text-gray-400">
        마지막 업데이트: {formatTime(warehouse.last_updated)}
      </p>
    </button>
  )
}
