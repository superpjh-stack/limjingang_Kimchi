'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workOrderApi } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/utils'
import Table, { Pagination } from '@/components/ui/Table'
import Input, { Select } from '@/components/ui/Input'
import { WorkOrderStatusBadge } from './PlanStatusBadge'
import type { WorkOrder, WorkOrderStatus, WorkOrderListParams } from '@/types/production'
import type { Column } from '@/types/common'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'

const STATUS_OPTIONS = [
  { label: '전체 상태', value: '' },
  { label: '발행', value: 'ISSUED' },
  { label: '진행', value: 'IN_PROGRESS' },
  { label: '중단', value: 'PAUSED' },
  { label: '완료', value: 'COMPLETED' },
  { label: '취소', value: 'CANCELLED' },
]

interface WorkOrderListProps {
  productionPlanId?: number
}

export default function WorkOrderList({ productionPlanId }: WorkOrderListProps) {
  const [params, setParams] = useState<WorkOrderListParams>({
    page: 1,
    limit: 20,
    production_plan_id: productionPlanId,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['work-orders', params],
    queryFn: () => workOrderApi.getList(params),
  })

  const workOrders: WorkOrder[] =
    (data as { data?: { data?: WorkOrder[]; items?: WorkOrder[] } })?.data?.data ??
    (data as { data?: { items?: WorkOrder[] } })?.data?.items ?? []
  const total: number =
    (data as { data?: { total?: number; pagination?: { total?: number } } })?.data?.total ??
    (data as { data?: { pagination?: { total?: number } } })?.data?.pagination?.total ?? 0
  const totalPages = Math.ceil(total / (params.limit ?? 20))

  const columns: Column<WorkOrder>[] = [
    {
      key: 'work_order_no',
      title: '작업지시번호',
      width: 150,
      render: (val) => (
        <span className="font-mono text-xs font-semibold text-primary">{String(val)}</span>
      ),
    },
    { key: 'product_name', title: '제품', width: 180 },
    {
      key: 'process_name',
      title: '공정',
      width: 120,
      render: (val) => val ? String(val) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'equipment_name',
      title: '설비',
      width: 120,
      render: (val) => val ? String(val) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'assigned_user_name',
      title: '담당자',
      width: 100,
      render: (val) => val ? String(val) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'work_date',
      title: '작업일',
      width: 100,
      render: (val) => formatDate(String(val)),
    },
    {
      key: 'planned_qty',
      title: '지시수량',
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
      key: 'defect_qty',
      title: '불량수량',
      width: 90,
      align: 'right',
      render: (val) => (
        <span className={Number(val) > 0 ? 'font-medium text-danger' : 'text-gray-500'}>
          {Number(val).toLocaleString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'status',
      title: '상태',
      width: 90,
      align: 'center',
      render: (val) => <WorkOrderStatusBadge status={val as WorkOrderStatus} />,
    },
    {
      key: 'lot_no',
      title: 'LOT NO',
      width: 120,
      render: (val) =>
        val ? (
          <span className="font-mono text-xs text-gray-600">{String(val)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ]

  return (
    <div className="space-y-4">
      {/* 필터 (독립 페이지로 사용될 때만 전체 필터 표시) */}
      {!productionPlanId && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="w-40">
            <Select
              label="상태"
              value={params.status ?? ''}
              options={STATUS_OPTIONS}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  status: (e.target.value as WorkOrderStatus) || undefined,
                  page: 1,
                }))
              }
            />
          </div>
          <div className="w-40">
            <Input
              label="작업일 시작"
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
              label="작업일 종료"
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
            onClick={() => setParams((prev) => ({ ...prev, page: 1 }))}
          >
            검색
          </Button>
        </div>
      )}

      {/* 테이블 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <Table
          columns={columns}
          data={workOrders}
          loading={isLoading}
          emptyText="작업지시 데이터가 없습니다."
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
    </div>
  )
}
