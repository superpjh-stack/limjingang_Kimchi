'use client'

import React from 'react'
import type { ProductionForecast } from '@/types/ai_agent'

interface ProductionForecastCardProps {
  data: ProductionForecast
}

const TrendArrow = ({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' }) => {
  if (trend === 'UP') return <span className="text-green-500 text-2xl font-bold">↑</span>
  if (trend === 'DOWN') return <span className="text-red-500 text-2xl font-bold">↓</span>
  return <span className="text-gray-400 text-2xl font-bold">→</span>
}

const TrendLabel = ({ trend }: { trend: 'UP' | 'DOWN' | 'STABLE' }) => {
  const map = {
    UP: { text: '상승 추세', cls: 'text-green-600' },
    DOWN: { text: '하락 추세', cls: 'text-red-600' },
    STABLE: { text: '안정적', cls: 'text-gray-500' },
  }
  const { text, cls } = map[trend]
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>
}

export default function ProductionForecastCard({ data }: ProductionForecastCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">생산량 예측</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            data.confidence === 'HIGH'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          신뢰도 {data.confidence === 'HIGH' ? '높음' : '낮음'}
        </span>
      </div>

      {/* 내일 예측 */}
      <div className="mb-4 flex items-end gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">내일 예상 생산량</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">
              {data.tomorrow_forecast.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">kg</span>
          </div>
        </div>
        <div className="mb-1 flex flex-col items-center">
          <TrendArrow trend={data.trend} />
          <TrendLabel trend={data.trend} />
        </div>
      </div>

      {/* 이번 주 예상 */}
      <div className="mb-4 rounded-lg bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">이번 주 예상 총량</span>
          <span className="text-sm font-semibold text-gray-800">
            {data.this_week_total.toLocaleString()} kg
          </span>
        </div>
      </div>

      {/* 기준 정보 */}
      <p className="text-xs text-gray-400">
        기준: 최근 {data.basis_days}일 평균{' '}
        <span className="font-medium text-gray-600">
          {data.daily_avg.toLocaleString()} kg/일
        </span>
      </p>
    </div>
  )
}
