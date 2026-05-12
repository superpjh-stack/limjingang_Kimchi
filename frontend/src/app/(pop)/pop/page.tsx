'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { popApi } from '@/lib/api'
import WorkOrderCard from '@/components/pop/WorkOrderCard'
import type { WorkOrder } from '@/types/production'

export default function PopMainPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const { data, isLoading, isError, refetch } = useQuery(
    ['pop', 'today-work-orders'],
    () => popApi.getTodayWorkOrders(),
    {
      refetchInterval: 30_000,
      staleTime: 30_000,
      select: (res) => res.data as WorkOrder[],
    }
  )

  const startMutation = useMutation(
    (id: number) => popApi.startWork(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pop', 'today-work-orders'])
      },
      onError: () => {
        alert('작업 시작에 실패했습니다. 다시 시도해주세요.')
      },
    }
  )

  const handleStart = (id: number) => {
    if (startMutation.isLoading) return
    startMutation.mutate(id)
  }

  // 공정유형 → 경로 매핑
  const PROCESS_ROUTES: Record<string, string> = {
    'WASHING': 'wash',
    'SALTING': 'salting',
    'SEASONING': 'seasoning',
    'PACKAGING': 'packaging',
    'FERMENTATION': '',
    'QC': '',
  }

  const handleSelect = (id: number, processType?: string) => {
    const route = processType ? (PROCESS_ROUTES[processType] ?? '') : ''
    router.push(route ? `/pop/${id}/${route}` : `/pop/${id}`)
  }

  return (
    <div>
      {/* 날짜 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">오늘의 작업지시</h1>
          <p className="mt-1 text-base text-gray-500">{today}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex h-12 items-center gap-2 rounded-xl border-2 border-gray-300 px-5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          새로고침
        </button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-10 w-10 animate-spin text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
              />
            </svg>
            <p className="text-gray-500">작업지시 목록을 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 */}
      {isError && !isLoading && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center">
          <p className="text-lg font-semibold text-red-700">데이터를 불러오지 못했습니다</p>
          <p className="mt-1 text-sm text-red-500">네트워크 연결을 확인하고 새로고침해주세요.</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 작업지시 없음 */}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white">
          <span className="text-5xl">📋</span>
          <p className="text-lg font-semibold text-gray-600">오늘 발행된 작업지시가 없습니다</p>
          <p className="text-sm text-gray-400">30초마다 자동으로 갱신됩니다</p>
        </div>
      )}

      {/* 작업지시 그리드 */}
      {!isLoading && data && data.length > 0 && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            총 <span className="font-bold text-gray-800">{data.length}</span>건 · 30초마다 자동
            갱신
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.map((wo) => (
              <WorkOrderCard
                key={wo.id}
                workOrder={wo}
                onStart={handleStart}
                onSelect={(id, processType) => handleSelect(id, processType)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
