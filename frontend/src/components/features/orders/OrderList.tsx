'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderApi } from '@/lib/api'
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils'
import Table, { Pagination } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/Modal'
import OrderStatusBadge from './OrderStatusBadge'
import type { Order, OrderStatus, OrderListParams } from '@/types/order'
import type { Column } from '@/types/common'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'

const STATUS_OPTIONS = [
  { label: '전체 상태', value: '' },
  { label: '임시저장', value: 'DRAFT' },
  { label: '확정', value: 'CONFIRMED' },
  { label: '생산중', value: 'IN_PRODUCTION' },
  { label: '출하', value: 'SHIPPED' },
  { label: '완료', value: 'COMPLETED' },
  { label: '취소', value: 'CANCELLED' },
]

const ORDER_TYPE_LABEL: Record<string, string> = {
  HOMESHOPPING: '홈쇼핑',
  GENERAL: '일반',
}

interface OrderListProps {
  onClickNew: () => void
  onClickDetail: (order: Order) => void
}

export default function OrderList({ onClickNew, onClickDetail }: OrderListProps) {
  const queryClient = useQueryClient()

  const [params, setParams] = useState<OrderListParams>({ page: 1, limit: 20 })
  const [customerSearch, setCustomerSearch] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<Order | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderApi.getList(params),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: number) => orderApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setConfirmTarget(null)
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      orderApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setCancelTarget(null)
      setCancelReason('')
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const handleSearch = () => {
    setParams((prev) => ({
      ...prev,
      customer_name: customerSearch || undefined,
      page: 1,
    }))
  }

  const orders: Order[] = (data as { data?: { data?: Order[]; items?: Order[] } })?.data?.data ??
    (data as { data?: { items?: Order[] } })?.data?.items ?? []
  const total: number =
    (data as { data?: { total?: number; pagination?: { total?: number } } })?.data?.total ??
    (data as { data?: { pagination?: { total?: number } } })?.data?.pagination?.total ?? 0
  const totalPages = Math.ceil(total / (params.limit ?? 20))

  const columns: Column<Order>[] = [
    {
      key: 'order_no',
      title: '수주번호',
      width: 140,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-primary">{String(val)}</span>
      ),
    },
    { key: 'customer_name', title: '거래처명', width: 160 },
    {
      key: 'order_date',
      title: '수주일',
      width: 100,
      render: (val) => formatDate(String(val)),
    },
    {
      key: 'delivery_date',
      title: '납기일',
      width: 100,
      render: (val) => formatDate(String(val)),
    },
    {
      key: 'order_type',
      title: '수주유형',
      width: 90,
      align: 'center',
      render: (val) => (
        <span className="text-xs text-gray-600">
          {ORDER_TYPE_LABEL[String(val)] ?? String(val)}
        </span>
      ),
    },
    {
      key: 'status',
      title: '상태',
      width: 100,
      align: 'center',
      render: (val) => <OrderStatusBadge status={val as OrderStatus} />,
    },
    {
      key: 'total_qty',
      title: '총수량',
      width: 90,
      align: 'right',
      render: (val) => <span>{Number(val).toLocaleString('ko-KR')}</span>,
    },
    {
      key: 'total_amount',
      title: '총금액',
      width: 130,
      align: 'right',
      render: (val) => (
        <span className="font-medium">{formatCurrency(Number(val))}</span>
      ),
    },
    {
      key: 'id',
      title: '액션',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClickDetail(record)
            }}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            title="상세보기"
          >
            <EyeIcon className="h-3.5 w-3.5" />
            상세
          </button>
          {record.status === 'DRAFT' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmTarget(record)
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
              title="확정"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              확정
            </button>
          )}
          {(record.status === 'DRAFT' || record.status === 'CONFIRMED') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCancelTarget(record)
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-danger hover:bg-danger-50 transition-colors"
              title="취소"
            >
              <XCircleIcon className="h-3.5 w-3.5" />
              취소
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="w-40">
          <Select
            label="상태"
            value={params.status ?? ''}
            options={STATUS_OPTIONS}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                status: (e.target.value as OrderStatus) || undefined,
                page: 1,
              }))
            }
          />
        </div>
        <div className="w-48">
          <Input
            label="거래처"
            placeholder="거래처명 검색"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="w-40">
          <Input
            label="수주일 시작"
            type="date"
            value={params.date_from ?? ''}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                date_from: e.target.value || undefined,
                page: 1,
              }))
            }
          />
        </div>
        <div className="w-40">
          <Input
            label="수주일 종료"
            type="date"
            value={params.date_to ?? ''}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                date_to: e.target.value || undefined,
                page: 1,
              }))
            }
          />
        </div>
        <Button
          variant="secondary"
          icon={<MagnifyingGlassIcon className="h-4 w-4" />}
          onClick={handleSearch}
        >
          검색
        </Button>
        <div className="ml-auto">
          <Button
            variant="primary"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={onClickNew}
          >
            신규 수주
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table
          columns={columns}
          data={orders}
          loading={isLoading}
          emptyText="수주 데이터가 없습니다."
          onRowClick={onClickDetail}
          rowKey="id"
        />
        {total > 0 && (
          <div className="border-t border-gray-200">
            <Pagination
              currentPage={params.page ?? 1}
              totalPages={totalPages}
              totalItems={total}
              pageSize={params.limit ?? 20}
              onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </div>

      {/* 확정 확인 모달 */}
      <ConfirmModal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && confirmMutation.mutate(confirmTarget.id)}
        title="수주 확정"
        message={`수주번호 ${confirmTarget?.order_no}을(를) 확정하시겠습니까? 확정 후에는 수정이 제한됩니다.`}
        confirmText="확정"
        confirmVariant="primary"
        loading={confirmMutation.isPending}
      />

      {/* 취소 확인 모달 */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null)
          setCancelReason('')
        }}
        onConfirm={() =>
          cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason })
        }
        title="수주 취소"
        message={`수주번호 ${cancelTarget?.order_no}을(를) 취소하시겠습니까?`}
        confirmText="취소 처리"
        confirmVariant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
