'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { kpiApi } from '@/lib/api'
import type { InventoryKpi } from '@/types/kpi'
import { cn } from '@/lib/utils'

function AlertRow({ name, qty, unit, className }: { name: string; qty: number; unit: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between rounded-md px-3 py-2', className)}>
      <span className="text-sm font-medium text-gray-800">{name}</span>
      <span className="text-sm font-semibold">
        {qty.toLocaleString()} {unit}
      </span>
    </div>
  )
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn('mb-2 flex items-center gap-2 rounded-md px-3 py-1.5', color)}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{count}건</span>
    </div>
  )
}

export default function InventoryAlertCard() {
  const { data, isLoading, isError } = useQuery<InventoryKpi>(
    ['kpi-inventory'],
    async () => {
      const res = await kpiApi.getInventory()
      return res.data
    },
    { staleTime: 60_000 }
  )

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="font-semibold text-gray-900">재고 경고</h2>
        <p className="mt-0.5 text-xs text-gray-500">부족 / 유통기한 임박 항목</p>
      </div>

      {/* 재고 요약 */}
      <div className="grid grid-cols-2 gap-3 px-6 pt-4">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">원자재 총 재고</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {(data?.material_stock_total ?? 0).toLocaleString()} kg
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">완제품 총 재고</p>
          <p className="mt-1 text-lg font-bold text-gray-900">
            {(data?.product_stock_total ?? 0).toLocaleString()} kg
          </p>
        </div>
      </div>

      <div className="space-y-4 px-6 pb-6 pt-4">
        {isLoading && (
          <p className="text-center text-sm text-gray-400">로딩 중...</p>
        )}
        {isError && (
          <p className="text-center text-sm text-red-500">데이터를 불러오지 못했습니다</p>
        )}

        {!isLoading && !isError && (
          <>
            {/* 재고 부족 경고 */}
            <div>
              <SectionHeader
                label="재고 부족"
                count={data?.low_stock_items.length ?? 0}
                color="bg-red-50 text-red-700"
              />
              {data?.low_stock_items.length === 0 ? (
                <p className="px-3 text-xs text-gray-400">부족 항목 없음</p>
              ) : (
                <div className="space-y-1">
                  {data?.low_stock_items.map((item, i) => (
                    <AlertRow
                      key={i}
                      name={item.material_name}
                      qty={item.current_qty}
                      unit={item.unit}
                      className="bg-red-50/60"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 유통기한 임박 경고 */}
            <div>
              <SectionHeader
                label="유통기한 임박"
                count={data?.expiry_warning_items.length ?? 0}
                color="bg-orange-50 text-orange-700"
              />
              {data?.expiry_warning_items.length === 0 ? (
                <p className="px-3 text-xs text-gray-400">임박 항목 없음</p>
              ) : (
                <div className="space-y-1">
                  {data?.expiry_warning_items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-md bg-orange-50/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.material_name}</p>
                        <p className="text-xs text-orange-600">유통기한: {item.expiry_date}</p>
                      </div>
                      <span className="text-sm font-semibold">{item.qty.toLocaleString()} kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
