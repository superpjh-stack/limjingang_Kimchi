'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { lotTraceApi } from '@/lib/api'
import type { LotTimeline, TraceType, LotTrace } from '@/types/lot_trace'
import {
  ArrowDownTrayIcon,
  CogIcon,
  BeakerIcon,
  TruckIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

// TraceType별 스타일 설정
const TRACE_CONFIG: Record<
  TraceType,
  { label: string; color: string; bgColor: string; borderColor: string; Icon: React.ElementType }
> = {
  RECEIVE: {
    label: '입고',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-400',
    Icon: ArrowDownTrayIcon,
  },
  PRODUCTION: {
    label: '생산',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400',
    Icon: CogIcon,
  },
  PROCESS: {
    label: '공정',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
    Icon: BeakerIcon,
  },
  SHIPMENT: {
    label: '출하',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-400',
    Icon: TruckIcon,
  },
  QC: {
    label: '품질검사',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-400',
    Icon: ShieldCheckIcon,
  },
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  const ymd = d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const hm = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return `${ymd} ${hm}`
}

function TraceTypeBadge({ type }: { type: TraceType }) {
  const cfg = TRACE_CONFIG[type]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}
    >
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function TimelineItem({ trace, isLast }: { trace: LotTrace; isLast: boolean }) {
  const cfg = TRACE_CONFIG[trace.trace_type]
  const Icon = cfg.Icon

  return (
    <div className="relative flex gap-4">
      {/* 세로선 */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* 아이콘 원형 */}
      <div
        className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 ${cfg.bgColor} ${cfg.borderColor}`}
      >
        <Icon className={`h-5 w-5 ${cfg.color}`} />
      </div>

      {/* 내용 */}
      <div className="flex-1 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <TraceTypeBadge type={trace.trace_type} />
          <span className="text-sm text-gray-500">{formatDateTime(trace.trace_date)}</span>
          {trace.operator && (
            <span className="text-xs text-gray-400">담당: {trace.operator}</span>
          )}
        </div>

        <div className="mt-1.5 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          {trace.description && (
            <p className="text-sm font-medium text-gray-800">{trace.description}</p>
          )}
          {trace.process_name && (
            <p className="mt-0.5 text-xs text-gray-500">공정: {trace.process_name}</p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
            {trace.quantity != null && (
              <span>
                수량: <strong className="text-gray-700">{trace.quantity.toLocaleString()}{trace.unit ?? ''}</strong>
              </span>
            )}
            {trace.ref_table && trace.ref_id && (
              <span>
                참조: {trace.ref_table}-{trace.ref_id}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ timeline }: { timeline: LotTimeline }) {
  const { summary } = timeline
  const traceTypeSet = summary.trace_types

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">LOT 번호</p>
          <p className="mt-0.5 text-lg font-bold text-gray-900">{timeline.lot_no}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-700">{summary.total_events}</p>
            <p className="text-xs text-gray-500">총 이력 건수</p>
          </div>
          {summary.first_event && (
            <div className="text-center">
              <p className="font-semibold text-gray-800">
                {new Date(summary.first_event).toLocaleDateString('ko-KR')}
              </p>
              <p className="text-xs text-gray-500">최초 이벤트</p>
            </div>
          )}
          {summary.last_event && (
            <div className="text-center">
              <p className="font-semibold text-gray-800">
                {new Date(summary.last_event).toLocaleDateString('ko-KR')}
              </p>
              <p className="text-xs text-gray-500">최종 이벤트</p>
            </div>
          )}
        </div>
      </div>
      {traceTypeSet.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {traceTypeSet.map((t) => (
            <TraceTypeBadge key={t} type={t} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function LotTracePage() {
  const [inputValue, setInputValue] = useState('')
  const [searchLotNo, setSearchLotNo] = useState('')

  const { data, isLoading, isError, error } = useQuery<{ data: LotTimeline }>({
    queryKey: ['lot-timeline', searchLotNo],
    queryFn: () => lotTraceApi.getTimeline(searchLotNo),
    enabled: !!searchLotNo,
    retry: false,
  })

  const timeline = data?.data

  const handleSearch = () => {
    const trimmed = inputValue.trim()
    if (trimmed) {
      setSearchLotNo(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="p-6">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LOT 추적관리</h1>
        <p className="mt-1 text-sm text-gray-500">
          LOT 번호를 입력하여 원자재 입고부터 출하까지의 전체 이력을 조회합니다.
        </p>
      </div>

      {/* 검색 영역 */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1 max-w-lg">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: WO-20260501-001, LOT-20260501-001"
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm
                       focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!inputValue.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white
                     shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50
                     transition-colors"
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
          검색
        </button>
      </div>

      {/* 결과 영역 */}
      {!searchLotNo && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-20">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-base font-medium text-gray-400">
            LOT 번호를 입력하여 추적 이력을 조회하세요
          </p>
          <p className="mt-1 text-sm text-gray-300">
            예: WO-20260501-001, LOT-20260501-001
          </p>
        </div>
      )}

      {searchLotNo && isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">조회 중...</span>
        </div>
      )}

      {searchLotNo && isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="font-semibold text-red-700">조회 실패</p>
          <p className="mt-1 text-sm text-red-500">
            {(error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
              `LOT 번호 "${searchLotNo}"에 해당하는 이력을 찾을 수 없습니다.`}
          </p>
        </div>
      )}

      {timeline && (
        <div className="space-y-6">
          {/* 요약 카드 */}
          <SummaryCard timeline={timeline} />

          {/* 타임라인 섹션 헤더 */}
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-800">추적 타임라인</h2>
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">총 {timeline.timeline.length}건</span>
          </div>

          {/* 타임라인 */}
          {timeline.timeline.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">이력 데이터가 없습니다.</div>
          ) : (
            <div className="pl-0">
              {timeline.timeline.map((trace, idx) => (
                <TimelineItem
                  key={trace.id}
                  trace={trace}
                  isLast={idx === timeline.timeline.length - 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
