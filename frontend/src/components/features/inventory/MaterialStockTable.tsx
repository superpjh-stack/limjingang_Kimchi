'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { inventoryApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { MaterialStockSummary } from '@/types/inventory'

interface MaterialStockTableProps {
  onReceive?: () => void
  onIssue?: (materialId: number, materialName: string) => void
}

export default function MaterialStockTable({ onReceive, onIssue }: MaterialStockTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const { data, isLoading, error } = useQuery({
    queryKey: ['inventory', 'material-stock'],
    queryFn: () => inventoryApi.getMaterialStock(),
  })

  const stocks: MaterialStockSummary[] =
    (data as { data?: { data?: MaterialStockSummary[] } })?.data?.data ?? []

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
        <span className="ml-3 text-sm text-gray-500">재고 현황 불러오는 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-danger">재고 데이터를 불러오지 못했습니다.</p>
      </div>
    )
  }

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">등록된 재고가 없습니다.</p>
        <Button variant="primary" className="mt-4" onClick={onReceive}>
          입고 등록하기
        </Button>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-8 px-3 py-3"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">자재명</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">자재코드</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">총 재고</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">단위</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">상태</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {stocks.map((stock) => {
            const isExpanded = expandedRows.has(stock.raw_material_id)
            return (
              <React.Fragment key={stock.raw_material_id}>
                <tr
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRow(stock.raw_material_id)}
                >
                  <td className="px-3 py-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {stock.raw_material_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{stock.raw_material_code}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    <span className={stock.total_qty === 0 ? 'text-danger' : ''}>
                      {stock.total_qty.toLocaleString('ko-KR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{stock.unit}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {stock.total_qty === 0 && (
                        <Badge variant="danger" dot>재고없음</Badge>
                      )}
                      {stock.low_stock && stock.total_qty > 0 && (
                        <Badge variant="danger" dot>재고부족</Badge>
                      )}
                      {stock.expiry_warning && (
                        <Badge variant="warning" dot>유통기한임박</Badge>
                      )}
                      {!stock.low_stock && !stock.expiry_warning && stock.total_qty > 0 && (
                        <Badge variant="success" dot>정상</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className="flex justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onReceive}
                      >
                        입고
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onIssue?.(stock.raw_material_id, stock.raw_material_name)}
                      >
                        출고
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && stock.warehouse_breakdown.length > 0 && (
                  <tr>
                    <td colSpan={7} className="bg-gray-50 px-4 pb-3 pt-0">
                      <div className="ml-8 mt-2">
                        <p className="mb-2 text-xs font-semibold text-gray-500">창고별 재고</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {stock.warehouse_breakdown.map((wb) => (
                            <div
                              key={wb.warehouse_name}
                              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                            >
                              <span className="text-xs text-gray-600">{wb.warehouse_name}</span>
                              <span className="text-xs font-semibold text-gray-900">
                                {wb.qty.toLocaleString('ko-KR')} {stock.unit}
                              </span>
                            </div>
                          ))}
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
