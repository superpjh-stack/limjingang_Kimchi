'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderApi } from '@/lib/api'
import { formatDate, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import OrderStatusBadge from './OrderStatusBadge'
import type { Order, OrderHistoryEntry } from '@/types/order'
import { ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface OrderDetailModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  HOMESHOPPING: '홈쇼핑',
  GENERAL: '일반',
}

export default function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'detail' | 'history'>('detail')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['orders', order?.id, 'history'],
    queryFn: () => orderApi.getHistory(order!.id),
    enabled: !!order?.id && activeTab === 'history',
  })

  const history: OrderHistoryEntry[] =
    (historyData as { data?: { data?: OrderHistoryEntry[] } })?.data?.data ?? []

  const confirmMutation = useMutation({
    mutationFn: (id: number) => orderApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowConfirm(false)
      onClose()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => orderApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCancel(false)
      onClose()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  if (!order) return null

  const canConfirm = order.status === 'DRAFT'
  const canCancel = order.status === 'DRAFT' || order.status === 'CONFIRMED'

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`수주 상세 — ${order.order_no}`}
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="flex gap-2">
              {canConfirm && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowConfirm(true)}
                >
                  수주 확정
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowCancel(true)}
                >
                  취소 처리
                </Button>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              닫기
            </Button>
          </div>
        }
      >
        {/* 기본정보 카드 */}
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-xs font-medium text-gray-500">수주번호</span>
              <p className="mt-0.5 font-mono font-semibold text-primary">{order.order_no}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">거래처</span>
              <p className="mt-0.5 font-medium text-gray-800">{order.customer_name}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">상태</span>
              <div className="mt-0.5">
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">수주일</span>
              <p className="mt-0.5 text-gray-700">{formatDate(order.order_date)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">납기일</span>
              <p className="mt-0.5 text-gray-700">{formatDate(order.delivery_date)}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">수주유형</span>
              <p className="mt-0.5 text-gray-700">
                {ORDER_TYPE_LABEL[order.order_type] ?? order.order_type}
              </p>
            </div>
            {order.delivery_address && (
              <div className="col-span-2">
                <span className="text-xs font-medium text-gray-500">납품처 주소</span>
                <p className="mt-0.5 text-gray-700">{order.delivery_address}</p>
              </div>
            )}
            {order.remark && (
              <div className="col-span-3">
                <span className="text-xs font-medium text-gray-500">비고</span>
                <p className="mt-0.5 text-gray-700">{order.remark}</p>
              </div>
            )}
            {order.confirmed_at && (
              <div className="col-span-3">
                <span className="text-xs font-medium text-gray-500">확정정보</span>
                <p className="mt-0.5 text-gray-600 text-xs">
                  {formatDateTime(order.confirmed_at)} — {order.confirmed_by}
                </p>
              </div>
            )}
          </div>

          {/* 합계 */}
          <div className="mt-3 flex items-center justify-end gap-6 border-t border-gray-200 pt-3">
            <div className="text-right">
              <span className="text-xs text-gray-500">총수량</span>
              <p className="font-semibold text-gray-800">
                {order.total_qty.toLocaleString('ko-KR')}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">총금액</span>
              <p className="text-lg font-bold text-primary">{formatCurrency(order.total_amount)}</p>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div className="mb-3 flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('detail')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'detail'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4" />
            상세 라인
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClockIcon className="h-4 w-4" />
            변경이력
          </button>
        </div>

        {activeTab === 'detail' && (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">제품명</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">수주수량</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">단가</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">금액</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">납기일</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">출하수량</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {order.details.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{d.product_name}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-gray-700">
                      {d.order_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-gray-700">
                      {formatCurrency(d.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-800">
                      {formatCurrency(d.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-sm text-gray-700">
                      {formatDate(d.delivery_date)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-gray-700">
                      {d.shipped_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{d.notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            {historyLoading ? (
              <p className="py-8 text-center text-sm text-gray-400">불러오는 중...</p>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">변경이력이 없습니다.</p>
            ) : (
              <ol className="relative ml-2 border-l border-gray-200">
                {history.map((h) => (
                  <li key={h.id} className="mb-4 ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
                    <time className="mb-1 text-xs font-normal leading-none text-gray-400">
                      {formatDateTime(h.changed_at)}
                    </time>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{h.action}</Badge>
                      {h.before_status && h.after_status && (
                        <span className="text-xs text-gray-500">
                          {h.before_status} → {h.after_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">처리자: {h.changed_by}</p>
                    {h.note && <p className="mt-0.5 text-xs text-gray-600">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => confirmMutation.mutate(order.id)}
        title="수주 확정"
        message={`수주번호 ${order.order_no}을(를) 확정하시겠습니까?`}
        confirmText="확정"
        confirmVariant="primary"
        loading={confirmMutation.isPending}
      />

      <ConfirmModal
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={() => cancelMutation.mutate(order.id)}
        title="수주 취소"
        message={`수주번호 ${order.order_no}을(를) 취소하시겠습니까?`}
        confirmText="취소 처리"
        confirmVariant="danger"
        loading={cancelMutation.isPending}
      />
    </>
  )
}
