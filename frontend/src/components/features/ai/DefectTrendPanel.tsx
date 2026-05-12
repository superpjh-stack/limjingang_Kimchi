'use client'

import React from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { DefectTrend } from '@/types/ai_agent'

interface DefectTrendPanelProps {
  data: DefectTrend
}

const statusConfig = {
  GOOD: { label: '목표 달성', cls: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  WARNING: { label: '주의', cls: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  DANGER: { label: '위험', cls: 'text-red-600', bg: 'bg-red-50 border-red-200' },
}

const trendConfig = {
  IMPROVING: { label: '개선 중 ↓', cls: 'text-green-600' },
  WORSENING: { label: '악화 중 ↑', cls: 'text-red-600' },
  STABLE: { label: '안정 →', cls: 'text-gray-500' },
}

export default function DefectTrendPanel({ data }: DefectTrendPanelProps) {
  const { label: statusLabel, cls: statusCls, bg: statusBg } = statusConfig[data.status]
  const { label: trendLabel, cls: trendCls } = trendConfig[data.trend]

  const chartData = data.daily_trend.map((d) => ({
    date: d.date.slice(5), // MM-DD 형식
    rate: d.defect_rate,
  }))

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">불량률 트렌드</h3>
        <span className={`text-sm font-semibold ${trendCls}`}>{trendLabel}</span>
      </div>

      {/* 현재 불량률 vs 목표 */}
      <div className={`mb-5 flex items-center gap-6 rounded-lg border p-4 ${statusBg}`}>
        <div>
          <p className="text-xs text-gray-500 mb-1">현재 불량률</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${statusCls}`}>
              {data.current_defect_rate.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div>
          <p className="text-xs text-gray-500 mb-1">목표 불량률</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-700">
              {data.target_defect_rate.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
        <div className="ml-auto">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusCls} bg-white border`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* 14일 불량률 추이 */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium text-gray-500">일별 불량률 추이 (14일)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}%`, '불량률']}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
            />
            <ReferenceLine
              y={data.target_defect_rate}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{ value: '목표', position: 'right', fontSize: 10, fill: '#ef4444' }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 공정별 불량률 */}
      {data.by_process.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">공정별 불량률 Top 3</p>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart
              data={data.by_process}
              layout="vertical"
              margin={{ top: 0, right: 8, bottom: 0, left: 40 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="process_name"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(2)}%`, '불량률']}
                contentStyle={{ fontSize: 11, borderRadius: 6 }}
              />
              <ReferenceLine
                x={data.target_defect_rate}
                stroke="#ef4444"
                strokeDasharray="4 2"
              />
              <Bar dataKey="defect_rate" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
