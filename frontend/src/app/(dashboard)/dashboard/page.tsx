'use client'

import React from 'react'
import { useQuery } from 'react-query'
import { kpiApi } from '@/lib/api'
import type { DashboardSummary, ProductionKpi } from '@/types/kpi'
import PageHeader from '@/components/layout/PageHeader'
import TodaySummaryCards from '@/components/features/kpi/TodaySummaryCards'
import ProductionTrendChart from '@/components/features/kpi/ProductionTrendChart'
import OrderTrendChart from '@/components/features/kpi/OrderTrendChart'
import InventoryAlertCard from '@/components/features/kpi/InventoryAlertCard'
import Badge from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'

function getDefaultProductionParams() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

export default function DashboardPage() {
  const { data: dashboardData, isLoading: dashLoading, isError: dashError } = useQuery<DashboardSummary>(
    ['kpi-dashboard'],
    async () => {
      const res = await kpiApi.getDashboard()
      return res.data
    },
    { staleTime: 60_000 }
  )

  const { data: productionData, isLoading: prodLoading } = useQuery<ProductionKpi>(
    ['kpi-production', 7],
    async () => {
      const res = await kpiApi.getProduction(getDefaultProductionParams())
      return res.data
    },
    { staleTime: 60_000 }
  )

  const isLoading = dashLoading || prodLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        subtitle="임진강김치 MES 운영 현황"
        breadcrumbs={[{ label: '홈' }, { label: '대시보드' }]}
      />

      {/* 오늘 현황 KPI 카드 4개 */}
      <TodaySummaryCards
        dashboardData={dashboardData}
        productionData={productionData}
        isLoading={isLoading}
      />

      {/* 중단: 생산 차트 + 수주 차트 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductionTrendChart />
        </div>
        <div>
          <OrderTrendChart />
        </div>
      </div>

      {/* 하단: 재고 경고 + 최근 불량 현황 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InventoryAlertCard />

        {/* 최근 불량 현황 테이블 */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">최근 불량 현황</h2>
            <p className="mt-0.5 text-xs text-gray-500">오늘 기록된 불량 이력</p>
          </div>

          {dashError && (
            <div className="flex h-40 items-center justify-center text-sm text-red-500">
              데이터를 불러오지 못했습니다
            </div>
          )}

          {dashLoading && (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              로딩 중...
            </div>
          )}

          {!dashLoading && !dashError && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['LOT 번호', '공정', '불량 수량', '기록 시각'].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {(dashboardData?.recent_defects ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                        오늘 불량 기록이 없습니다
                      </td>
                    </tr>
                  ) : (
                    dashboardData?.recent_defects.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-blue-600">
                          {d.lot_no}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {d.process_name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant="danger" dot>
                            {d.defect_qty.toLocaleString()} 개
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                          {formatDateTime(d.recorded_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
