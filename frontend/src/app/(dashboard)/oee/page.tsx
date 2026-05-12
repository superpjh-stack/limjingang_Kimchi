'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { oeeApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import {
  ArrowPathIcon,
  CpuChipIcon,
  CheckCircleIcon,
  TrophyIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

// ─── 타입 (types/oee.ts 생성 전 인라인) ─────────────────────────────────────
interface OeeRecord {
  equipment_id: number
  equipment_name: string
  equipment_code: string
  date: string
  oee: number
  availability: number
  performance: number
  quality: number
}

interface OeeTrend {
  date: string
  avg_oee: number
}

interface OeeDashboard {
  records: OeeRecord[]
  trends: OeeTrend[]
  summary: {
    avg_oee: number
    max_oee: number
    max_oee_equipment: string
    total_equipment: number
    target_achieved_count: number
  }
}

// ─── OEE 색상 유틸 ───────────────────────────────────────────────────────────
const OEE_TARGET = 85

function getOeeColor(oee: number): { bar: string; badge: string; text: string } {
  if (oee >= OEE_TARGET) {
    return { bar: '#34A853', badge: 'bg-[#34A853]/10 text-[#34A853]', text: 'text-[#34A853]' }
  }
  if (oee >= 70) {
    return { bar: '#FBBC04', badge: 'bg-[#FBBC04]/10 text-[#FBBC04]', text: 'text-[#FBBC04]' }
  }
  return { bar: '#EA4335', badge: 'bg-[#EA4335]/10 text-[#EA4335]', text: 'text-[#EA4335]' }
}

// ─── 요약 카드 ───────────────────────────────────────────────────────────────
interface SummaryCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  highlight?: boolean
}

function SummaryCard({ title, value, subtitle, icon: Icon, highlight }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p
            className={cn(
              'mt-1 text-2xl font-bold',
              highlight ? 'text-[#1A73E8]' : 'text-gray-900'
            )}
          >
            {value}
          </p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-[#1A73E8]/10 p-2">
          <Icon className="h-5 w-5 text-[#1A73E8]" />
        </div>
      </div>
    </div>
  )
}

// ─── OEE 바 색상 커스텀 셀 ───────────────────────────────────────────────────
function CustomOeeBar(props: any) {
  const { x, y, width, height, oee } = props
  const color = getOeeColor(oee ?? 0).bar
  return <rect x={x} y={y} width={width} height={height} fill={color} rx={3} />
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function OeeDashboardPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, isLoading, isError } = useQuery<OeeDashboard>({
    queryKey: ['oee-dashboard'],
    queryFn: async () => {
      const res = await oeeApi.getDashboard()
      return res.data
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  })

  const calcMutation = useMutation({
    mutationFn: () => oeeApi.calculate({ date: today }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oee-dashboard'] })
    },
  })

  const records: OeeRecord[] = data?.records ?? []
  const trends: OeeTrend[] = data?.trends ?? []
  const summary = data?.summary ?? {
    avg_oee: 0,
    max_oee: 0,
    max_oee_equipment: '-',
    total_equipment: 0,
    target_achieved_count: 0,
  }

  // 차트 데이터 (가로 바 차트용 — recharts는 layout="vertical" 사용)
  const barData = records.map((r) => ({
    name: r.equipment_name,
    OEE: r.oee,
    가용률: r.availability,
    성능률: r.performance,
    양품률: r.quality,
    oee: r.oee,
  }))

  // 트렌드 차트 데이터
  const trendData = trends.map((t) => ({
    date: t.date.slice(5), // MM-DD
    'OEE(%)': t.avg_oee,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="OEE 분석"
        subtitle="설비종합효율 (Availability × Performance × Quality)"
      >
        <Button
          variant="primary"
          size="sm"
          onClick={() => calcMutation.mutate()}
          disabled={calcMutation.isPending}
          leftIcon={<ArrowPathIcon className={cn('h-4 w-4', calcMutation.isPending && 'animate-spin')} />}
        >
          {calcMutation.isPending ? 'OEE 계산 중...' : 'OEE 계산 실행'}
        </Button>
      </PageHeader>

      {/* 오류 배너 */}
      {calcMutation.isError && (
        <div className="rounded-lg bg-[#EA4335]/10 px-4 py-3 text-sm text-[#EA4335]">
          OEE 계산 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}
      {calcMutation.isSuccess && (
        <div className="rounded-lg bg-[#34A853]/10 px-4 py-3 text-sm text-[#34A853]">
          OEE 계산이 완료되었습니다.
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          데이터를 불러오는 중...
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-[#EA4335]/20 bg-[#EA4335]/5 px-6 py-8 text-center text-sm text-[#EA4335]">
          데이터 로드에 실패했습니다. 새로고침 후 다시 시도해 주세요.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* ── 요약 카드 4개 ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              title="평균 OEE"
              value={`${summary.avg_oee.toFixed(1)}%`}
              subtitle={`목표 ${OEE_TARGET}%`}
              icon={ChartBarIcon}
              highlight={summary.avg_oee >= OEE_TARGET}
            />
            <SummaryCard
              title="목표 달성 설비"
              value={`${summary.target_achieved_count} / ${summary.total_equipment}대`}
              subtitle={`OEE ≥ ${OEE_TARGET}%`}
              icon={CheckCircleIcon}
            />
            <SummaryCard
              title="전체 설비"
              value={`${summary.total_equipment}대`}
              subtitle="모니터링 중"
              icon={CpuChipIcon}
            />
            <SummaryCard
              title="최고 OEE"
              value={`${summary.max_oee.toFixed(1)}%`}
              subtitle={summary.max_oee_equipment}
              icon={TrophyIcon}
            />
          </div>

          {/* ── 설비별 OEE 바 차트 ── */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">설비별 OEE</h3>
              <p className="mt-0.5 text-xs text-gray-500">
                목표선 {OEE_TARGET}% 기준 &nbsp;·&nbsp; 빨강 &lt;70% / 노랑 70~85% / 초록 ≥85%
              </p>
            </div>
            <div className="p-6">
              {barData.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">설비 데이터가 없습니다.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(barData.length * 52, 200)}>
                  <BarChart
                    layout="vertical"
                    data={barData}
                    margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine
                      x={OEE_TARGET}
                      stroke="#1A73E8"
                      strokeDasharray="4 4"
                      label={{ value: '목표 85%', position: 'insideTopRight', fontSize: 10, fill: '#1A73E8' }}
                    />
                    <Bar dataKey="OEE" shape={(props: any) => <CustomOeeBar {...props} oee={props.OEE} />} />
                    <Bar dataKey="가용률" fill="#60a5fa" opacity={0.6} />
                    <Bar dataKey="성능률" fill="#a78bfa" opacity={0.6} />
                    <Bar dataKey="양품률" fill="#34d399" opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── 하단 2열: 트렌드 + 테이블 ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* OEE 트렌드 */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">OEE 트렌드</h3>
                <p className="mt-0.5 text-xs text-gray-500">최근 30일 평균 OEE 추이</p>
              </div>
              <div className="p-6">
                {trendData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">트렌드 데이터가 없습니다.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'OEE']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <ReferenceLine
                        y={OEE_TARGET}
                        stroke="#1A73E8"
                        strokeDasharray="4 4"
                        label={{ value: '목표', position: 'right', fontSize: 10, fill: '#1A73E8' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="OEE(%)"
                        stroke="#1A73E8"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 설비별 상세 테이블 */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">설비별 상세</h3>
                <p className="mt-0.5 text-xs text-gray-500">OEE 구성 요소별 현황</p>
              </div>
              <div className="overflow-x-auto">
                {records.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">데이터가 없습니다.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium text-gray-500">
                        <th className="px-4 py-3">설비명</th>
                        <th className="px-4 py-3 text-right">OEE</th>
                        <th className="px-4 py-3 text-right">가용률</th>
                        <th className="px-4 py-3 text-right">성능률</th>
                        <th className="px-4 py-3 text-right">양품률</th>
                        <th className="px-4 py-3 text-center">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {records.map((r) => {
                        const col = getOeeColor(r.oee)
                        return (
                          <tr key={r.equipment_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              <div>{r.equipment_name}</div>
                              <div className="text-[11px] text-gray-400">{r.equipment_code}</div>
                            </td>
                            <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', col.text)}>
                              {r.oee.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                              {r.availability.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                              {r.performance.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                              {r.quality.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                                  col.badge
                                )}
                              >
                                {r.oee >= OEE_TARGET ? '목표달성' : r.oee >= 70 ? '주의' : '위험'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
