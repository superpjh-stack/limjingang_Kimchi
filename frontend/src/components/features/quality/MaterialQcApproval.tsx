'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { inventoryApi } from '@/lib/api'
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils'
import QcStatusBadge from './QcStatusBadge'
import type { MaterialReceive } from '@/types/inventory'

interface ApprovalModalState {
  receive: MaterialReceive | null
  action: 'PASS' | 'FAIL' | null
}

export default function MaterialQcApproval() {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<ApprovalModalState>({ receive: null, action: null })
  const [qcNotes, setQcNotes] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'receive-list', 'PENDING'],
    queryFn: () => inventoryApi.getReceiveList({ qc_status: 'PENDING' }),
  })

  const pendingList: MaterialReceive[] =
    (data as { data?: { data?: MaterialReceive[] } })?.data?.data ?? []

  const qcMutation = useMutation({
    mutationFn: ({ id, qc_status, qc_notes }: { id: number; qc_status: string; qc_notes?: string }) =>
      inventoryApi.updateQcStatus(id, { qc_status, qc_notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'receive-list'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', 'material-stock'] })
      setModal({ receive: null, action: null })
      setQcNotes('')
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const handleConfirm = () => {
    if (!modal.receive || !modal.action) return
    qcMutation.mutate({
      id: modal.receive.id,
      qc_status: modal.action,
      qc_notes: qcNotes || undefined,
    })
  }

  const openModal = (receive: MaterialReceive, action: 'PASS' | 'FAIL') => {
    setModal({ receive, action })
    setQcNotes('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-2 text-sm text-gray-500">검사 대기 목록 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {pendingList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <CheckCircleIcon className="mb-3 h-12 w-12 text-success opacity-50" />
          <p className="text-sm font-medium text-gray-600">검사 대기 중인 입고 건이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">검사 대기</span>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-xs font-bold text-white">
              {pendingList.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">입고번호</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">자재명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">창고</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">입고일</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">수량</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">공급업체</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">LOT번호</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">검사</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {pendingList.map((receive) => (
                  <tr key={receive.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                      {receive.receive_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{receive.raw_material_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{receive.warehouse_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(receive.receive_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {receive.receive_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {receive.amount ? formatCurrency(receive.amount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{receive.supplier || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {receive.lot_no || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <QcStatusBadge status={receive.qc_status} dot />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(receive, 'PASS')}
                          className="inline-flex items-center gap-1 rounded-md bg-success-50 px-2.5 py-1.5 text-xs font-medium text-success-700 hover:bg-success-100 transition-colors"
                        >
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          합격
                        </button>
                        <button
                          onClick={() => openModal(receive, 'FAIL')}
                          className="inline-flex items-center gap-1 rounded-md bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-700 hover:bg-danger-100 transition-colors"
                        >
                          <XCircleIcon className="h-3.5 w-3.5" />
                          불합격
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* 검사 결과 입력 모달 */}
      {modal.receive && modal.action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ receive: null, action: null })} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                입고 검사 {modal.action === 'PASS' ? '합격' : '불합격'} 처리
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">입고번호</span>
                  <span className="font-mono font-medium text-gray-900">{modal.receive.receive_no}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">자재명</span>
                  <span className="font-medium text-gray-900">{modal.receive.raw_material_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">수량</span>
                  <span className="text-gray-900">{modal.receive.receive_qty.toLocaleString('ko-KR')}</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  검사 비고
                </label>
                <textarea
                  rows={3}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
                  placeholder={
                    modal.action === 'FAIL'
                      ? '불합격 사유를 입력하세요'
                      : '합격 비고를 입력하세요 (선택)'
                  }
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setModal({ receive: null, action: null })}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={qcMutation.isPending}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  modal.action === 'PASS'
                    ? 'bg-success hover:bg-success-600'
                    : 'bg-danger hover:bg-danger-600'
                }`}
              >
                {qcMutation.isPending && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {modal.action === 'PASS' ? '합격 확정' : '불합격 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
