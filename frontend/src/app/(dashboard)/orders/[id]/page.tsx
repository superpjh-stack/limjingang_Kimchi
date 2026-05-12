'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderApi } from '@/lib/api'
import { formatDate, formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import OrderStatusBadge from '@/components/features/orders/OrderStatusBadge'
import type { OrderHistoryEntry } from '@/types/order'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const orderId = Number(params.id)

  const [activeTab, setActiveTab] = useState<'detail' | 'history'>('detail')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => orderApi.getById(orderId),
    enabled: !!orderId,
  })

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['orders', orderId, 'history'],
    queryFn: () => orderApi.getHistory(orderId),
    enabled: !!orderId && activeTab === 'history',
  })

  const order = (data as { data?: { data?: ReturnType<typeof Object> } })?.data
  const history: OrderHistoryEntry[] =
    (historyData as { data?: { data?: OrderHistoryEntry[] } })?.data?.data ?? []

  const confirmMutation = useMutation({
    mutationFn: (id: number) => orderApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowConfirm(false)
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => orderApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCancel(false)
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="text-center text-gray-400">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="p-6">
        <p className="text-sm text-danger">수주 정보를 불러올 수 없습니다.</p>
        <Button variant="ghost" icon={<ArrowLeftIcon className="h-4 w-4" />} onClick={() => router.back()} className="mt-3">
          목록으로
        </Button>
      </div>
    )
  }

  const typedOrder = order as {
    id: number
    order_no: string
    customer_name: string
    status: string
    order_date: string
    delivery_date: string
    order_type: string
    delivery_address?: string
    remark?: string
    confirmed_at?: string
    confirmed_by?: string
    total_qty: number
    total_amount: number
    details: {
      id: number
      product_name: string
      order_qty: number
      unit_price: number
      amount: number
      delivery_date: string
      shipped_qty: number
      notes?: string
    }[]
  }

  const ORDER_TYPE_LABEL: Record<string, string> = {
    HOMESHOPPING: '홈쇼핑',
    GENERAL: '일반',
  }

  const canConfirm = typedOrder.status === 'DRAFT'
  const canCancel = typedOrder.status === 'DRAFT' || typedOrder.status === 'CONFIRMED'

  return (
    <div className="p-6">
      <PageHeader
        title={`수주 상세 — ${typedOrder.order_no}`}
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '수주관리', href: '/orders' },
          { label: typedOrder.order_no },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeftIcon className="h-4 w-4" />}
              onClick={() => router.back()}
            >
              목록
            </Button>
            {canConfirm && (
              <Button
                variant="primary"
                size="sm"
                icon={<CheckCircleIcon className="h-4 w-4" />}
                onClick={() => setShowConfirm(true)}
              >
                수주 확정
              </Button>
            )}
            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                icon={<XCircleIcon className="h-4 w-4" />}
                onClick={() => setShowCancel(true)}
              >
                취소 처리
              </Button>
            )}
          </div>
        }
      />

      {/* 기본정보 카드 */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">기본정보</h2>
          <OrderStatusBadge status={typedOrder.status as import('@/types/order').OrderStatus} />
        </div>
        <div className="grid grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <span className="text-xs font-medium text-gray-500">수주번호</span>
            <p className="mt-0.5 font-mono font-semibold text-primary">{typedOrder.order_no}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">거래처</span>
            <p className="mt-0.5 font-medium text-gray-800">{typedOrder.customer_name}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">수주유형</span>
            <p className="mt-0.5 text-gray-700">
              {ORDER_TYPE_LABEL[typedOrder.order_type] ?? typedOrder.order_type}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">수주일</span>
            <p className="mt-0.5 text-gray-700">{formatDate(typedOrder.order_date)}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">납기일</span>
            <p className="mt-0.5 text-gray-700">{formatDate(typedOrder.delivery_date)}</p>
          </div>
          {typedOrder.confirmed_at && (
            <div>
              <span className="text-xs font-medium text-gray-500">확정일시</span>
              <p className="mt-0.5 text-gray-700">{formatDateTime(typedOrder.confirmed_at)}</p>
            </div>
          )}
          {typedOrder.delivery_address && (
            <div className="col-span-3">
              <span className="text-xs font-medium text-gray-500">납품처 주소</span>
              <p className="mt-0.5 text-gray-700">{typedOrder.delivery_address}</p>
            </div>
          )}
          {typedOrder.remark && (
            <div className="col-span-3">
              <span className="text-xs font-medium text-gray-500">비고</span>
              <p className="mt-0.5 text-gray-700">{typedOrder.remark}</p>
            </div>
          )}
        </div>

        {/* 합계 */}
        <div className="mt-4 flex items-center justify-end gap-8 border-t border-gray-100 pt-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">총수량</p>
            <p className="text-lg font-bold text-gray-800">
              {typedOrder.total_qty.toLocaleString('ko-KR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">총금액</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(typedOrder.total_amount)}</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('detail')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'detail'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          상세 라인
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
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
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">제품명</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600">수주수량</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600">단가</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600">금액</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-600">납기일</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600">출하수량</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {typedOrder.details.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{d.product_name}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-700">
                    {d.order_qty.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-700">
                    {formatCurrency(d.unit_price)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-gray-800">
                    {formatCurrency(d.amount)}
                  </td>
                  <td className="px-5 py-3 text-center text-sm text-gray-700">
                    {formatDate(d.delivery_date)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-700">
                    {d.shipped_qty.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{d.notes ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {historyLoading ? (
            <p className="py-8 text-center text-sm text-gray-400">불러오는 중...</p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">변경이력이 없습니다.</p>
          ) : (
            <ol className="relative ml-2 border-l border-gray-200">
              {history.map((h) => (
                <li key={h.id} className="mb-6 ml-6">
                  <div className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-white bg-primary" />
                  <time className="mb-1 text-xs text-gray-400">{formatDateTime(h.changed_at)}</time>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{h.action}</Badge>
                    {h.before_status && h.after_status && (
                      <span className="text-xs text-gray-500">
                        {h.before_status} → {h.after_status}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">처리자: {h.changed_by}</p>
                  {h.note && <p className="mt-0.5 text-xs text-gray-600">{h.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => confirmMutation.mutate(orderId)}
        title="수주 확정"
        message={`수주번호 ${typedOrder.order_no}을(를) 확정하시겠습니까?`}
        confirmText="확정"
        confirmVariant="primary"
        loading={confirmMutation.isPending}
      />

      <ConfirmModal
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={() => cancelMutation.mutate(orderId)}
        title="수주 취소"
        message={`수주번호 ${typedOrder.order_no}을(를) 취소하시겠습니까?`}
        confirmText="취소 처리"
        confirmVariant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
