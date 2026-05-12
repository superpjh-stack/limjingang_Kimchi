'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { workOrderApi } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import type { WorkOrder } from '@/types/production'

interface QcRecord {
  id: number
  work_order_id: number
  work_order_no?: string
  lot_no: string
  process_name?: string
  measured_value: number
  unit: string
  is_pass: boolean
  action_taken?: string
  inspector_name?: string
  created_at: string
}

export default function QcRecordList() {
  const [filters, setFilters] = useState({
    lot_no: '',
    is_pass: '',
    date_from: '',
    date_to: '',
  })

  // 작업지시 목록에서 QC 기록을 집계 (API 설계에 따라 엔드포인트 변경 가능)
  const { data: workOrderData, isLoading } = useQuery({
    queryKey: ['work-orders', 'qc-records'],
    queryFn: () =>
      workOrderApi.getList({
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        limit: 200,
      }),
  })

  // 서버에서 QC 기록이 별도 엔드포인트로 제공될 경우 대체 가능
  // 현재는 작업지시 내 qc_records 필드 또는 별도 엔드포인트를 기다리는 placeholder
  const workOrders: WorkOrder[] =
    (workOrderData as { data?: { data?: WorkOrder[] } })?.data?.data ?? []

  const inputClass =
    'rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200'

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-4">
        <input
          className={inputClass}
          placeholder="LOT번호 검색"
          value={filters.lot_no}
          onChange={(e) => setFilters((f) => ({ ...f, lot_no: e.target.value }))}
        />
        <select
          className={inputClass}
          value={filters.is_pass}
          onChange={(e) => setFilters((f) => ({ ...f, is_pass: e.target.value }))}
        >
          <option value="">전체</option>
          <option value="true">합격</option>
          <option value="false">불합격</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            className={inputClass}
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
          />
          <span className="text-sm text-gray-400">~</span>
          <input
            className={inputClass}
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
          />
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-500">불러오는 중...</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">작업지시번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">LOT번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">제품명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">공정</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">계획수량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">실적수량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">불량수량</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">작업일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {workOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                    조회된 QC 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                      {wo.work_order_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{wo.lot_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{wo.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {wo.process_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {wo.planned_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {wo.actual_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={wo.defect_qty > 0 ? 'text-danger font-semibold' : 'text-gray-500'}>
                        {wo.defect_qty.toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{wo.work_date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
