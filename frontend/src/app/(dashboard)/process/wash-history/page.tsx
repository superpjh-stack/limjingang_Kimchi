'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { processRecordApi } from '@/lib/api'

const CCP = { tempMin: 1, tempMax: 15, phMin: 6.5, phMax: 8.5 }

interface WashRecord {
  id: number
  work_order_id: number
  work_order_no: string
  product_name: string
  lot_no: string
  water_temp: number
  ph: number
  pressure: number
  wash_time: number
  input_weight: number
  output_weight: number
  foreign_matter_found: boolean
  foreign_matter_detail: string | null
  ccp_pass: boolean
  created_at: string
  created_by: string
}

// 실제 API가 work_order_id 기반이므로 집계용 목업 사용
const MOCK_RECORDS: WashRecord[] = [
  { id: 1, work_order_id: 1, work_order_no: 'WO-20260515-001', product_name: '배추김치', lot_no: 'LOT-20260515-001', water_temp: 8.2, ph: 7.1, pressure: 3.0, wash_time: 12, input_weight: 850, output_weight: 840, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: true, created_at: '2026-05-15 07:25', created_by: '김철수' },
  { id: 2, work_order_id: 2, work_order_no: 'WO-20260515-002', product_name: '깍두기', lot_no: 'LOT-20260515-002', water_temp: 9.5, ph: 7.3, pressure: 2.8, wash_time: 10, input_weight: 420, output_weight: 415, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: true, created_at: '2026-05-15 08:15', created_by: '이영희' },
  { id: 3, work_order_id: 3, work_order_no: 'WO-20260515-003', product_name: '총각김치', lot_no: 'LOT-20260515-003', water_temp: 16.2, ph: 7.0, pressure: 3.5, wash_time: 11, input_weight: 310, output_weight: 305, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: false, created_at: '2026-05-15 09:30', created_by: '박민준' },
  { id: 4, work_order_id: 5, work_order_no: 'WO-20260515-005', product_name: '갓김치', lot_no: 'LOT-20260515-005', water_temp: 6.5, ph: 7.5, pressure: 2.5, wash_time: 8, input_weight: 280, output_weight: 272, foreign_matter_found: true, foreign_matter_detail: '배추잎 파편 발견, 재세척 처리', ccp_pass: true, created_at: '2026-05-15 11:00', created_by: '정수빈' },
  { id: 5, work_order_id: 6, work_order_no: 'WO-20260515-006', product_name: '깍두기', lot_no: 'LOT-20260515-006', water_temp: 8.0, ph: 6.2, pressure: 3.0, wash_time: 10, input_weight: 390, output_weight: 382, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: false, created_at: '2026-05-15 11:40', created_by: '한도윤' },
  { id: 6, work_order_id: 8, work_order_no: 'WO-20260515-008', product_name: '배추김치', lot_no: 'LOT-20260515-008', water_temp: 10.1, ph: 7.8, pressure: 3.1, wash_time: 14, input_weight: 760, output_weight: 748, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: true, created_at: '2026-05-15 07:05', created_by: '임태현' },
  { id: 7, work_order_id: 10, work_order_no: 'WO-20260514-010', product_name: '배추김치', lot_no: 'LOT-20260514-010', water_temp: 7.5, ph: 7.0, pressure: 3.0, wash_time: 12, input_weight: 900, output_weight: 888, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: true, created_at: '2026-05-14 08:00', created_by: '김철수' },
  { id: 8, work_order_id: 11, work_order_no: 'WO-20260514-011', product_name: '깍두기', lot_no: 'LOT-20260514-011', water_temp: 12.0, ph: 7.2, pressure: 2.9, wash_time: 11, input_weight: 500, output_weight: 493, foreign_matter_found: false, foreign_matter_detail: null, ccp_pass: true, created_at: '2026-05-14 09:20', created_by: '이영희' },
]

function isTempPass(t: number) { return t >= CCP.tempMin && t <= CCP.tempMax }
function isPhPass(p: number) { return p >= CCP.phMin && p <= CCP.phMax }

export default function WashHistoryPage() {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(sevenDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const [ccpFilter, setCcpFilter] = useState<string>('전체')
  const [productFilter, setProductFilter] = useState<string>('전체')
  const [selectedRecord, setSelectedRecord] = useState<WashRecord | null>(null)

  const { data: records, isLoading } = useQuery(
    ['wash-history', dateFrom, dateTo],
    async (): Promise<WashRecord[]> => {
      await new Promise((r) => setTimeout(r, 400))
      return MOCK_RECORDS
    },
    { staleTime: 60_000 }
  )

  const filtered = useMemo(() => {
    return (records ?? []).filter((r) => {
      const matchCcp = ccpFilter === '전체' || (ccpFilter === 'PASS' ? r.ccp_pass : !r.ccp_pass)
      const matchProduct = productFilter === '전체' || r.product_name === productFilter
      return matchCcp && matchProduct
    })
  }, [records, ccpFilter, productFilter])

  const summary = useMemo(() => {
    const list = records ?? []
    const total = list.length
    const passCount = list.filter((r) => r.ccp_pass).length
    const failCount = total - passCount
    const foreignCount = list.filter((r) => r.foreign_matter_found).length
    const totalInput = list.reduce((s, r) => s + r.input_weight, 0)
    const totalOutput = list.reduce((s, r) => s + r.output_weight, 0)
    const yieldRate = totalInput > 0 ? Math.round((totalOutput / totalInput) * 1000) / 10 : 0
    return { total, passCount, failCount, foreignCount, yieldRate }
  }, [records])

  const productOptions = useMemo(() => {
    const names = [...new Set((records ?? []).map((r) => r.product_name))]
    return ['전체', ...names]
  }, [records])

  return (
    <div>
      <PageHeader
        title="세척 실적 이력"
        subtitle="세척 공정의 실적 기록을 조회하고 CCP 이탈 이력 및 이물질 검출 현황을 관리합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '세척 공정' }, { label: '세척 실적' }]}
      />

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #0891B2' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">총 세척 건수</p>
          <p className="text-3xl font-black text-[#0891B2]">{summary.total}</p>
          <p className="mt-1 text-xs text-gray-400">조회 기간 내</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #16A34A' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">CCP PASS</p>
          <p className="text-3xl font-black text-[#16A34A]">{summary.passCount}</p>
          <p className="mt-1 text-xs text-gray-400">기준 내 완료</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: `3px solid ${summary.failCount > 0 ? '#DC2626' : '#64748B'}` }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">CCP FAIL</p>
          <p className="text-3xl font-black" style={{ color: summary.failCount > 0 ? '#DC2626' : '#64748B' }}>{summary.failCount}</p>
          <p className="mt-1 text-xs text-gray-400">기준 이탈 건수</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: `3px solid ${summary.foreignCount > 0 ? '#DC2626' : '#64748B'}` }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">이물질 검출</p>
          <p className="text-3xl font-black" style={{ color: summary.foreignCount > 0 ? '#DC2626' : '#64748B' }}>{summary.foreignCount}</p>
          <p className="mt-1 text-xs text-gray-400">이물질 발견 건수</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #D97706' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">평균 세척 수율</p>
          <p className="text-3xl font-black text-[#D97706]">{summary.yieldRate}%</p>
          <p className="mt-1 text-xs text-gray-400">투입 대비 산출량</p>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">시작일</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          />
        </div>
        <span className="text-xs text-gray-400">~</span>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">종료일</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">CCP</label>
          <select
            value={ccpFilter}
            onChange={(e) => setCcpFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          >
            {['전체', 'PASS', 'FAIL'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">제품</label>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          >
            {productOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}건</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-auto">
              <thead>
                <tr className="bg-[#F0F9FF]">
                  {['작업지시번호', 'LOT번호', '제품명', '수온(°C)', 'pH', '압력', '세척시간', '투입(kg)', '산출(kg)', '수율', '이물질', 'CCP', '담당자', '기록일시'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-[#0E7490]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={14} className="py-14 text-center text-sm text-gray-400">해당 조건의 기록이 없습니다.</td></tr>
                ) : filtered.map((r) => {
                  const yieldPct = r.input_weight > 0
                    ? Math.round((r.output_weight / r.input_weight) * 1000) / 10
                    : 0
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-[#F0F9FF]"
                      style={!r.ccp_pass ? { background: 'rgba(220,38,38,0.04)' } : undefined}
                      onClick={() => setSelectedRecord(r)}
                    >
                      <td className="px-3 py-3.5"><span className="font-mono text-xs text-gray-600">{r.work_order_no}</span></td>
                      <td className="px-3 py-3.5"><span className="font-mono text-xs text-gray-600">{r.lot_no}</span></td>
                      <td className="px-3 py-3.5"><span className="text-sm font-semibold text-gray-800">{r.product_name}</span></td>
                      <td className="px-3 py-3.5">
                        <span className={`text-sm font-semibold ${isTempPass(r.water_temp) ? 'text-gray-800' : 'text-red-600'}`}>
                          {r.water_temp}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`text-sm font-semibold ${isPhPass(r.ph) ? 'text-gray-800' : 'text-red-600'}`}>
                          {r.ph}
                        </span>
                      </td>
                      <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{r.pressure}bar</span></td>
                      <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{r.wash_time}분</span></td>
                      <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{r.input_weight.toLocaleString()}</span></td>
                      <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{r.output_weight.toLocaleString()}</span></td>
                      <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{yieldPct}%</span></td>
                      <td className="px-3 py-3.5">
                        {r.foreign_matter_found
                          ? <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">검출</span>
                          : <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">없음</span>
                        }
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${r.ccp_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {r.ccp_pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-3 py-3.5"><span className="text-xs text-gray-600">{r.created_by}</span></td>
                      <td className="px-3 py-3.5"><span className="font-mono text-xs text-gray-500">{r.created_at}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-gray-500">{selectedRecord.work_order_no}</p>
                <h3 className="text-xl font-black text-gray-900">{selectedRecord.product_name} 세척 기록</h3>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${selectedRecord.ccp_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                CCP {selectedRecord.ccp_pass ? 'PASS' : 'FAIL'}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">LOT번호</span>
                <span className="font-mono font-semibold text-gray-800">{selectedRecord.lot_no}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">세척수 온도</span>
                <span className={`font-semibold ${isTempPass(selectedRecord.water_temp) ? 'text-gray-800' : 'text-red-600'}`}>
                  {selectedRecord.water_temp}°C {!isTempPass(selectedRecord.water_temp) && '⚠ 기준이탈'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">pH</span>
                <span className={`font-semibold ${isPhPass(selectedRecord.ph) ? 'text-gray-800' : 'text-red-600'}`}>
                  {selectedRecord.ph} {!isPhPass(selectedRecord.ph) && '⚠ 기준이탈'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">세척 압력</span>
                <span className="font-semibold text-gray-800">{selectedRecord.pressure} bar</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">세척 시간</span>
                <span className="font-semibold text-gray-800">{selectedRecord.wash_time} 분</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">투입중량</span>
                <span className="font-semibold text-gray-800">{selectedRecord.input_weight.toLocaleString()} kg</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">세척후중량</span>
                <span className="font-semibold text-gray-800">{selectedRecord.output_weight.toLocaleString()} kg</span>
              </div>
              {selectedRecord.foreign_matter_found && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-700">이물질 검출 내용</p>
                  <p className="mt-1 text-xs text-red-600">{selectedRecord.foreign_matter_detail}</p>
                </div>
              )}
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">담당자</span>
                <span className="font-semibold text-gray-800">{selectedRecord.created_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">기록일시</span>
                <span className="font-mono text-gray-800">{selectedRecord.created_at}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="mt-6 flex h-[48px] w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
