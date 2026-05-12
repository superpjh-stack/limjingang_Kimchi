'use client'

import React from 'react'
import {
  CubeIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { StatCard } from '@/components/ui/Card'
import PageHeader from '@/components/layout/PageHeader'
import Badge from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

// 더미 데이터 (API 연결 전 표시용)
const DUMMY_STATS = [
  {
    title: '오늘 생산량',
    value: '2,450 kg',
    subtitle: '목표 대비 98%',
    trend: { value: 5.2, label: '어제 대비' },
    icon: <BeakerIcon className="h-5 w-5" />,
    color: 'primary' as const,
  },
  {
    title: '수주잔량',
    value: '18,300 kg',
    subtitle: '12건 수주',
    trend: { value: -2.1, label: '전주 대비' },
    icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
    color: 'warning' as const,
  },
  {
    title: '재고현황',
    value: '34,200 kg',
    subtitle: '원재료 + 완제품',
    trend: { value: 1.8, label: '전일 대비' },
    icon: <CubeIcon className="h-5 w-5" />,
    color: 'success' as const,
  },
  {
    title: '이번달 매출',
    value: formatCurrency(158_400_000),
    subtitle: '목표 대비 87%',
    trend: { value: 12.3, label: '전월 대비' },
    icon: <ChartBarIcon className="h-5 w-5" />,
    color: 'danger' as const,
  },
]

const RECENT_ORDERS = [
  { id: 'ORD-2026-0512', customer: '롯데마트', product: '배추김치 500g', qty: '500 box', status: '생산중', date: '2026-05-12' },
  { id: 'ORD-2026-0511', customer: '이마트', product: '열무김치 300g', qty: '300 box', status: '출하대기', date: '2026-05-11' },
  { id: 'ORD-2026-0510', customer: 'GS리테일', product: '깍두기 200g', qty: '200 box', status: '완료', date: '2026-05-10' },
  { id: 'ORD-2026-0509', customer: '코스트코', product: '배추김치 1kg', qty: '1000 box', status: '생산대기', date: '2026-05-09' },
  { id: 'ORD-2026-0508', customer: '쿠팡', product: '총각김치 500g', qty: '150 box', status: '완료', date: '2026-05-08' },
]

const STATUS_MAP: Record<string, { label: string; variant: 'success' | 'warning' | 'primary' | 'gray' }> = {
  '생산중': { label: '생산중', variant: 'primary' },
  '출하대기': { label: '출하대기', variant: 'warning' },
  '완료': { label: '완료', variant: 'success' },
  '생산대기': { label: '생산대기', variant: 'gray' },
}

const PROCESS_STATUS = [
  { name: '세척', progress: 100, status: '완료' },
  { name: '절임', progress: 85, status: '진행중' },
  { name: '양념', progress: 60, status: '진행중' },
  { name: '포장', progress: 40, status: '진행중' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="대시보드"
        subtitle="임진강김치 MES 운영 현황"
        breadcrumbs={[{ label: '홈' }, { label: '대시보드' }]}
      />

      {/* KPI 통계 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DUMMY_STATS.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 최근 수주 */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-900">최근 수주 현황</h2>
              <a href="/orders" className="text-xs font-medium text-primary hover:underline">
                전체보기
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['수주번호', '거래처', '제품', '수량', '상태', '날짜'].map((h) => (
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
                  {RECENT_ORDERS.map((order) => {
                    const s = STATUS_MAP[order.status]
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-primary">
                          {order.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{order.customer}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{order.product}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{order.qty}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge variant={s.variant} dot>{s.label}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{order.date}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 공정 현황 */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="font-semibold text-gray-900">오늘 공정 현황</h2>
              <p className="mt-0.5 text-xs text-gray-500">2026-05-12 기준</p>
            </div>
            <div className="space-y-5 p-6">
              {PROCESS_STATUS.map((proc) => (
                <div key={proc.name}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{proc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{proc.progress}%</span>
                      <Badge
                        variant={proc.status === '완료' ? 'success' : proc.status === '진행중' ? 'primary' : 'gray'}
                        dot
                      >
                        {proc.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        proc.progress === 100 ? 'bg-success' : 'bg-primary'
                      }`}
                      style={{ width: `${proc.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
