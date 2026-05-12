'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import type { MaterialReorder } from '@/types/ai_agent'

interface MaterialReorderTableProps {
  data: MaterialReorder[]
}

const UrgencyBadge = ({ urgency }: { urgency: MaterialReorder['urgency'] }) => {
  const map = {
    CRITICAL: { label: '재고부족', cls: 'bg-red-100 text-red-700' },
    HIGH: { label: '7일이내부족', cls: 'bg-orange-100 text-orange-700' },
    MEDIUM: { label: '예비발주', cls: 'bg-yellow-100 text-yellow-700' },
  }
  const { label, cls } = map[urgency]
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export default function MaterialReorderTable({ data }: MaterialReorderTableProps) {
  const router = useRouter()

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">원재료 발주 추천</h3>
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-sm font-medium text-green-700">
            모든 원재료 재고 충분
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">원재료 발주 추천</h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          {data.length}건 부족
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="pb-2 text-left font-medium">자재명</th>
              <th className="pb-2 text-right font-medium">현재재고</th>
              <th className="pb-2 text-right font-medium">필요수량</th>
              <th className="pb-2 text-right font-medium">부족수량</th>
              <th className="pb-2 text-right font-medium">권장발주량</th>
              <th className="pb-2 text-center font-medium">긴급도</th>
              <th className="pb-2 text-center font-medium">조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((item) => (
              <tr key={item.material_id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-gray-800">{item.material_name}</div>
                  <div className="text-xs text-gray-400">{item.material_code}</div>
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-600">
                  {item.current_stock.toLocaleString()} {item.unit}
                </td>
                <td className="py-2.5 pr-3 text-right text-gray-600">
                  {item.required_qty.toLocaleString()} {item.unit}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-red-600">
                  {item.shortage_qty.toLocaleString()} {item.unit}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-gray-800">
                  {item.recommended_order_qty.toLocaleString()} {item.unit}
                </td>
                <td className="py-2.5 text-center">
                  <UrgencyBadge urgency={item.urgency} />
                </td>
                <td className="py-2.5 text-center">
                  <button
                    onClick={() => router.push('/inventory/materials')}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    발주
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
