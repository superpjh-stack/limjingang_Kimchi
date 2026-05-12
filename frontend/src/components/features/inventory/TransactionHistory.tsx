'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import type { MaterialTransaction, TransType } from '@/types/inventory'

const TRANS_TYPE_LABEL: Record<TransType, string> = {
  IN: '입고',
  OUT: '출고',
  ADJUST: '조정',
  RETURN: '반품',
}

type BadgeVariant = 'success' | 'danger' | 'warning' | 'gray'

const TRANS_TYPE_VARIANT: Record<TransType, BadgeVariant> = {
  IN: 'success',
  OUT: 'danger',
  ADJUST: 'warning',
  RETURN: 'gray',
}

interface Filters {
  material_name: string
  trans_type: string
  date_from: string
  date_to: string
}

export default function TransactionHistory() {
  const [filters, setFilters] = useState<Filters>({
    material_name: '',
    trans_type: '',
    date_from: '',
    date_to: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'transactions', filters],
    queryFn: () =>
      inventoryApi.getTransactions({
        ...(filters.trans_type && { trans_type: filters.trans_type }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      }),
  })

  const transactions: MaterialTransaction[] =
    (data as { data?: { data?: MaterialTransaction[] } })?.data?.data ?? []

  const filtered = filters.material_name
    ? transactions.filter((t) =>
        t.raw_material_name.includes(filters.material_name)
      )
    : transactions

  const inputClass =
    'rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200'

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-4">
        <input
          className={inputClass}
          placeholder="자재명 검색"
          value={filters.material_name}
          onChange={(e) => setFilters((f) => ({ ...f, material_name: e.target.value }))}
        />
        <select
          className={inputClass}
          value={filters.trans_type}
          onChange={(e) => setFilters((f) => ({ ...f, trans_type: e.target.value }))}
        >
          <option value="">전체 유형</option>
          <option value="IN">입고</option>
          <option value="OUT">출고</option>
          <option value="ADJUST">조정</option>
          <option value="RETURN">반품</option>
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
        {(filters.material_name || filters.trans_type || filters.date_from || filters.date_to) && (
          <button
            className="text-sm text-primary hover:underline"
            onClick={() =>
              setFilters({ material_name: '', trans_type: '', date_from: '', date_to: '' })
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">거래일시</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">자재명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">창고</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">유형</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">거래수량</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">이전재고</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">이후재고</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">LOT번호</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-gray-500">
                    조회된 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDateTime(tx.trans_date)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {tx.raw_material_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.warehouse_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={TRANS_TYPE_VARIANT[tx.trans_type]} dot>
                        {TRANS_TYPE_LABEL[tx.trans_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold">
                      <span
                        className={
                          tx.trans_type === 'IN'
                            ? 'text-success'
                            : tx.trans_type === 'OUT'
                            ? 'text-danger'
                            : 'text-gray-900'
                        }
                      >
                        {tx.trans_type === 'IN' ? '+' : tx.trans_type === 'OUT' ? '-' : ''}
                        {tx.trans_qty.toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {tx.before_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {tx.after_qty.toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.lot_no || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.reason || '-'}</td>
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
