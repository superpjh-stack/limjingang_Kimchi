'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { inventoryApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import type { ProductStock } from '@/types/inventory'

interface ProductStockGroup {
  product_id: number
  product_name: string
  product_code: string
  total_qty: number
  lots: ProductStock[]
}

function getDaysUntilExpiry(expiryDate?: string): number | null {
  if (!expiryDate) return null
  const diff = new Date(expiryDate).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function ProductStockTable() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'product-stock'],
    queryFn: () => inventoryApi.getProductStock(),
  })

  const rawStocks: ProductStock[] =
    (data as { data?: { data?: ProductStock[] } })?.data?.data ?? []

  // 제품별로 그룹핑
  const grouped = rawStocks.reduce<Record<number, ProductStockGroup>>((acc, stock) => {
    if (!acc[stock.product_id]) {
      acc[stock.product_id] = {
        product_id: stock.product_id,
        product_name: stock.product_name,
        product_code: stock.product_code,
        total_qty: 0,
        lots: [],
      }
    }
    acc[stock.product_id].total_qty += stock.current_qty
    acc[stock.product_id].lots.push(stock)
    return acc
  }, {})

  const groups = Object.values(grouped)

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="h-6 w-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="ml-3 text-sm text-gray-500">완제품 재고 불러오는 중...</span>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">등록된 완제품 재고가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8 px-3 py-3"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">제품명</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">제품코드</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">총 재고수량</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">LOT 수</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {groups.map((group) => {
            const isExpanded = expandedRows.has(group.product_id)
            const hasExpiryWarning = group.lots.some((lot) => {
              const days = getDaysUntilExpiry(lot.expiry_date)
              return days !== null && days <= 30 && days >= 0
            })
            const hasExpired = group.lots.some((lot) => {
              const days = getDaysUntilExpiry(lot.expiry_date)
              return days !== null && days < 0
            })

            return (
              <React.Fragment key={group.product_id}>
                <tr
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRow(group.product_id)}
                >
                  <td className="px-3 py-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {group.product_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{group.product_code}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    <span className={group.total_qty === 0 ? 'text-danger' : ''}>
                      {group.total_qty.toLocaleString('ko-KR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{group.lots.length}개</td>
                  <td className="px-4 py-3">
                    {group.total_qty === 0 ? (
                      <Badge variant="danger" dot>재고없음</Badge>
                    ) : hasExpired ? (
                      <Badge variant="danger" dot>유통기한초과</Badge>
                    ) : hasExpiryWarning ? (
                      <Badge variant="warning" dot>유통기한임박</Badge>
                    ) : (
                      <Badge variant="success" dot>정상</Badge>
                    )}
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50 px-4 pb-3 pt-0">
                      <div className="ml-8 mt-2">
                        <p className="mb-2 text-xs font-semibold text-gray-500">LOT별 상세</p>
                        <div className="overflow-x-auto rounded-md border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">창고</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">LOT번호</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">수량</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">생산일</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">유통기한</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                              {group.lots.map((lot) => {
                                const days = getDaysUntilExpiry(lot.expiry_date)
                                const isWarning = days !== null && days <= 30 && days >= 0
                                const isExpiredLot = days !== null && days < 0

                                return (
                                  <tr key={lot.id}>
                                    <td className="px-3 py-2 text-xs text-gray-600">
                                      {lot.warehouse_name}
                                    </td>
                                    <td className="px-3 py-2 text-xs font-mono text-gray-700">
                                      {lot.lot_no || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right text-xs font-semibold text-gray-900">
                                      {lot.current_qty.toLocaleString('ko-KR')}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500">
                                      {lot.production_date ? formatDate(lot.production_date) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-gray-500">
                                      {lot.expiry_date ? formatDate(lot.expiry_date) : '-'}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isExpiredLot ? (
                                        <Badge variant="danger">만료</Badge>
                                      ) : isWarning ? (
                                        <Badge variant="warning">D-{days}</Badge>
                                      ) : (
                                        <Badge variant="gray">정상</Badge>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
