'use client'

import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { kpiApi } from '@/lib/api'
import type { ProductionKpi, OrderKpi, InventoryKpi } from '@/types/kpi'
import PageHeader from '@/components/layout/PageHeader'
import ProductionTrendChart from '@/components/features/kpi/ProductionTrendChart'
import OrderTrendChart from '@/components/features/kpi/OrderTrendChart'
import InventoryAlertCard from '@/components/features/kpi/InventoryAlertCard'
import { formatCurrency, cn } from '@/lib/utils'

type TabKey = 'production' | 'orders' | 'inventory'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'production', label: '생산 KPI' },
  { key: 'orders', label: '수주 KPI' },
  { key: 'inventory', label: '재고 KPI' },
]

function toISO(d: Date) {
  return d.toISOString().split('T')[0]
}

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 29)
  return { from: toISO(from), to: toISO(to) }
}

function monthRange() {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return { from: toISO(from), to: toISO(to) }
}

// ─── 생산 KPI 탭 ────────────────────────────────────────────────────────────
function ProductionTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading, isError } = useQuery<ProductionKpi>(
    ['kpi-production-kpi-page', dateFrom, dateTo],
    async () => {
      const res = await kpiApi.getProduction({ date_from: dateFrom, date_to: dateTo })
      return res.data
    },
    { staleTime: 60_000 }
  )

  return (
    <div className="space-y-6">
      <ProductionTrendChart />

      {/* 제품별 상세 테이블 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">생산 실적 상세</h3>
          <p className="mt-0.5 text-xs text-gray-500">일별 계획 · 실적 · 불량 수량</p>
        </div>

        {isLoading && <p className="px-6 py-8 text-center text-sm text-gray-400">로딩 중...</p>}
        {isError && <p className="px-6 py-8 text-center text-sm text-red-500">데이터를 불러오지 못했습니다</p>}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['날짜', '계획 수량(kg)', '실적 수량(kg)', '불량 수량(kg)', '달성률', '불량률'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {(data?.daily_trend ?? []).map((row, i) => {
                  const achieve = row.planned > 0 ? (row.actual / row.planned) * 100 : 0
                  const defect = row.actual > 0 ? (row.defect / row.actual) * 100 : 0
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{row.date}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{row.planned.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-700">{row.actual.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-red-600">{row.defect.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn('text-sm font-semibold', achieve >= 100 ? 'text-green-600' : achieve >= 70 ? 'text-blue-600' : 'text-red-600')}>
                          {achieve.toFixed(1)}%
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn('text-sm font-semibold', defect <= 1.3 ? 'text-green-600' : 'text-red-600')}>
                          {defect.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {data && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">합계</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{data.total_planned.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-700">{data.total_actual.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{data.total_defect.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      <span className={cn(data.achievement_rate >= 100 ? 'text-green-600' : data.achievement_rate >= 70 ? 'text-blue-600' : 'text-red-600')}>
                        {data.achievement_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      <span className={cn(data.defect_rate <= 1.3 ? 'text-green-600' : 'text-red-600')}>
                        {data.defect_rate.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 수주 KPI 탭 ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  DRAFT: '임시저장',
  CONFIRMED: '확정',
  IN_PRODUCTION: '생산중',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

function OrdersTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { data, isLoading, isError } = useQuery<OrderKpi>(
    ['kpi-orders-kpi-page', dateFrom, dateTo],
    async () => {
      const res = await kpiApi.getOrders({ date_from: dateFrom, date_to: dateTo })
      return res.data
    },
    { staleTime: 60_000 }
  )

  return (
    <div className="space-y-6">
      <OrderTrendChart />

      {/* 상태별 수주 요약 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">수주 상태별 현황</h3>
        </div>
        {isLoading && <p className="px-6 py-8 text-center text-sm text-gray-400">로딩 중...</p>}
        {isError && <p className="px-6 py-8 text-center text-sm text-red-500">데이터를 불러오지 못했습니다</p>}
        {!isLoading && !isError && data && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['상태', '건수', '비율'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {Object.entries(data.by_status).map(([status, count]) => {
                  const pct = data.total_orders > 0 ? (count / data.total_orders) * 100 : 0
                  return (
                    <tr key={status} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {STATUS_LABELS[status] ?? status}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                        {count.toLocaleString()} 건
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-700">합계</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{data.total_orders.toLocaleString()} 건</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(data.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 재고 KPI 탭 ─────────────────────────────────────────────────────────────
function InventoryTab() {
  const { data, isLoading, isError } = useQuery<InventoryKpi>(
    ['kpi-inventory-kpi-page'],
    async () => {
      const res = await kpiApi.getInventory()
      return res.data
    },
    { staleTime: 60_000 }
  )

  return (
    <div className="space-y-6">
      <InventoryAlertCard />

      {/* 자재별 재고 현황 표 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">자재별 재고 현황</h3>
          <p className="mt-0.5 text-xs text-gray-500">부족 경고 및 유통기한 임박 자재</p>
        </div>
        {isLoading && <p className="px-6 py-8 text-center text-sm text-gray-400">로딩 중...</p>}
        {isError && <p className="px-6 py-8 text-center text-sm text-red-500">데이터를 불러오지 못했습니다</p>}
        {!isLoading && !isError && data && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['자재명', '현재 수량', '단위', '유통기한', '상태'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {data.low_stock_items.map((item, i) => (
                  <tr key={`low-${i}`} className="bg-red-50/40 hover:bg-red-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800">{item.material_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-red-600">{item.current_qty.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-400">-</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">재고부족</span>
                    </td>
                  </tr>
                ))}
                {data.expiry_warning_items.map((item, i) => (
                  <tr key={`exp-${i}`} className="bg-orange-50/40 hover:bg-orange-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-800">{item.material_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{item.qty.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">kg</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-orange-600">{item.expiry_date}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">유통기한임박</span>
                    </td>
                  </tr>
                ))}
                {data.low_stock_items.length === 0 && data.expiry_warning_items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">경고 항목이 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 메인 KPI 페이지 ──────────────────────────────────────────────────────────
export default function KpiPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('production')
  const range = defaultRange()
  const mRange = monthRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPI 모니터링"
        subtitle="생산 · 수주 · 재고 심층 분석"
        breadcrumbs={[{ label: '홈' }, { label: 'KPI 모니터링' }]}
      />

      {/* 날짜 범위 선택 */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <span className="text-sm font-medium text-gray-600">조회 기간</span>
        <input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="text-gray-400">~</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom}
          max={toISO(new Date())}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="ml-auto flex gap-2">
          {[
            { label: '최근 7일', from: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return toISO(d) })(), to: toISO(new Date()) },
            { label: '최근 30일', from: range.from, to: range.to },
            { label: '이번 달', from: mRange.from, to: mRange.to },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => { setDateFrom(preset.from); setDateTo(preset.to) }}
              className="rounded px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'production' && <ProductionTab dateFrom={dateFrom} dateTo={dateTo} />}
      {activeTab === 'orders' && <OrdersTab dateFrom={dateFrom} dateTo={dateTo} />}
      {activeTab === 'inventory' && <InventoryTab />}
    </div>
  )
}
