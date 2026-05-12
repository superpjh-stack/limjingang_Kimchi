'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionPlanApi, productApi } from '@/lib/api'
import { formatDate, getErrorMessage } from '@/lib/utils'
import Table, { Pagination } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import { ConfirmModal } from '@/components/ui/Modal'
import { PlanStatusBadge } from './PlanStatusBadge'
import type { ProductionPlan, PlanStatus, ProductionPlanListParams } from '@/types/production'
import type { Column } from '@/types/common'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { label: '전체 상태', value: '' },
  { label: '임시저장', value: 'DRAFT' },
  { label: '확정', value: 'CONFIRMED' },
  { label: '진행중', value: 'IN_PROGRESS' },
  { label: '완료', value: 'COMPLETED' },
  { label: '취소', value: 'CANCELLED' },
]

const PLAN_TYPE_LABEL: Record<string, string> = {
  DAILY: '일별',
  WEEKLY: '주별',
}

interface AchievementBarProps {
  planned: number
  actual: number
}

function AchievementBar({ planned, actual }: AchievementBarProps) {
  const rate = planned > 0 ? Math.min(Math.round((actual / planned) * 100), 100) : 0
  const color =
    rate >= 100 ? 'bg-success' : rate >= 70 ? 'bg-primary' : rate >= 40 ? 'bg-warning' : 'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600">{rate}%</span>
    </div>
  )
}

interface ProductionPlanListProps {
  onClickNew: () => void
}

export default function ProductionPlanList({ onClickNew }: ProductionPlanListProps) {
  const queryClient = useQueryClient()
  const [params, setParams] = useState<ProductionPlanListParams>({ page: 1, limit: 20 })
  const [confirmTarget, setConfirmTarget] = useState<ProductionPlan | null>(null)
  const [workOrderTarget, setWorkOrderTarget] = useState<ProductionPlan | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['production-plans', params],
    queryFn: () => productionPlanApi.getList(params),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 500 }],
    queryFn: () => productApi.getList({ limit: 500 }),
  })

  const products = (productsData as { data?: { data?: { id: number; product_name: string }[] } })?.data?.data ?? []
  const productOptions = [
    { label: '전체 제품', value: '' },
    ...products.map((p: { id: number; product_name: string }) => ({
      label: p.product_name,
      value: String(p.id),
    })),
  ]

  const confirmMutation = useMutation({
    mutationFn: (id: number) => productionPlanApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      setConfirmTarget(null)
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const createWorkOrdersMutation = useMutation({
    mutationFn: (id: number) => productionPlanApi.createWorkOrders(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      setWorkOrderTarget(null)
      alert('작업지시가 생성되었습니다.')
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const plans: ProductionPlan[] =
    (data as { data?: { data?: ProductionPlan[]; items?: ProductionPlan[] } })?.data?.data ??
    (data as { data?: { items?: ProductionPlan[] } })?.data?.items ?? []
  const total: number =
    (data as { data?: { total?: number; pagination?: { total?: number } } })?.data?.total ??
    (data as { data?: { pagination?: { total?: number } } })?.data?.pagination?.total ?? 0
  const totalPages = Math.ceil(total / (params.limit ?? 20))

  const columns: Column<ProductionPlan>[] = [
    {
      key: 'plan_no',
      title: '계획번호',
      width: 130,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-primary">{String(val)}</span>
      ),
    },
    {
      key: 'plan_date',
      title: '계획일',
      width: 100,
      render: (val) => formatDate(String(val)),
    },
    {
      key: 'order_no',
      title: '연계수주',
      width: 120,
      render: (val) =>
        val ? (
          <span className="font-mono text-xs text-gray-600">{String(val)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    { key: 'product_name', title: '제품명', width: 180 },
    {
      key: 'planned_qty',
      title: '계획수량',
      width: 90,
      align: 'right',
      render: (val) => <span>{Number(val).toLocaleString('ko-KR')}</span>,
    },
    {
      key: 'actual_qty',
      title: '실적수량',
      width: 90,
      align: 'right',
      render: (val) => <span>{Number(val).toLocaleString('ko-KR')}</span>,
    },
    {
      key: 'id',
      title: '달성률',
      width: 130,
      render: (_, record) => (
        <AchievementBar planned={record.planned_qty} actual={record.actual_qty} />
      ),
    },
    {
      key: 'status',
      title: '상태',
      width: 90,
      align: 'center',
      render: (val) => <PlanStatusBadge status={val as PlanStatus} />,
    },
    {
      key: 'plan_type',
      title: '계획유형',
      width: 80,
      align: 'center',
      render: (val) => (
        <span className="text-xs text-gray-600">{PLAN_TYPE_LABEL[String(val)] ?? String(val)}</span>
      ),
    },
    {
      key: 'id',
      title: '액션',
      width: 160,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1.5">
          {(record.status === 'DRAFT') && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmTarget(record)
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              확정
            </button>
          )}
          {record.status === 'CONFIRMED' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setWorkOrderTarget(record)
              }}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-success hover:bg-success-50 transition-colors"
            >
              <ClipboardDocumentListIcon className="h-3.5 w-3.5" />
              작업지시
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="w-40">
          <Select
            label="상태"
            value={params.status ?? ''}
            options={STATUS_OPTIONS}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                status: (e.target.value as PlanStatus) || undefined,
                page: 1,
              }))
            }
          />
        </div>
        <div className="w-40">
          <Input
            label="계획일 시작"
            type="date"
            value={params.date_from ?? ''}
            onChange={(e) =>
              setParams((prev) => ({ ...prev, date_from: e.target.value || undefined, page: 1 }))
            }
          />
        </div>
        <div className="w-40">
          <Input
            label="계획일 종료"
            type="date"
            value={params.date_to ?? ''}
            onChange={(e) =>
              setParams((prev) => ({ ...prev, date_to: e.target.value || undefined, page: 1 }))
            }
          />
        </div>
        <div className="w-48">
          <Select
            label="제품"
            value={params.product_id ? String(params.product_id) : ''}
            options={productOptions}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                product_id: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
          />
        </div>
        <Button
          variant="secondary"
          icon={<MagnifyingGlassIcon className="h-4 w-4" />}
          onClick={() => setParams((prev) => ({ ...prev, page: 1 }))}
        >
          검색
        </Button>
        <div className="ml-auto">
          <Button
            variant="primary"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={onClickNew}
          >
            계획 등록
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table
          columns={columns}
          data={plans}
          loading={isLoading}
          emptyText="생산계획 데이터가 없습니다."
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

      {/* 계획 확정 확인 */}
      <ConfirmModal
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && confirmMutation.mutate(confirmTarget.id)}
        title="생산계획 확정"
        message={`계획번호 ${confirmTarget?.plan_no}을(를) 확정하시겠습니까?`}
        confirmText="확정"
        confirmVariant="primary"
        loading={confirmMutation.isPending}
      />

      {/* 작업지시 생성 확인 */}
      <ConfirmModal
        isOpen={!!workOrderTarget}
        onClose={() => setWorkOrderTarget(null)}
        onConfirm={() => workOrderTarget && createWorkOrdersMutation.mutate(workOrderTarget.id)}
        title="작업지시 생성"
        message={`계획번호 ${workOrderTarget?.plan_no}에 대한 작업지시를 생성하시겠습니까?`}
        confirmText="생성"
        confirmVariant="primary"
        loading={createWorkOrdersMutation.isPending}
      />
    </div>
  )
}
