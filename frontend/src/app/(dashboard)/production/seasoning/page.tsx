'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { seasoningApi } from '@/lib/api'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

type BatchStatus = '대기' | '진행중' | '완료' | '이상'

interface SeasoningBatch {
  id: number
  lot_no: string
  work_order_no: string
  product_name: string
  recipe_name: string
  input_qty: number
  progress: number
  manager: string
  start_time: string
  status: BatchStatus
  // 레시피 준수율 (설계 문서 요구사항 — seasoning-ui-design.md §4.b)
  recipe_compliance_rate: number | null
}

// ─── 목업 데이터 ──────────────────────────────────────────────────────────────
// 실제 API 연결 시: GET /production/seasoning/batches

const MOCK_BATCHES: SeasoningBatch[] = [
  {
    id: 1,
    lot_no: 'LOT-20260513-001',
    work_order_no: 'WO-20260513-001',
    product_name: '배추김치',
    recipe_name: '정통 배추김치 레시피 v3.2',
    input_qty: 850,
    progress: 78,
    manager: '김철수',
    start_time: '08:15',
    status: '진행중',
    recipe_compliance_rate: 96,
  },
  {
    id: 2,
    lot_no: 'LOT-20260513-002',
    work_order_no: 'WO-20260513-002',
    product_name: '깍두기',
    recipe_name: '깍두기 표준 레시피 v2.1',
    input_qty: 420,
    progress: 100,
    manager: '이영희',
    start_time: '07:30',
    status: '완료',
    recipe_compliance_rate: 100,
  },
  {
    id: 3,
    lot_no: 'LOT-20260513-003',
    work_order_no: 'WO-20260513-003',
    product_name: '총각김치',
    recipe_name: '총각김치 레시피 v1.8',
    input_qty: 310,
    progress: 100,
    manager: '박민준',
    start_time: '06:45',
    status: '완료',
    recipe_compliance_rate: 98,
  },
  {
    id: 4,
    lot_no: 'LOT-20260513-004',
    work_order_no: 'WO-20260513-004',
    product_name: '배추김치',
    recipe_name: '정통 배추김치 레시피 v3.2',
    input_qty: 920,
    progress: 45,
    manager: '최지원',
    start_time: '09:00',
    status: '진행중',
    recipe_compliance_rate: 91,
  },
  {
    id: 5,
    lot_no: 'LOT-20260513-005',
    work_order_no: 'WO-20260513-005',
    product_name: '갓김치',
    recipe_name: '여수 갓김치 레시피 v2.0',
    input_qty: 280,
    progress: 0,
    manager: '정수빈',
    start_time: '-',
    status: '대기',
    recipe_compliance_rate: null,
  },
  {
    id: 6,
    lot_no: 'LOT-20260513-006',
    work_order_no: 'WO-20260513-006',
    product_name: '깍두기',
    recipe_name: '깍두기 표준 레시피 v2.1',
    input_qty: 390,
    progress: 62,
    manager: '한도윤',
    start_time: '09:45',
    status: '이상',
    recipe_compliance_rate: 74,
  },
  {
    id: 7,
    lot_no: 'LOT-20260513-007',
    work_order_no: 'WO-20260513-007',
    product_name: '기타',
    recipe_name: '파김치 레시피 v1.3',
    input_qty: 150,
    progress: 0,
    manager: '윤서아',
    start_time: '-',
    status: '대기',
    recipe_compliance_rate: null,
  },
  {
    id: 8,
    lot_no: 'LOT-20260513-008',
    work_order_no: 'WO-20260513-008',
    product_name: '배추김치',
    recipe_name: '정통 배추김치 레시피 v3.2',
    input_qty: 760,
    progress: 100,
    manager: '임태현',
    start_time: '07:00',
    status: '완료',
    recipe_compliance_rate: 99,
  },
]

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function complianceColor(rate: number | null): string {
  if (rate === null) return '#94A3B8'
  if (rate >= 95) return '#16A34A'
  if (rate >= 80) return '#D97706'
  return '#DC2626'
}

// ─── 서브컴포넌트 ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<BatchStatus, string> = {
  대기: 'bg-slate-100 text-slate-600',
  진행중: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  완료: 'bg-green-50 text-green-700',
  이상: 'bg-red-50 text-red-700',
}

function StatusBadge({ status }: { status: BatchStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ''}`} />
}

// ─── 레시피 준수율 배지 ────────────────────────────────────────────────────────

function ComplianceBadge({ rate }: { rate: number | null }) {
  if (rate === null) {
    return <span className="text-xs text-gray-400">-</span>
  }
  const color = complianceColor(rate)
  const bgClass =
    rate >= 95
      ? 'bg-green-50 border-green-200'
      : rate >= 80
      ? 'bg-amber-50 border-amber-200'
      : 'bg-red-50 border-red-200'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${bgClass}`}
      style={{ color }}
    >
      {rate}%
    </span>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function SeasoningProductionPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState(today)
  const [statusFilter, setStatusFilter] = useState<string>('전체')
  const [productFilter, setProductFilter] = useState<string>('전체')

  // 배치 목록 — API 실패 시 mock 데이터로 graceful degradation
  const { data, isLoading, isError } = useQuery(
    ['seasoning', 'batches', dateFilter, statusFilter],
    () =>
      seasoningApi
        .getBatches({ date: dateFilter, status: statusFilter === '전체' ? undefined : statusFilter })
        .then((res) => res.data),
    {
      staleTime: 30_000,
      onError: () => {}, // 콘솔 에러는 허용, 빨간 UI로 표시
      retry: 1,
    }
  )

  // API 응답 정규화: { data: [...] } 또는 [...] 두 형태 모두 처리
  const batches: SeasoningBatch[] = useMemo(() => {
    if (!data) return isError ? MOCK_BATCHES : []
    // 백엔드가 { data: [...] } 래핑 반환 시
    if (Array.isArray((data as any)?.data)) return (data as any).data
    if (Array.isArray(data)) return data as SeasoningBatch[]
    return MOCK_BATCHES
  }, [data, isError])

  // 오늘 KPI 통계 — 실패해도 배치 목록에서 계산
  const { data: todayStatsRaw } = useQuery(
    ['seasoning', 'stats', 'today'],
    () => seasoningApi.getTodayStats().then((res) => res.data),
    { staleTime: 60_000, retry: 1, onError: () => {} }
  )

  // 배치 등록 뮤테이션
  const createBatchMutation = useMutation(
    (newBatch: Record<string, unknown>) => seasoningApi.createBatch(newBatch),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['seasoning'])
      },
    }
  )

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const matchStatus = statusFilter === '전체' || b.status === statusFilter
      const matchProduct = productFilter === '전체' || b.product_name === productFilter
      return matchStatus && matchProduct
    })
  }, [batches, statusFilter, productFilter])

  const summary = useMemo(() => {
    // API 통계가 있으면 우선 사용, 없으면 배치 목록에서 직접 계산
    if (todayStatsRaw && !isError) {
      const s = (todayStatsRaw as any)?.data ?? todayStatsRaw
      return {
        inProgress: s.in_progress ?? batches.filter((b) => b.status === '진행중').length,
        completed: s.completed ?? batches.filter((b) => b.status === '완료').length,
        totalInput: s.total_input_qty ?? batches.reduce((sum, b) => sum + b.input_qty, 0),
        complianceRate: s.avg_compliance_rate ?? 100,
      }
    }
    const inProgress = batches.filter((b) => b.status === '진행중').length
    const completed = batches.filter((b) => b.status === '완료').length
    const totalInput = batches.reduce((sum, b) => sum + b.input_qty, 0)
    const activeBatches = batches.filter(
      (b) => b.status === '완료' || b.status === '진행중'
    )
    const compliantCount = activeBatches.filter(
      (b) => b.recipe_compliance_rate !== null && b.recipe_compliance_rate >= 95
    ).length
    const complianceRate =
      activeBatches.length > 0
        ? Math.round((compliantCount / activeBatches.length) * 100)
        : 100
    return { inProgress, completed, totalInput, complianceRate }
  }, [batches, todayStatsRaw, isError])

  // 배치 행 클릭 시 POP 페이지 이동 (설계 문서 §6.1)
  const handleBatchClick = (batch: SeasoningBatch) => {
    router.push(`/pop/${batch.id}/seasoning`)
  }

  return (
    <div>
      <PageHeader
        title="양념버무림 공정 관리"
        subtitle="레시피 준수율 및 양념 배치 현황을 모니터링합니다."
        breadcrumbs={[{ label: '생산관리' }, { label: '양념버무림' }]}
      />

      {/* 요약 카드 4개 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* 진행중 배치 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #0891B2' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">진행중 배치</p>
          <p className="text-3xl font-black text-[#0891B2]">{summary.inProgress}</p>
          <p className="mt-1 text-xs text-gray-400">현재 작업 중인 배치 수</p>
        </div>

        {/* 오늘 완료 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #16A34A' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">오늘 완료</p>
          <p className="text-3xl font-black text-[#16A34A]">{summary.completed}</p>
          <p className="mt-1 text-xs text-gray-400">금일 완료된 배치 수</p>
        </div>

        {/* 레시피 준수율 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
          style={{
            borderTop: `3px solid ${summary.complianceRate >= 95 ? '#16A34A' : '#DC2626'}`,
          }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">레시피 준수율</p>
          <p
            className="text-3xl font-black"
            style={{ color: summary.complianceRate >= 95 ? '#16A34A' : '#DC2626' }}
          >
            {summary.complianceRate}%
          </p>
          <p className="mt-1 text-xs text-gray-400">기준: 95% 이상</p>
        </div>

        {/* 총 양념 투입량 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
          style={{ borderTop: '3px solid #D97706' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">총 양념 투입량</p>
          <p className="text-3xl font-black text-[#D97706]">
            {summary.totalInput.toLocaleString()}
            <span className="ml-1 text-base font-semibold">kg</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">금일 전체 투입량 합계</p>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <label htmlFor="date-filter" className="text-xs font-semibold text-gray-500">
            날짜
          </label>
          <input
            id="date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs font-semibold text-gray-500">
            상태
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          >
            {['전체', '대기', '진행중', '완료', '이상'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="product-filter" className="text-xs font-semibold text-gray-500">
            제품
          </label>
          <select
            id="product-filter"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
          >
            {['전체', '배추김치', '깍두기', '총각김치', '갓김치', '기타'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <span className="ml-auto text-xs text-gray-400">{filtered.length}건 표시</span>
      </div>

      {/* 배치 목록 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="border-b border-[#E2E8F0] bg-[#F0F9FF] px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0E7490]">양념 배치 목록</h3>
          <p className="text-xs text-gray-400">행 클릭 시 POP 현장 화면으로 이동합니다</p>
        </div>

        {isLoading ? (
          <div className="space-y-0">
            <div className="grid grid-cols-9 gap-4 bg-[#F0F9FF] px-5 py-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-3" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-9 gap-4 border-t border-gray-100 px-5 py-4">
                {Array.from({ length: 9 }).map((_, j) => (
                  <Skeleton
                    key={j}
                    className="h-4"
                    style={{ animationDelay: `${(i * 9 + j) * 30}ms` } as React.CSSProperties}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-semibold text-[#DC2626]">데이터를 불러오지 못했습니다.</p>
            <p className="mt-1 text-xs text-gray-400">잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-auto">
              <thead>
                <tr className="bg-[#F0F9FF]">
                  {[
                    'LOT번호',
                    '제품명',
                    '레시피',
                    '투입량(kg)',
                    '진행률',
                    '레시피 준수율',
                    '담당자',
                    '시작시간',
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
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-sm text-gray-400">
                      해당 조건의 배치가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filtered.map((batch) => (
                    <tr
                      key={batch.id}
                      onClick={() => handleBatchClick(batch)}
                      className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-[#F0F9FF]"
                      style={
                        batch.status === '이상'
                          ? { background: 'rgba(220,38,38,0.04)' }
                          : undefined
                      }
                      title={`POP 현장 화면으로 이동 — ${batch.work_order_no}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-600">{batch.lot_no}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-800">{batch.product_name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="max-w-[160px] truncate text-xs text-gray-500 block"
                          title={batch.recipe_name}
                        >
                          {batch.recipe_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {batch.input_qty.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${batch.progress}%`,
                                background:
                                  batch.status === '이상'
                                    ? '#DC2626'
                                    : batch.progress === 100
                                    ? '#16A34A'
                                    : '#0891B2',
                              }}
                            />
                          </div>
                          <span className="min-w-[32px] text-right text-xs font-semibold text-gray-600">
                            {batch.progress}%
                          </span>
                        </div>
                      </td>
                      {/* 레시피 준수율 컬럼 (설계 문서 §4.b 요구사항) */}
                      <td className="px-4 py-3.5">
                        <ComplianceBadge rate={batch.recipe_compliance_rate} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-700">{batch.manager}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-500">{batch.start_time}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={batch.status} />
                          {/* POP 이동 버튼 (설계 문서 §6.1 요구사항) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/pop/${batch.id}/seasoning`)
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-cyan-600 hover:bg-cyan-50 hover:text-cyan-800"
                            title="POP 현장 화면으로 이동"
                          >
                            POP
                          </button>
                        </div>
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
  )
}
