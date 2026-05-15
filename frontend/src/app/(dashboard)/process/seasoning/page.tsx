'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'

type BatchStatus = '대기' | '진행중' | '완료' | '이상'

interface SeasoningBatch {
  id: number
  lot_no: string
  product_name: string
  recipe_name: string
  input_qty: number
  progress: number
  manager: string
  start_time: string
  status: BatchStatus
}

const MOCK_BATCHES: SeasoningBatch[] = [
  {
    id: 1,
    lot_no: 'LOT-20260513-001',
    product_name: '배추김치',
    recipe_name: '정통 배추김치 레시피 v3.2',
    input_qty: 850,
    progress: 78,
    manager: '김철수',
    start_time: '08:15',
    status: '진행중',
  },
  {
    id: 2,
    lot_no: 'LOT-20260513-002',
    product_name: '깍두기',
    recipe_name: '깍두기 표준 레시피 v2.1',
    input_qty: 420,
    progress: 100,
    manager: '이영희',
    start_time: '07:30',
    status: '완료',
  },
  {
    id: 3,
    lot_no: 'LOT-20260513-003',
    product_name: '총각김치',
    recipe_name: '총각김치 레시피 v1.8',
    input_qty: 310,
    progress: 100,
    manager: '박민준',
    start_time: '06:45',
    status: '완료',
  },
  {
    id: 4,
    lot_no: 'LOT-20260513-004',
    product_name: '배추김치',
    recipe_name: '정통 배추김치 레시피 v3.2',
    input_qty: 920,
    progress: 45,
    manager: '최지원',
    start_time: '09:00',
    status: '진행중',
  },
  {
    id: 5,
    lot_no: 'LOT-20260513-005',
    product_name: '갓김치',
    recipe_name: '여수 갓김치 레시피 v2.0',
    input_qty: 280,
    progress: 0,
    manager: '정수빈',
    start_time: '-',
    status: '대기',
  },
  {
    id: 6,
    lot_no: 'LOT-20260513-006',
    product_name: '깍두기',
    recipe_name: '깍두기 표준 레시피 v2.1',
    input_qty: 390,
    progress: 62,
    manager: '한도윤',
    start_time: '09:45',
    status: '이상',
  },
  {
    id: 7,
    lot_no: 'LOT-20260513-007',
    product_name: '기타',
    recipe_name: '파김치 레시피 v1.3',
    input_qty: 150,
    progress: 0,
    manager: '윤서아',
    start_time: '-',
    status: '대기',
  },
  {
    id: 8,
    lot_no: 'LOT-20260513-008',
    product_name: '배추김치',
    recipe_name: '정통 배추김치 레시피 v3.2',
    input_qty: 760,
    progress: 100,
    manager: '임태현',
    start_time: '07:00',
    status: '완료',
  },
]

const STATUS_STYLES: Record<BatchStatus, string> = {
  대기: 'bg-slate-100 text-slate-600',
  진행중: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  완료: 'bg-green-50 text-green-700',
  이상: 'bg-red-50 text-red-700',
}

export default function SeasoningProcessPage() {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState(today)
  const [statusFilter, setStatusFilter] = useState<string>('전체')
  const [productFilter, setProductFilter] = useState<string>('전체')

  const { data, isLoading, isError } = useQuery(
    ['seasoning-batches', dateFilter, statusFilter],
    async (): Promise<SeasoningBatch[]> => {
      await new Promise((r) => setTimeout(r, 400))
      return MOCK_BATCHES
    },
    { staleTime: 30_000 }
  )

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((b) => {
      const matchStatus = statusFilter === '전체' || b.status === statusFilter
      const matchProduct = productFilter === '전체' || b.product_name === productFilter
      return matchStatus && matchProduct
    })
  }, [data, statusFilter, productFilter])

  const summary = useMemo(() => {
    const batches = data ?? []
    const inProgress = batches.filter((b) => b.status === '진행중').length
    const completed = batches.filter((b) => b.status === '완료').length
    const totalInput = batches.reduce((sum, b) => sum + b.input_qty, 0)
    const recipeCount = batches.filter(
      (b) => b.status === '완료' || b.status === '진행중'
    ).length
    const compliantCount = batches.filter(
      (b) => (b.status === '완료' || b.status === '진행중') && b.status !== '이상'
    ).length
    const complianceRate =
      recipeCount > 0 ? Math.round((compliantCount / recipeCount) * 100) : 100
    return { inProgress, completed, totalInput, complianceRate }
  }, [data])

  return (
    <div>
      <PageHeader
        title="양념 공정 관리"
        subtitle="양념버무림 공정의 배치 현황과 레시피 준수율을 실시간으로 관리합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '양념 공정' }]}
      />

      {/* 요약 카드 4개 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* 진행중 배치 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: '3px solid #0891B2' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">진행중 배치</p>
          <p className="text-3xl font-black text-[#0891B2]">{summary.inProgress}</p>
          <p className="mt-1 text-xs text-gray-400">현재 작업 중인 배치 수</p>
        </div>

        {/* 오늘 완료 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: '3px solid #16A34A' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">오늘 완료</p>
          <p className="text-3xl font-black text-[#16A34A]">{summary.completed}</p>
          <p className="mt-1 text-xs text-gray-400">금일 완료된 배치 수</p>
        </div>

        {/* 레시피 준수율 */}
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
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
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
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
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
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

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length}건 표시
        </span>
      </div>

      {/* 배치 목록 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="space-y-0">
            {/* 스켈레톤 헤더 */}
            <div className="grid grid-cols-8 gap-4 bg-[#F0F9FF] px-5 py-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-3 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
            {/* 스켈레톤 행 */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="grid grid-cols-8 gap-4 border-t border-gray-100 px-5 py-4">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 animate-pulse rounded bg-gray-100"
                    style={{ animationDelay: `${(i * 8 + j) * 30}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'rgba(220,38,38,0.08)' }}
            >
              <svg className="h-6 w-6 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#DC2626]">데이터를 불러오지 못했습니다.</p>
            <p className="mt-1 text-xs text-gray-400">잠시 후 다시 시도해 주세요.</p>
          </div>
        ) : (
          <table className="w-full min-w-[820px] table-auto">
            <thead>
              <tr className="bg-[#F0F9FF]">
                {['LOT번호', '제품명', '레시피', '투입량(kg)', '진행률', '담당자', '시작시간', '상태'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-[#0E7490]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-sm text-gray-400">
                    해당 조건의 배치가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((batch) => (
                  <tr
                    key={batch.id}
                    className="border-t border-gray-100 transition-colors hover:bg-[#F0F9FF]"
                    style={
                      batch.status === '이상'
                        ? { background: 'rgba(220,38,38,0.04)' }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-gray-600">{batch.lot_no}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-gray-800">{batch.product_name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="max-w-[160px] truncate text-xs text-gray-500" title={batch.recipe_name}>
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
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
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
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-700">{batch.manager}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs text-gray-500">{batch.start_time}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[batch.status]}`}
                      >
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
