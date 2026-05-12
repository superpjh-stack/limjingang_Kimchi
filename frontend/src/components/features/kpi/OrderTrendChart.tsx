'use client'

import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useQuery } from 'react-query'
import { kpiApi } from '@/lib/api'
import type { OrderKpi } from '@/types/kpi'
import { formatCurrency } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '임시저장',
  CONFIRMED: '확정',
  IN_PRODUCTION: '생산중',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94A3B8',
  CONFIRMED: '#1A73E8',
  IN_PRODUCTION: '#FBBC04',
  COMPLETED: '#34A853',
  CANCELLED: '#EA4335',
}

interface CustomLabelProps {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  name: string
}

function PieLabel({ cx, cy, midAngle, outerRadius, percent, name }: CustomLabelProps) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#374151" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  )
}

function getOrderParams() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    date_from: firstDay.toISOString().split('T')[0],
    date_to: now.toISOString().split('T')[0],
  }
}

export default function OrderTrendChart() {
  const params = getOrderParams()

  const { data, isLoading, isError } = useQuery<OrderKpi>(
    ['kpi-orders'],
    async () => {
      const res = await kpiApi.getOrders(params)
      return res.data
    },
    { staleTime: 60_000 }
  )

  const pieData = data
    ? Object.entries(data.by_status).map(([key, value]) => ({
        name: STATUS_LABELS[key] ?? key,
        value,
        color: STATUS_COLORS[key] ?? '#94A3B8',
      }))
    : []

  const barData =
    data?.monthly_trend.map((m) => ({
      month: m.month.slice(0, 7), // YYYY-MM
      건수: m.count,
      금액: m.amount,
    })) ?? []

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="font-semibold text-gray-900">수주 현황</h2>
        <p className="mt-0.5 text-xs text-gray-500">이번 달 기준</p>
      </div>

      {/* 상단 KPI 카드 */}
      <div className="grid grid-cols-2 gap-3 px-6 pt-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">이번달 수주건수</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {(data?.total_orders ?? 0).toLocaleString()} 건
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">이번달 수주금액</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatCurrency(data?.total_amount ?? 0)}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-56 items-center justify-center text-sm text-gray-400">로딩 중...</div>
      )}
      {isError && (
        <div className="flex h-56 items-center justify-center text-sm text-red-500">
          데이터를 불러오지 못했습니다
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* 파이차트: 수주 상태별 분포 */}
          <div className="px-6 pt-4">
            <p className="mb-1 text-xs font-medium text-gray-500">수주 상태별 분포</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  labelLine={false}
                  label={(props) => <PieLabel {...props} />}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v.toLocaleString()} 건`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 막대차트: 월별 수주금액 추이 */}
          <div className="px-6 pb-6 pt-2">
            <p className="mb-1 text-xs font-medium text-gray-500">월별 수주 추이</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === '금액' ? [formatCurrency(v), '수주금액'] : [`${v.toLocaleString()} 건`, '건수']
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="금액" fill="#1A73E8" radius={[3, 3, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
