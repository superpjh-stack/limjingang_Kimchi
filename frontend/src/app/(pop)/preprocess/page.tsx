'use client'

import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { processRecordApi } from '@/lib/api'
import PreprocessRecordForm from '@/components/pop/process/PreprocessRecordForm'

interface PreprocessRecord {
  id: number
  raw_material_name: string
  receive_date: string
  input_weight: number
  reject_weight: number
  pass_weight: number
  storage_temp: number
  foreign_matter_removed: boolean
  pre_washed: boolean
  created_at: string
}

export default function PreprocessPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const today = new Date().toISOString().slice(0, 10)

  const { data: historyData, isLoading: historyLoading } = useQuery(
    ['preprocess-history', today, refreshKey],
    () =>
      processRecordApi.getSummary({
        date_from: today,
        date_to: today,
        process_type: 'preprocess',
      }),
    { staleTime: 30_000 }
  )

  const records: PreprocessRecord[] =
    (historyData?.data as PreprocessRecord[]) ?? []

  const handleSaved = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">입고전처리</h1>
        <p className="mt-1 text-base text-gray-500">
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
      </div>

      {/* 입고전처리 폼 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-gray-800">입고전처리 기록 입력</h2>
        <PreprocessRecordForm onSaved={handleSaved} />
      </div>

      {/* 오늘 이력 테이블 */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800">오늘 입고전처리 이력</h2>

        {historyLoading && (
          <div className="flex h-32 items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
          </div>
        )}

        {!historyLoading && records.length === 0 && (
          <p className="py-8 text-center text-gray-400">오늘 입력된 기록이 없습니다</p>
        )}

        {!historyLoading && records.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-4 font-semibold">원재료</th>
                  <th className="pb-2 pr-4 font-semibold">투입</th>
                  <th className="pb-2 pr-4 font-semibold">불합격</th>
                  <th className="pb-2 pr-4 font-semibold">합격</th>
                  <th className="pb-2 pr-4 font-semibold">보관온도</th>
                  <th className="pb-2 font-semibold">이물질/세척</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-gray-800">{r.raw_material_name}</td>
                    <td className="py-3 pr-4 text-gray-700">{r.input_weight} kg</td>
                    <td className="py-3 pr-4 text-red-600">{r.reject_weight} kg</td>
                    <td className="py-3 pr-4 font-semibold text-green-700">{r.pass_weight} kg</td>
                    <td className="py-3 pr-4 text-gray-700">{r.storage_temp}°C</td>
                    <td className="py-3 text-gray-700">
                      <span className={`mr-1 rounded-full px-2 py-0.5 text-xs font-bold ${r.foreign_matter_removed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        이물질{r.foreign_matter_removed ? '완료' : '미실시'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.pre_washed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        세척{r.pre_washed ? '완료' : '미실시'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
