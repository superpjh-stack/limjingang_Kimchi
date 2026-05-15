'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
// 실제 API 연결 시: GET /packaging/batches?date=...

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

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

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
      className="rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <p className="mb-1 text-xs font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-black" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function SummaryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
      <div className="mb-2 h-3 w-24 animate-pulse rounded bg-gray-200" />
      <div className="mb-1 h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ''}`} />
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
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  )
}

// ─── 서브컴포넌트: 완료율 프로그레스 바 ──────────────────────────────────────

function ProgressBar({ rate }: { rate: number }) {
  return (
    <div className="flex min-w-[100px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${rate}%`, backgroundColor: rate === 100 ? '#16A34A' : '#0891B2' }}
        />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold text-gray-700">{rate}%</span>
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

export default function PackagingProductionPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>({
    date: TODAY,
    status: 'ALL',
    product_name: '',
    category: 'all',
  })

  // 실제 API 연결 시: packagingApi.getBatches(filters)
  const { data: batches, isLoading, isError } = useQuery(
    [
      'packaging-batches',
      filters.date,
      filters.status,
      filters.product_name,
      filters.category,
    ],
    async (): Promise<PackagingBatch[]> => {
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

  // 출하 준비 완료 배치 (설계 문서 §4e ShipReadySection 요구사항)
  const readyToShip = useMemo(
    () => (batches ?? []).filter((b) => b.status === 'COMPLETED'),
    [batches]
  )

  // 불량률 초과 배치 (1.3% 기준 — packaging-ui-design.md §4d)
  const highDefectBatches = useMemo(
    () =>
      (batches ?? []).filter(
        (b) => b.completed_qty > 0 && calcDefectRate(b.defect_qty, b.completed_qty) > 1.3
      ),
    [batches]
  )

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // 출하 준비 전환 핸들러 (설계 문서 §6.3 / §7.1)
  // 실제 API 연결 시: packagingApi.markReadyToShip(batchId) 호출
  const handleReadyToShip = (batch: PackagingBatch) => {
    const confirmed = window.confirm(
      `${batch.lot_no} ${batch.product_name} ${batch.package_spec} ${formatQty(batch.completed_qty)}개를 출하 준비 상태로 전환합니다.`
    )
    if (confirmed) {
      // 실제 API 연결 시: packagingApi.markReadyToShip(batch.id)
      router.push('/shipments')
    }
  }

  return (
    <div>
      <PageHeader
        title="포장 공정 관리"
        subtitle="포장 배치 현황, 불량률, 출하 준비 완료 현황을 한눈에 확인합니다."
        breadcrumbs={[{ label: '생산관리' }, { label: '포장 공정' }]}
        actions={
          // 출하관리 바로가기 버튼 (설계 문서 §7.2)
          <button
            onClick={() => router.push('/shipments')}
            className="rounded-xl border border-[#0891B2] px-4 py-2 text-sm font-semibold text-[#0891B2] transition-colors hover:bg-[#F0F9FF]"
          >
            출하관리 바로가기
          </button>
        }
      />

      {/* 불량률 초과 경보 배너 (설계 문서 §4d) */}
      {!isLoading && highDefectBatches.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-3">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-bold text-red-700">
              불량률 기준(1.3%) 초과 배치 {highDefectBatches.length}건이 있습니다.
            </p>
            <p className="text-xs text-red-600">즉시 원인 파악 및 조치가 필요합니다.</p>
          </div>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
              value={`${formatQty(summary.totalCompletedQty)} 개`}
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
              accent={summary.defectRate <= 1.3 ? '#16A34A' : '#DC2626'}
              sub={summary.defectRate <= 1.3 ? '목표(1.3%) 이내' : '목표 초과 — 확인 필요'}
            />
            <SummaryCard
              title="시간당 포장량"
              value={`${formatQty(summary.pkgPerHour)} 개/h`}
              accent="#D97706"
              sub="완료 배치 9h 환산"
            />
          </>
        )}
      </div>

      {/* 포장 규격 필터 탭 */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-x-auto">
        <div className="flex min-w-max">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange('category', tab.key)}
              className={`whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors ${
                filters.category === tab.key
                  ? 'border-[#0891B2] bg-[#F0F9FF] text-[#0891B2]'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 필터 바 */}
      <div
        className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm"
        style={{ borderTop: '3px solid #0891B2' }}
      >
        <div className="flex flex-wrap items-end gap-3">
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
              onChange={(e) =>
                handleFilterChange('status', e.target.value as Filters['status'])
              }
              className="h-9 rounded-lg border border-[#E2E8F0] px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0891B2]/40"
            >
              <option value="ALL">전체</option>
              <option value="PENDING">대기</option>
              <option value="IN_PROGRESS">진행중</option>
              <option value="COMPLETED">완료</option>
            </select>
          </div>
          <div className="flex flex-1 min-w-[180px] flex-col gap-1">
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
            className="h-9 rounded-lg border border-[#E2E8F0] px-4 text-sm text-gray-500 transition-colors hover:bg-gray-50"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 배치 테이블 */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
        style={{ borderTop: '3px solid #0891B2' }}
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5">
          <h2 className="text-sm font-bold text-gray-800">포장 배치 목록</h2>
          <span className="text-xs text-gray-400">총 {filtered.length}건</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="mb-1 text-base font-semibold text-red-600">데이터를 불러오지 못했습니다</p>
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
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-[#0E7490]"
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
                  const isHighDefect = defectRate > 1.3
                  return (
                    <tr
                      key={batch.id}
                      className={`border-t border-[#E2E8F0] transition-colors ${
                        isHighDefect
                          ? 'border-l-4 border-l-red-500 bg-red-50'
                          : 'hover:bg-[#F0F9FF]'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                        {batch.lot_no}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        {batch.product_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {batch.package_spec}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {formatQty(batch.target_qty)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                        {formatQty(batch.completed_qty)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={
                            isHighDefect ? 'font-bold text-red-700' : batch.defect_qty > 0 ? 'font-semibold text-red-500' : 'text-gray-500'
                          }
                        >
                          {formatQty(batch.defect_qty)}
                        </span>
                        {batch.defect_qty > 0 && batch.completed_qty > 0 && (
                          <span className={`ml-1 text-xs ${isHighDefect ? 'font-bold text-red-600' : 'text-red-400'}`}>
                            ({defectRate}%)
                          </span>
                        )}
                      </td>
                      <td className="min-w-[130px] px-4 py-3">
                        <ProgressBar rate={rate} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {batch.worker}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
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

      {/* 출하 준비 완료 섹션 (설계 문서 §4e ShipReadySection 요구사항) */}
      <div
        className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
        style={{ borderTop: '3px solid #16A34A' }}
      >
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-5 py-3.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-black text-green-700">
            {readyToShip.length}
          </span>
          <h2 className="text-sm font-bold text-gray-800">출하 준비 완료 목록</h2>
          <span className="ml-auto rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-600">
            출하 대기중
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : readyToShip.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">아직 출하 준비 완료된 배치가 없습니다.</p>
            <p className="mt-1 text-xs text-gray-400">
              포장 완료 배치에서 "출하 준비" 버튼을 눌러 출하를 준비하세요.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-50">
                    {['LOT번호', '제품명', '포장규격', '완료수량', '불량수량', '담당자', '완료시각', '액션'].map(
                      (h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-green-700"
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
                      className="border-t border-[#E2E8F0] transition-colors hover:bg-green-50/50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                        {batch.lot_no}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        {batch.product_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {batch.package_spec}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-700">
                        {formatQty(batch.completed_qty)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span
                          className={batch.defect_qty > 0 ? 'font-bold text-red-600' : 'text-gray-400'}
                        >
                          {formatQty(batch.defect_qty)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">{batch.worker}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {batch.end_time ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {/* 출하 준비 버튼 — 클릭 시 /shipments 이동 (설계 문서 §7.1) */}
                        <button
                          onClick={() => handleReadyToShip(batch)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                        >
                          출하 준비
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-green-100 bg-green-50/60 px-5 py-3">
              <p className="text-xs text-green-700">
                총{' '}
                <strong>{formatQty(readyToShip.reduce((s, b) => s + b.completed_qty, 0))}</strong>
                {' '}개 출하 준비 완료
              </p>
              {/* /shipments 링크 (설계 문서 §4e, §7 요구사항) */}
              <button
                onClick={() => router.push('/shipments')}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
              >
                출하관리 페이지로 이동 →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
