'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentApi } from '@/lib/api'
import { formatDate, formatCurrency, getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import ShipmentStatusBadge from './ShipmentStatusBadge'
import type { Shipment } from '@/types/inventory'

interface Filters {
  status: string
  customer_name: string
  date_from: string
  date_to: string
}

export default function ShipmentList() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Filters>({
    status: '',
    customer_name: '',
    date_from: '',
    date_to: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['shipments', filters],
    queryFn: () =>
      shipmentApi.getList({
        ...(filters.status && { status: filters.status }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      }),
  })

  const shipments: Shipment[] =
    (data as { data?: { data?: Shipment[] } })?.data?.data ?? []

  const filtered = filters.customer_name
    ? shipments.filter((s) => s.customer_name.includes(filters.customer_name))
    : shipments

  const shipMutation = useMutation({
    mutationFn: (id: number) => shipmentApi.ship(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
    onError: (err) => alert(getErrorMessage(err)),
  })

  const deliverMutation = useMutation({
    mutationFn: (id: number) => shipmentApi.deliver(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
    onError: (err) => alert(getErrorMessage(err)),
  })

  const inputClass =
    'rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200'

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-4">
        <select
          className={inputClass}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">전체 상태</option>
          <option value="READY">준비</option>
          <option value="SHIPPED">출하</option>
          <option value="DELIVERED">완료</option>
          <option value="RETURNED">반품</option>
        </select>
        <input
          className={inputClass}
          placeholder="거래처 검색"
          value={filters.customer_name}
          onChange={(e) => setFilters((f) => ({ ...f, customer_name: e.target.value }))}
        />
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
        {(filters.status || filters.customer_name || filters.date_from || filters.date_to) && (
          <button
            className="text-sm text-primary hover:underline"
            onClick={() =>
              setFilters({ status: '', customer_name: '', date_from: '', date_to: '' })
            }
          >
            초기화
          </button>
        )}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">출하번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">거래처</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">출하일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">수주번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">총수량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">총금액</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                    조회된 출하 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                      {shipment.shipment_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{shipment.customer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(shipment.shipment_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {shipment.order_no || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <ShipmentStatusBadge status={shipment.status} dot />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                      {shipment.total_qty?.toLocaleString('ko-KR') ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      {shipment.total_amount ? formatCurrency(shipment.total_amount) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {shipment.status === 'READY' && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={shipMutation.isPending}
                            onClick={() => {
                              if (confirm('출하를 확정하시겠습니까?')) {
                                shipMutation.mutate(shipment.id)
                              }
                            }}
                          >
                            출하 확정
                          </Button>
                        )}
                        {shipment.status === 'SHIPPED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={deliverMutation.isPending}
                            onClick={() => {
                              if (confirm('배달 완료를 확인하시겠습니까?')) {
                                deliverMutation.mutate(shipment.id)
                              }
                            }}
                          >
                            배달 확인
                          </Button>
                        )}
                      </div>
                    </td>
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
