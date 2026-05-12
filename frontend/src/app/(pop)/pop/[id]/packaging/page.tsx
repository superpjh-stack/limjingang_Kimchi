'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { popApi } from '@/lib/api'
import StatusDisplay from '@/components/pop/StatusDisplay'
import ResultForm from '@/components/pop/ResultForm'
import PackagingRecordForm from '@/components/pop/process/PackagingRecordForm'
import type { WorkOrder, ResultInput } from '@/types/production'

type Tab = 'result' | 'packaging'

export default function PackagingPopPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = Number(params.id)

  const [activeTab, setActiveTab] = useState<Tab>('result')
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [resultSaved, setResultSaved] = useState(false)

  const { data: workOrder, isLoading, isError } = useQuery(
    ['pop', 'work-order', id],
    () => popApi.getWorkOrder(id),
    {
      refetchInterval: 30_000,
      staleTime: 30_000,
      select: (res) => res.data as WorkOrder,
      enabled: !!id && !isNaN(id),
    }
  )

  const startMutation = useMutation(() => popApi.startWork(id), {
    onSuccess: () => queryClient.invalidateQueries(['pop', 'work-order', id]),
    onError: () => alert('작업 시작에 실패했습니다.'),
  })

  const completeMutation = useMutation(() => popApi.completeWork(id), {
    onSuccess: () => {
      queryClient.invalidateQueries(['pop', 'work-order', id])
      queryClient.invalidateQueries(['pop', 'today-work-orders'])
      setShowCompleteDialog(false)
    },
    onError: () => alert('작업 완료 처리에 실패했습니다.'),
  })

  const resultMutation = useMutation(
    (data: ResultInput) => popApi.recordResult(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['pop', 'work-order', id])
        setResultSaved(true)
        setTimeout(() => setResultSaved(false), 3000)
      },
      onError: () => alert('실적 저장에 실패했습니다.'),
    }
  )

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
          </svg>
          <p className="text-gray-500">작업지시 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (isError || !workOrder) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-8 text-center">
        <p className="text-lg font-semibold text-red-700">작업지시를 불러오지 못했습니다</p>
        <button onClick={() => router.push('/pop')} className="mt-4 rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600">
          목록으로
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {resultSaved && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-5 py-3 text-base font-semibold text-green-700">
          실적이 저장되었습니다.
        </div>
      )}

      {/* 작업지시 기본정보 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-sm text-gray-500">{workOrder.work_order_no}</span>
          <span className="rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold text-purple-700">포장 공정</span>
        </div>
        <h1 className="mb-1 text-2xl font-black text-gray-900">{workOrder.product_name}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span>지시수량: <span className="font-semibold text-gray-800">{workOrder.planned_qty.toLocaleString()} kg</span></span>
          <span>작업일: <span className="font-semibold text-gray-800">{workOrder.work_date}</span></span>
          {workOrder.lot_no && <span>LOT: <span className="font-mono font-semibold text-gray-800">{workOrder.lot_no}</span></span>}
        </div>
      </div>

      <StatusDisplay status={workOrder.status} actualQty={workOrder.actual_qty} plannedQty={workOrder.planned_qty} />

      {/* 탭 */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('result')}
            className={`flex-1 py-4 text-base font-bold transition-colors ${
              activeTab === 'result' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            작업실적
          </button>
          <button
            onClick={() => setActiveTab('packaging')}
            className={`flex-1 py-4 text-base font-bold transition-colors ${
              activeTab === 'packaging' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            포장기록
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'result' && (workOrder.status === 'ISSUED' || workOrder.status === 'IN_PROGRESS') && (
            <ResultForm
              plannedQty={workOrder.planned_qty}
              defaultActualQty={workOrder.actual_qty}
              defaultDefectQty={workOrder.defect_qty}
              onSubmit={async (data) => { await resultMutation.mutateAsync(data) }}
              isSubmitting={resultMutation.isLoading}
            />
          )}
          {activeTab === 'result' && workOrder.status !== 'ISSUED' && workOrder.status !== 'IN_PROGRESS' && (
            <p className="py-8 text-center text-gray-500">완료된 작업입니다.</p>
          )}
          {activeTab === 'packaging' && (
            <PackagingRecordForm workOrderId={id} onSaved={() => {}} />
          )}
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="flex flex-wrap gap-3">
        {workOrder.status === 'ISSUED' && (
          <button
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isLoading}
            className="flex h-[60px] flex-1 items-center justify-center rounded-xl bg-green-500 text-lg font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
          >
            {startMutation.isLoading ? '시작 중...' : '작업 시작'}
          </button>
        )}
        {workOrder.status === 'IN_PROGRESS' && (
          <button
            onClick={() => setShowCompleteDialog(true)}
            disabled={completeMutation.isLoading}
            className="flex h-[60px] flex-1 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            작업 완료
          </button>
        )}
        <button onClick={() => router.push('/pop')} className="flex h-[60px] items-center justify-center rounded-xl border-2 border-gray-300 px-8 text-base font-semibold text-gray-600 hover:bg-gray-50">
          목록으로
        </button>
      </div>

      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-black text-gray-900">작업을 완료하시겠습니까?</h3>
            <p className="mb-6 text-sm text-gray-500">
              완료 처리 후에는 상태를 되돌릴 수 없습니다.<br />
              실적수량: <strong className="text-gray-800">{workOrder.actual_qty.toLocaleString()} kg</strong>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowCompleteDialog(false)} className="flex h-[52px] flex-1 items-center justify-center rounded-xl border-2 border-gray-300 text-base font-semibold text-gray-600 hover:bg-gray-50">취소</button>
              <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isLoading} className="flex h-[52px] flex-1 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                {completeMutation.isLoading ? '처리 중...' : '완료 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
