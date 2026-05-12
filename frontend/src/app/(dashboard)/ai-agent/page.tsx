'use client'

import React, { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { aiApi } from '@/lib/api'
import type { AIDashboard } from '@/types/ai_agent'
import AlertSummaryBar from '@/components/features/ai/AlertSummaryBar'
import ProductionForecastCard from '@/components/features/ai/ProductionForecastCard'
import MaterialReorderTable from '@/components/features/ai/MaterialReorderTable'
import EquipmentAlertList from '@/components/features/ai/EquipmentAlertList'
import DefectTrendPanel from '@/components/features/ai/DefectTrendPanel'
import DeliveryRiskTable from '@/components/features/ai/DeliveryRiskTable'

// 섹션별 스켈레톤
function SectionSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-gray-100 animate-pulse"
      style={{ height }}
    />
  )
}

export default function AIAgentPage() {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useQuery<AIDashboard>({
    queryKey: ['ai-dashboard'],
    queryFn: async () => {
      const res = await aiApi.getDashboard()
      return res.data
    },
    staleTime: 300_000,    // 5분
    refetchInterval: 300_000,
  })

  const handleScrollTo = (section: string) => {
    sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null

  return (
    <div className="space-y-5 p-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Agent 대시보드</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            생산 데이터 기반 지능형 분석 · 추천 · 예측
          </p>
        </div>
      </div>

      {/* 상단 알림 요약 바 */}
      {isLoading ? (
        <SectionSkeleton height={52} />
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
          분석 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      ) : data ? (
        <AlertSummaryBar data={data} onScrollTo={handleScrollTo} />
      ) : null}

      {/* 1행: 생산량 예측 (1/3) + 불량률 트렌드 (2/3) */}
      <div className="grid grid-cols-3 gap-5">
        <div
          ref={(el) => { sectionRefs.current['production'] = el }}
        >
          {isLoading ? (
            <SectionSkeleton height={220} />
          ) : data ? (
            <ProductionForecastCard data={data.production_forecast} />
          ) : null}
        </div>
        <div
          className="col-span-2"
          ref={(el) => { sectionRefs.current['defect'] = el }}
        >
          {isLoading ? (
            <SectionSkeleton height={220} />
          ) : data ? (
            <DefectTrendPanel data={data.defect_trend} />
          ) : null}
        </div>
      </div>

      {/* 2행: 원재료 발주 추천 (1/2) + 설비 예방정비 알림 (1/2) */}
      <div className="grid grid-cols-2 gap-5">
        <div ref={(el) => { sectionRefs.current['material'] = el }}>
          {isLoading ? (
            <SectionSkeleton height={300} />
          ) : data ? (
            <MaterialReorderTable data={data.material_alerts} />
          ) : null}
        </div>
        <div ref={(el) => { sectionRefs.current['equipment'] = el }}>
          {isLoading ? (
            <SectionSkeleton height={300} />
          ) : data ? (
            <EquipmentAlertList data={data.equipment_alerts} />
          ) : null}
        </div>
      </div>

      {/* 3행: 납기 리스크 테이블 (전체 폭) */}
      <div ref={(el) => { sectionRefs.current['delivery'] = el }}>
        {isLoading ? (
          <SectionSkeleton height={250} />
        ) : data ? (
          <DeliveryRiskTable data={data.delivery_risks} />
        ) : null}
      </div>

      {/* 하단: 마지막 분석 시각 + 새로고침 버튼 */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            마지막 분석: {lastUpdated}
          </span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {isFetching ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
              분석 중...
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              새로고침
            </>
          )}
        </button>
      </div>
    </div>
  )
}
