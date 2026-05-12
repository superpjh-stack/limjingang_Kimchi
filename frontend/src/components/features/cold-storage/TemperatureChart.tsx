'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { coldStorageApi } from '@/lib/api'
import type { TrendPeriod, TrendResponse } from '@/types/cold_storage'
import { PERIOD_LABELS } from '@/types/cold_storage'

interface Props {
  warehouseCode: string
  thresholdMin: number
  thresholdMax: number
}

const PERIODS: TrendPeriod[] = ['1h', '6h', '24h', '7d']

function formatXAxis(isoString: string, period: TrendPeriod): string {
  const d = new Date(isoString)
  if (period === '7d') {
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}시`
  }
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TemperatureChart({ warehouseCode, thresholdMin, thresholdMax }: Props) {
  const [period, setPeriod] = useState<TrendPeriod>('24h')

  const { data, isLoading, isError } = useQuery<TrendResponse>({
    queryKey: ['cold-storage-trend', warehouseCode, period],
    queryFn: async () => {
      const res = await coldStorageApi.getTrend(warehouseCode, period)
      return res.data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const chartData = (data?.data ?? []).map((point) => ({
    ...point,
    timeLabel: formatXAxis(point.time, period),
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          온도·습도 추이 — {warehouseCode}
        </h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 차트 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">
          데이터를 불러오는 중...
        </div>
      ) : isError || chartData.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">
          {isError ? 'InfluxDB 연결을 확인하세요.' : '데이터가 없습니다. 더미 데이터를 생성해보세요.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            {/* 좌측 Y축: 온도 */}
            <YAxis
              yAxisId="temp"
              orientation="left"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}°`}
              domain={['auto', 'auto']}
              label={{ value: '온도(°C)', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            {/* 우측 Y축: 습도 */}
            <YAxis
              yAxisId="hum"
              orientation="right"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              label={{ value: '습도(%)', angle: 90, position: 'insideRight', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === '온도') return [`${value?.toFixed(1)}°C`, '온도']
                if (name === '습도') return [`${value?.toFixed(1)}%`, '습도']
                return [value, name]
              }}
              labelFormatter={(label) => `시각: ${label}`}
            />
            <Legend />

            {/* HACCP 기준선 — 상한 */}
            <ReferenceLine
              yAxisId="temp"
              y={thresholdMax}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{ value: `상한 ${thresholdMax}°C`, fill: '#ef4444', fontSize: 11 }}
            />
            {/* HACCP 기준선 — 하한 */}
            <ReferenceLine
              yAxisId="temp"
              y={thresholdMin}
              stroke="#ef4444"
              strokeDasharray="6 3"
              label={{ value: `하한 ${thresholdMin}°C`, fill: '#ef4444', fontSize: 11 }}
            />

            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="온도"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              yAxisId="hum"
              type="monotone"
              dataKey="humidity"
              name="습도"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
