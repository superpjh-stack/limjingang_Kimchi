'use client'

import React, { useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { kpiApi } from '@/lib/api'
import type { ProductionKpi } from '@/types/kpi'
import { cn } from '@/lib/utils'

// 임진강김치 KPI 목표값
const TARGET_DEFECT_RATE = 1.3   // %
const TARGET_HOURLY_KG = 700     // kg/h
const TARGET_ACHIEVEMENT = 100   // %

type DateRange = 7 | 14 | 30

function getDateRange(days: DateRange): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

function achievementColor(rate: number): string {
  if (rate >= TARGET_ACHIEVEMENT) return 'text-green-600'
  if (rate >= 70) return 'text-blue-600'
  return 'text-red-600'
}

function defectColor(rate: number): string {
  return rate <= TARGET_DEFECT_RATE ? 'text-green-600' : 'text-red-600'
}

interface KpiSummaryCardProps {
  label: string
  value: string
  sub?: string
  valueClass?: string
}

function KpiSummaryCard({ label, value, sub, valueClass }: KpiSummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold text-gray-900', valueClass)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

interface CustomTooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md text-xs">
      <p className="mb-2 font-semibold text-gray-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.name === '불량률(%)' ? `${entry.value}%` : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function ProductionTrendChart() {
  const [days, setDays] = useState<DateRange>(7)
  const params = getDateRange(days)

  const { data, isLoading, isError } = useQuery<ProductionKpi>(
    ['kpi-production', days],
    async () => {
      const res = await kpiApi.getProduction(params)
      return res.data
    },
    { staleTime: 60_000 }
  )

  const chartData = data?.daily_trend.map((d) => ({
    date: d.date.slice(5), // MM-DD
    계획: d.planned,
    실적: d.actual,
    '불량률(%)': d.defect > 0 && d.actual > 0 ? +((d.defect / d.actual) * 100).toFixed(2) : 0,
  })) ?? []

  const achieveRate = data?.achievement_rate ?? 0
  const defectRate = data?.defect_rate ?? 0
  const hourlyKg = data?.avg_hourly_production ?? 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 className="font-semibold text-gray-900">생산 실적 추이</h2>
          <p className="mt-0.5 text-xs text-gray-500">계획 vs 실적 / 불량률 기준선 1.3%</p>
        </div>
        <div className="flex gap-1">
          {([7, 14, 30] as DateRange[]).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'rounded px-3 py-1 text-xs font-medium transition-colors',
                days === d
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {d}일
            </button>
          ))}
        </div>
      </div>

      {/* KPI 요약 카드 4개 */}
      <div className="grid grid-cols-4 gap-3 px-6 pt-4">
        <KpiSummaryCard
          label="총 생산 실적"
          value={`${(data?.total_actual ?? 0).toLocaleString()} kg`}
          sub={`계획 ${(data?.total_planned ?? 0).toLocaleString()} kg`}
        />
        <KpiSummaryCard
          label="달성률"
          value={`${achieveRate.toFixed(1)}%`}
          sub="목표 100%"
          valueClass={achievementColor(achieveRate)}
        />
        <KpiSummaryCard
          label="불량률"
          value={`${defectRate.toFixed(2)}%`}
          sub={`목표 ${TARGET_DEFECT_RATE}% 이하`}
          valueClass={defectColor(defectRate)}
        />
        <KpiSummaryCard
          label="시간당 생산량"
          value={`${hourlyKg.toLocaleString()} kg/h`}
          sub={`목표 ${TARGET_HOURLY_KG} kg/h`}
          valueClass={hourlyKg >= TARGET_HOURLY_KG ? 'text-green-600' : 'text-gray-900'}
        />
      </div>

      {/* 차트 영역 */}
      <div className="px-6 pb-6 pt-4">
        {isLoading && (
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            로딩 중...
          </div>
        )}
        {isError && (
          <div className="flex h-64 items-center justify-center text-sm text-red-500">
            데이터를 불러오지 못했습니다
          </div>
        )}
        {!isLoading && !isError && (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="qty"
                orientation="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toLocaleString()}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />

              {/* 불량률 목표 기준선 */}
              <ReferenceLine
                yAxisId="rate"
                y={TARGET_DEFECT_RATE}
                stroke="#EA4335"
                strokeDasharray="4 4"
                label={{ value: `목표 ${TARGET_DEFECT_RATE}%`, position: 'right', fontSize: 10, fill: '#EA4335' }}
              />

              <Bar yAxisId="qty" dataKey="계획" fill="#94A3B8" radius={[3, 3, 0, 0]} barSize={18} />
              <Bar yAxisId="qty" dataKey="실적" fill="#1A73E8" radius={[3, 3, 0, 0]} barSize={18} />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="불량률(%)"
                stroke="#EA4335"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
