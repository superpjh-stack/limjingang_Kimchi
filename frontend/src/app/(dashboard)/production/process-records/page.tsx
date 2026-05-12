'use client'

import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { processRecordApi } from '@/lib/api'

type ProcessType = 'wash' | 'salting' | 'seasoning' | 'packaging' | 'preprocess'

const PROCESS_TABS: { key: ProcessType; label: string }[] = [
  { key: 'wash', label: '세척' },
  { key: 'salting', label: '절임' },
  { key: 'seasoning', label: '양념버무림' },
  { key: 'packaging', label: '포장' },
  { key: 'preprocess', label: '입고전처리' },
]

// CCP 판정 기준 — 탭별
const CCP_FIELDS: Record<ProcessType, Array<{ field: string; label: string; min?: number; max?: number; unit: string }>> = {
  wash: [
    { field: 'water_temp', label: '세척수 온도', min: 1, max: 15, unit: '°C' },
    { field: 'ph', label: 'pH', min: 6.5, max: 8.5, unit: 'pH' },
  ],
  salting: [
    { field: 'brine_concentration', label: '염수농도', min: 15, max: 20, unit: '%' },
    { field: 'salinity_after', label: '절임 후 염도', min: 2.5, max: 3.0, unit: '%' },
  ],
  seasoning: [
    { field: 'mix_temp', label: '혼합온도', min: -2, max: 10, unit: '°C' },
  ],
  packaging: [
    { field: 'metal_detect', label: '금속검출', unit: '' },
  ],
  preprocess: [],
}

function isCcpViolation(record: Record<string, unknown>, processType: ProcessType): boolean {
  const fields = CCP_FIELDS[processType]
  for (const f of fields) {
    const val = record[f.field]
    if (f.field === 'metal_detect') {
      if (val !== 'PASS') return true
      continue
    }
    const num = Number(val)
    if (f.min !== undefined && num < f.min) return true
    if (f.max !== undefined && num > f.max) return true
  }
  return false
}

function getColumns(processType: ProcessType): string[] {
  switch (processType) {
    case 'wash':
      return ['작업지시번호', '세척수온도(°C)', 'pH', '세척압력(bar)', '세척시간(분)', '투입중량(kg)', '세척후중량(kg)', '이물질', 'CCP']
    case 'salting':
      return ['작업지시번호', '염수농도(%)', '절임시간(h)', '투입중량(kg)', '절임후중량(kg)', '절임후염도(%)', '탈수횟수', 'CCP']
    case 'seasoning':
      return ['작업지시번호', '혼합온도(°C)', '혼합시간(분)', '투입중량(kg)', '버무림후중량(kg)', 'LOT번호', 'CCP']
    case 'packaging':
      return ['작업지시번호', '목표중량(g)', '실측중량(g)', '총수량(개)', '불량수량(개)', '금속검출', '실링', 'LOT번호', 'CCP']
    case 'preprocess':
      return ['원재료', '입고일', '투입중량(kg)', '불합격중량(kg)', '합격중량(kg)', '보관온도(°C)', '이물질제거', '사전세척']
    default:
      return []
  }
}

type RecordRow = Record<string, unknown>

function renderCell(key: string, record: RecordRow): React.ReactNode {
  const fieldMap: Record<string, string> = {
    '작업지시번호': 'work_order_id',
    '세척수온도(°C)': 'water_temp',
    'pH': 'ph',
    '세척압력(bar)': 'pressure',
    '세척시간(분)': 'wash_time',
    '투입중량(kg)': 'input_weight',
    '세척후중량(kg)': 'output_weight',
    '이물질': 'foreign_matter_found',
    '염수농도(%)': 'brine_concentration',
    '절임시간(h)': 'elapsed_hours',
    '절임후중량(kg)': 'output_weight',
    '절임후염도(%)': 'salinity_after',
    '탈수횟수': 'rinse_count',
    '혼합온도(°C)': 'mix_temp',
    '혼합시간(분)': 'mix_time',
    '버무림후중량(kg)': 'output_weight',
    'LOT번호': 'lot_no',
    '목표중량(g)': 'target_weight',
    '실측중량(g)': 'actual_avg_weight',
    '총수량(개)': 'total_qty',
    '불량수량(개)': 'defect_qty',
    '금속검출': 'metal_detect',
    '실링': 'sealing_state',
    '원재료': 'raw_material_name',
    '입고일': 'receive_date',
    '불합격중량(kg)': 'reject_weight',
    '합격중량(kg)': 'pass_weight',
    '보관온도(°C)': 'storage_temp',
    '이물질제거': 'foreign_matter_removed',
    '사전세척': 'pre_washed',
  }

  const field = fieldMap[key]
  if (!field) return null
  const val = record[field]

  if (key === '이물질' || key === '이물질제거' || key === '사전세척') {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${val ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {val ? 'YES' : 'NO'}
      </span>
    )
  }
  if (key === '금속검출') {
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${val === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {String(val)}
      </span>
    )
  }
  if (key === '실링') {
    const colors: Record<string, string> = { GOOD: 'bg-green-100 text-green-700', POOR: 'bg-yellow-100 text-yellow-700', FAIL: 'bg-red-100 text-red-700' }
    return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors[String(val)] ?? 'bg-gray-100 text-gray-700'}`}>{String(val ?? '-')}</span>
  }
  return <span>{String(val ?? '-')}</span>
}

export default function ProcessRecordsPage() {
  const [activeTab, setActiveTab] = useState<ProcessType>('wash')
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10))
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  const { data: recordsData, isLoading } = useQuery(
    ['process-records', activeTab, dateFrom, dateTo],
    () => processRecordApi.getSummary({ date_from: dateFrom, date_to: dateTo, process_type: activeTab }),
    { staleTime: 30_000 }
  )

  const { data: violationsData } = useQuery(
    ['ccp-violations', dateFrom, dateTo],
    () => processRecordApi.getCcpViolations({ date_from: dateFrom, date_to: dateTo }),
    { staleTime: 30_000 }
  )

  const records: RecordRow[] = (recordsData?.data as RecordRow[]) ?? []
  const violations: RecordRow[] = (violationsData?.data as RecordRow[]) ?? []

  const columns = getColumns(activeTab)
  const totalWithCcp = records.length
  const violationCount = records.filter((r) => isCcpViolation(r, activeTab)).length
  const violationRate = totalWithCcp > 0 ? ((violationCount / totalWithCcp) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">공정별 실적 조회</h1>
        <p className="mt-1 text-sm text-gray-500">HACCP CCP 이탈 건은 빨간색으로 표시됩니다.</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">시작일</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-500">종료일</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 탭 */}
      <div className="flex overflow-x-auto rounded-2xl bg-white shadow-sm">
        {PROCESS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 whitespace-nowrap py-4 text-sm font-bold transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CCP 이탈 요약 */}
      {activeTab !== 'preprocess' && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
            <p className="text-xs font-semibold text-gray-500">전체 기록 수</p>
            <p className="mt-1 text-3xl font-black text-gray-900">{totalWithCcp}</p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm text-center ${violationCount > 0 ? 'bg-red-50' : 'bg-white'}`}>
            <p className="text-xs font-semibold text-gray-500">CCP 이탈 건수</p>
            <p className={`mt-1 text-3xl font-black ${violationCount > 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {violationCount}
            </p>
          </div>
          <div className={`rounded-2xl p-4 shadow-sm text-center ${parseFloat(violationRate) > 0 ? 'bg-red-50' : 'bg-white'}`}>
            <p className="text-xs font-semibold text-gray-500">CCP 이탈율</p>
            <p className={`mt-1 text-3xl font-black ${parseFloat(violationRate) > 0 ? 'text-red-700' : 'text-gray-900'}`}>
              {violationRate}%
            </p>
          </div>
        </div>
      )}

      {/* 데이터 테이블 */}
      <div className="rounded-2xl bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
            </svg>
          </div>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-gray-400">해당 기간에 기록된 데이터가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-bold text-gray-500">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => {
                  const violated = activeTab !== 'preprocess' && isCcpViolation(record, activeTab)
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 last:border-0 ${violated ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      {columns.map((col) => (
                        <td key={col} className="px-4 py-3 text-gray-800">
                          {col === 'CCP' ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${violated ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {violated ? 'FAIL' : 'PASS'}
                            </span>
                          ) : (
                            renderCell(col, record)
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CCP 이탈 현황 요약 (API 기반) */}
      {violations.length > 0 && (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
          <h3 className="mb-3 text-base font-bold text-red-700">CCP 이탈 현황 (전체 공정)</h3>
          <div className="space-y-2">
            {violations.slice(0, 5).map((v, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-xl bg-white px-4 py-2">
                <span className="text-sm font-semibold text-gray-800">{String(v.process_type ?? '-')}</span>
                <span className="text-sm text-gray-600">{String(v.work_order_id ?? '-')}</span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">이탈</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
