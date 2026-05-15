'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

type PackagingCategory = 'all' | 'bag' | 'container' | 'commercial'
type BatchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

interface PackagingBatch {
  id: number
  lot_no: string
  product_name: string
  package_spec: string
  package_category: PackagingCategory
  target_qty: number
  completed_qty: number
  defect_qty: number
  worker: string
  status: BatchStatus
  start_time: string | null
  end_time: string | null
}

interface Filters {
  date: string
  status: BatchStatus | 'ALL'
  product_name: string
  category: PackagingCategory
}

// ─── 목업 데이터 ──────────────────────────────────────────────────────────────

const MOCK_BATCHES: PackagingBatch[] = [
  {
    id: 1,
    lot_no: 'LOT-2026-0513-001',
    product_name: '임진강 포기김치',
    package_spec: '봉지 500g',
    package_category: 'bag',
    target_qty: 2000,
    completed_qty: 2000,
    defect_qty: 12,
    worker: '김민준',
    status: 'COMPLETED',
    start_time: '08:00',
    end_time: '10:30',
  },
  {
    id: 2,
    lot_no: 'LOT-2026-0513-002',
    product_name: '임진강 맛김치',
    package_spec: '봉지 250g',
    package_category: 'bag',
    target_qty: 3500,
    completed_qty: 3500,
    defect_qty: 8,
    worker: '이수진',
    status: 'COMPLETED',
    start_time: '08:30',
    end_time: '11:00',
  },
  {
    id: 3,
    lot_no: 'LOT-2026-0513-003',
    product_name: '임진강 총각김치',
    package_spec: '봉지 1kg',
    package_category: 'bag',
    target_qty: 1200,
    completed_qty: 1140,
    defect_qty: 3,
    worker: '박지훈',
    status: 'IN_PROGRESS',
    start_time: '09:00',
    end_time: null,
  },
  {
    id: 4,
    lot_no: 'LOT-2026-0513-004',
    product_name: '임진강 깍두기',
    package_spec: '봉지 2kg',
    package_category: 'bag',
    target_qty: 800,
    completed_qty: 800,
    defect_qty: 22,
    worker: '최유리',
    status: 'COMPLETED',
    start_time: '07:30',
    end_time: '09:45',
  },
  {
    id: 5,
    lot_no: 'LOT-2026-0513-005',
    product_name: '임진강 포기김치',
    package_spec: '용기 2kg',
    package_category: 'container',
    target_qty: 600,
    completed_qty: 580,
    defect_qty: 5,
    worker: '정다은',
    status: 'IN_PROGRESS',
    start_time: '10:00',
    end_time: null,
  },
  {
    id: 6,
    lot_no: 'LOT-2026-0513-006',
    product_name: '임진강 백김치',
    package_spec: '용기 5kg',
    package_category: 'container',
    target_qty: 200,
    completed_qty: 200,
    defect_qty: 2,
    worker: '강현우',
    status: 'COMPLETED',
    start_time: '08:00',
    end_time: '10:00',
  },
  {
    id: 7,
    lot_no: 'LOT-2026-0513-007',
    product_name: '임진강 깍두기',
    package_spec: '용기 5kg',
    package_category: 'container',
    target_qty: 150,
    completed_qty: 0,
    defect_qty: 0,
    worker: '윤서연',
    status: 'PENDING',
    start_time: null,
    end_time: null,
  },
  {
    id: 8,
    lot_no: 'LOT-2026-0513-008',
    product_name: '임진강 포기김치',
    package_spec: '업소용 15kg',
    package_category: 'commercial',
    target_qty: 80,
    completed_qty: 80,
    defect_qty: 0,
    worker: '임태양',
    status: 'COMPLETED',
    start_time: '07:00',
    end_time: '08:30',
  },
  {
    id: 9,
    lot_no: 'LOT-2026-0513-009',
    product_name: '임진강 맛김치',
    package_spec: '업소용 20kg',
    package_category: 'commercial',
    target_qty: 50,
    completed_qty: 50,
    defect_qty: 1,
    worker: '한지수',
    status: 'COMPLETED',
    start_time: '07:30',
    end_time: '09:00',
  },
  {
    id: 10,
    lot_no: 'LOT-2026-0513-010',
    product_name: '임진강 총각김치',
    package_spec: '봉지 500g',
    package_category: 'bag',
    target_qty: 2500,
    completed_qty: 0,
    defect_qty: 0,
    worker: '오민철',
    status: 'PENDING',
    start_time: null,
    end_time: null,
  },
]

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function calcCompletionRate(completed: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.round((completed / target) * 100))
}

function calcDefectRate(defect: number, completed: number): number {
  if (completed === 0) return 0
  return Math.round((defect / completed) * 1000) / 10
}

function formatQty(qty: number): string {
  return qty.toLocaleString('ko-KR')
}

// ─── 서브컴포넌트: 요약 카드 ──────────────────────────────────────────────────

interface SummaryCardProps {
  title: string
  value: string
  accent: string
  sub?: string
}

function SummaryCard({ title, value, accent, sub }: SummaryCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-4 shadow-sm"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-black" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── 서브컴포넌트: 스켈레톤 ───────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />
  )
}

function SummaryCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-4 shadow-sm">
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

// ─── 서브컴포넌트: 상태 배지 ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: BatchStatus }) {
  const map: Record<BatchStatus, { label: string; className: string }> = {
    PENDING: { label: '대기', className: 'bg-slate-100 text-slate-600' },
    IN_PROGRESS: { label: '진행중', className: 'bg-cyan-100 text-cyan-700' },
    COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  }
  const { label, className } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

// ─── 서브컴포넌트: 완료율 프로그레스 바 ──────────────────────────────────────

function ProgressBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${rate}%`, backgroundColor: '#0891B2' }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-9 text-right shrink-0">
        {rate}%
      </span>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

const CATEGORY_TABS: { key: PackagingCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'bag', label: '봉지류 (250g/500g/1kg/2kg)' },
  { key: 'container', label: '용기류 (2kg/5kg/10kg)' },
  { key: 'commercial', label: '업소용 (15kg/20kg)' },
]

const TODAY = new Date().toISOString().split('T')[0]

export default function PackagingDashboardPage() {
  const [filters, setFilters] = useState<Filters>({
    date: TODAY,
    status: 'ALL',
    product_name: '',
    category: 'all',
  })

  // 데이터 패칭 (목업)
  const { data: batches, isLoading, isError } = useQuery(
    ['packaging-batches', filters.date, filters.status, filters.product_name, filters.category],
    async (): Promise<PackagingBatch[]> => {
      // 실제 API 연결 시: processRecordApi.getPackagingBatches(filters)
      await new Promise((r) => setTimeout(r, 600))
      return MOCK_BATCHES
    },
    {
      staleTime: 30_000,
      keepPreviousData: true,
    }
  )

  // 필터 적용
  const filtered = useMemo(() => {
    if (!batches) return []
    return batches.filter((b) => {
      if (filters.category !== 'all' && b.package_category !== filters.category) return false
      if (filters.status !== 'ALL' && b.status !== filters.status) return false
      if (
        filters.product_name &&
        !b.product_name.toLowerCase().includes(filters.product_name.toLowerCase())
      )
        return false
      return true
    })
  }, [batches, filters])

  // 요약 KPI 계산
  const summary = useMemo(() => {
    if (!batches) return null
    const completed = batches.filter((b) => b.status === 'COMPLETED')
    const totalCompletedQty = completed.reduce((s, b) => s + b.completed_qty, 0)
    const totalBatches = batches.length
    const totalDefect = batches.reduce((s, b) => s + b.defect_qty, 0)
    const totalDone = batches.reduce((s, b) => s + b.completed_qty, 0)
    const defectRate = totalDone > 0 ? Math.round((totalDefect / totalDone) * 1000) / 10 : 0
    // 시간당 포장량: 완료 배치 기준 단순 추정 (9h 작업 기준)
    const pkgPerHour = Math.round(totalCompletedQty / 9)
    return { totalCompletedQty, totalBatches, defectRate, pkgPerHour }
  }, [batches])

  // 출하 준비 완료 배치
  const readyToShip = useMemo(
    () => (batches ?? []).filter((b) => b.status === 'COMPLETED'),
    [batches]
  )

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <PageHeader
        title="포장 공정 관리"
        subtitle="포장 배치 현황, 불량률, 출하 준비 완료 현황을 한눈에 확인합니다."
        breadcrumbs={[
          { label: '공정관리' },
          { label: '포장 공정' },
        ]}
      />

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {isLoading || !summary ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              title="오늘 포장 완료량"
              value={`${formatQty(summary.totalCompletedQty)} kg`}
              accent="#0891B2"
              sub="완료 배치 기준 합산"
            />
            <SummaryCard
              title="포장 배치 수"
              value={`${summary.totalBatches} 건`}
              accent="#0891B2"
              sub={`진행중 ${batches?.filter((b) => b.status === 'IN_PROGRESS').length ?? 0}건 포함`}
            />
            <SummaryCard
              title="불량률"
              value={`${summary.defectRate}%`}
              accent={summary.defectRate <= 1 ? '#16A34A' : '#DC2626'}
              sub={summary.defectRate <= 1 ? '목표치 이내' : '목표(1%) 초과'}
            />
            <SummaryCard
              title="시간당 포장량"
              value={`${formatQty(summary.pkgPerHour)} pkg/h`}
              accent="#D97706"
              sub="완료 배치 9h 환산"
            />
          </>
        )}
      </div>

      {/* ── 포장 규격 필터 탭 ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm mb-4 overflow-x-auto">
        <div className="flex min-w-max">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange('category', tab.key)}
              className={`px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                filters.category === tab.key
                  ? 'border-[#0891B2] text-[#0891B2] bg-[#F0F9FF]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 필터 바 ── */}
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm px-5 py-4 mb-4"
        style={{ borderTop: '3px solid #0891B2' }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">날짜</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">상태</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value as Filters['status'])}
              className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/40"
            >
              <option value="ALL">전체</option>
              <option value="PENDING">대기</option>
              <option value="IN_PROGRESS">진행중</option>
              <option value="COMPLETED">완료</option>
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-500">제품명</label>
            <input
              type="text"
              placeholder="제품명 검색..."
              value={filters.product_name}
              onChange={(e) => handleFilterChange('product_name', e.target.value)}
              className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/40"
            />
          </div>
          <button
            onClick={() =>
              setFilters({ date: TODAY, status: 'ALL', product_name: '', category: 'all' })
            }
            className="h-9 px-4 rounded-lg border border-[#E2E8F0] text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            초기화
          </button>
        </div>
      </div>

      {/* ── 배치 테이블 ── */}
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm mb-6 overflow-hidden"
        style={{ borderTop: '3px solid #0891B2' }}
      >
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">포장 배치 목록</h2>
          <span className="text-xs text-gray-400">총 {filtered.length}건</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">!</div>
            <p className="text-base font-semibold text-red-600 mb-1">데이터를 불러오지 못했습니다</p>
            <p className="text-sm text-gray-400">잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">조회된 배치가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F0F9FF]">
                  {[
                    'LOT번호',
                    '제품명',
                    '포장규격',
                    '목표수량',
                    '완료수량',
                    '불량수량',
                    '완료율',
                    '담당자',
                    '상태',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-[#0E7490] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((batch) => {
                  const rate = calcCompletionRate(batch.completed_qty, batch.target_qty)
                  const defectRate = calcDefectRate(batch.defect_qty, batch.completed_qty)
                  const isHighDefect = defectRate > 2
                  return (
                    <tr
                      key={batch.id}
                      className="border-t border-[#E2E8F0] transition-colors hover:bg-[#F0F9FF]"
                      style={
                        isHighDefect ? { backgroundColor: 'rgba(220,38,38,0.04)' } : undefined
                      }
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                        {batch.lot_no}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {batch.product_name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {batch.package_spec}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {formatQty(batch.target_qty)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                        {formatQty(batch.completed_qty)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={
                            batch.defect_qty > 0 ? 'text-red-600 font-bold' : 'text-gray-500'
                          }
                        >
                          {formatQty(batch.defect_qty)}
                        </span>
                        {batch.defect_qty > 0 && batch.completed_qty > 0 && (
                          <span className="ml-1 text-xs text-red-400">
                            ({defectRate}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[130px]">
                        <ProgressBar rate={rate} />
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {batch.worker}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={batch.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 출하 준비 완료 섹션 ── */}
      {!isLoading && readyToShip.length > 0 && (
        <div
          className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden"
          style={{ borderTop: '3px solid #16A34A' }}
        >
          <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-black">
              {readyToShip.length}
            </span>
            <h2 className="text-sm font-bold text-gray-800">출하 준비 완료 배치</h2>
            <span className="ml-auto text-xs text-green-600 font-semibold bg-green-50 rounded-full px-2.5 py-0.5">
              출하 대기중
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-50">
                  {['LOT번호', '제품명', '포장규격', '완료수량', '불량수량', '담당자', '완료시각'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-green-700 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {readyToShip.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-t border-[#E2E8F0] hover:bg-green-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                      {batch.lot_no}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {batch.product_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {batch.package_spec}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                      {formatQty(batch.completed_qty)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span
                        className={
                          batch.defect_qty > 0 ? 'text-red-600 font-bold' : 'text-gray-400'
                        }
                      >
                        {formatQty(batch.defect_qty)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{batch.worker}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {batch.end_time ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-green-50/60 border-t border-green-100 flex items-center justify-between">
            <p className="text-xs text-green-700">
              총{' '}
              <strong>
                {formatQty(readyToShip.reduce((s, b) => s + b.completed_qty, 0))}
              </strong>{' '}
              개 출하 준비 완료
            </p>
            <button className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors rounded-lg px-4 py-1.5">
              출하 지시 이동
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
