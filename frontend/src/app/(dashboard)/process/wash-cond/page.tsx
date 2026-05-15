'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'

type WashStatus = '대기' | '진행중' | '완료' | 'CCP이탈'

interface WashBatch {
  id: number
  lot_no: string
  product_name: string
  input_qty: number
  water_temp: number
  ph: number
  pressure: number
  wash_time: number
  foreign_matter: boolean
  manager: string
  start_time: string
  status: WashStatus
}

const CCP = { tempMin: 1, tempMax: 15, phMin: 6.5, phMax: 8.5 }

const MOCK_BATCHES: WashBatch[] = [
  { id: 1, lot_no: 'LOT-20260515-001', product_name: '배추김치', input_qty: 850, water_temp: 8.2, ph: 7.1, pressure: 3.0, wash_time: 12, foreign_matter: false, manager: '김철수', start_time: '07:10', status: '완료' },
  { id: 2, lot_no: 'LOT-20260515-002', product_name: '깍두기', input_qty: 420, water_temp: 9.5, ph: 7.3, pressure: 2.8, wash_time: 10, foreign_matter: false, manager: '이영희', start_time: '08:00', status: '완료' },
  { id: 3, lot_no: 'LOT-20260515-003', product_name: '총각김치', input_qty: 310, water_temp: 16.2, ph: 7.0, pressure: 3.5, wash_time: 11, foreign_matter: false, manager: '박민준', start_time: '09:15', status: 'CCP이탈' },
  { id: 4, lot_no: 'LOT-20260515-004', product_name: '배추김치', input_qty: 920, water_temp: 7.8, ph: 8.1, pressure: 3.2, wash_time: 13, foreign_matter: false, manager: '최지원', start_time: '10:00', status: '진행중' },
  { id: 5, lot_no: 'LOT-20260515-005', product_name: '갓김치', input_qty: 280, water_temp: 6.5, ph: 7.5, pressure: 2.5, wash_time: 8, foreign_matter: true, manager: '정수빈', start_time: '10:45', status: '완료' },
  { id: 6, lot_no: 'LOT-20260515-006', product_name: '깍두기', input_qty: 390, water_temp: 8.0, ph: 6.2, pressure: 3.0, wash_time: 10, foreign_matter: false, manager: '한도윤', start_time: '11:20', status: 'CCP이탈' },
  { id: 7, lot_no: 'LOT-20260515-007', product_name: '파김치', input_qty: 150, water_temp: 5.5, ph: 7.2, pressure: 2.0, wash_time: 9, foreign_matter: false, manager: '윤서아', start_time: '-', status: '대기' },
  { id: 8, lot_no: 'LOT-20260515-008', product_name: '배추김치', input_qty: 760, water_temp: 10.1, ph: 7.8, pressure: 3.1, wash_time: 14, foreign_matter: false, manager: '임태현', start_time: '06:50', status: '완료' },
]

const STATUS_STYLES: Record<WashStatus, string> = {
  대기: 'bg-slate-100 text-slate-600',
  진행중: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
  완료: 'bg-green-50 text-green-700',
  CCP이탈: 'bg-red-50 text-red-700 border border-red-200',
}

function isTempPass(t: number) { return t >= CCP.tempMin && t <= CCP.tempMax }
function isPhPass(p: number) { return p >= CCP.phMin && p <= CCP.phMax }

function CcpCell({ value, pass }: { value: string; pass: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${pass ? 'text-gray-800' : 'text-red-600'}`}>
      {value}
      {!pass && <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-600">FAIL</span>}
    </span>
  )
}

export default function WashCondPage() {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState(today)
  const [statusFilter, setStatusFilter] = useState<string>('전체')

  const { data, isLoading } = useQuery(
    ['wash-batches', dateFilter, statusFilter],
    async (): Promise<WashBatch[]> => {
      await new Promise((r) => setTimeout(r, 400))
      return MOCK_BATCHES
    },
    { staleTime: 30_000 }
  )

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((b) => statusFilter === '전체' || b.status === statusFilter)
  }, [data, statusFilter])

  const summary = useMemo(() => {
    const batches = data ?? []
    const inProgress = batches.filter((b) => b.status === '진행중').length
    const completed = batches.filter((b) => b.status === '완료').length
    const ccpFail = batches.filter((b) => b.status === 'CCP이탈').length
    const foreignFound = batches.filter((b) => b.foreign_matter).length
    const activeCount = batches.filter((b) => b.status === '완료' || b.status === 'CCP이탈').length
    const passCount = batches.filter((b) => b.status === '완료').length
    const ccpRate = activeCount > 0 ? Math.round((passCount / activeCount) * 100) : 100
    return { inProgress, completed, ccpFail, foreignFound, ccpRate }
  }, [data])

  return (
    <div>
      <PageHeader
        title="세척 공정 관리"
        subtitle="세척 공정의 배치 현황과 CCP 관리기준(수온·pH) 준수 현황을 모니터링합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '세척 공정' }]}
      />

      {/* CCP 이탈 경보 배너 */}
      {summary.ccpFail > 0 && (
        <div className="mb-5 rounded-2xl border-2 border-red-500 bg-red-600 px-5 py-4 text-center">
          <p className="text-lg font-black text-white">
            ⚠ CCP 이탈 배치 {summary.ccpFail}건 — 즉시 확인 및 조치가 필요합니다
          </p>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #0891B2' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">진행중 배치</p>
          <p className="text-3xl font-black text-[#0891B2]">{summary.inProgress}</p>
          <p className="mt-1 text-xs text-gray-400">현재 세척 작업 중</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #16A34A' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">오늘 완료</p>
          <p className="text-3xl font-black text-[#16A34A]">{summary.completed}</p>
          <p className="mt-1 text-xs text-gray-400">금일 세척 완료 배치</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.ccpRate >= 95 ? '#16A34A' : '#DC2626'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">CCP 준수율</p>
          <p className="text-3xl font-black" style={{ color: summary.ccpRate >= 95 ? '#16A34A' : '#DC2626' }}>
            {summary.ccpRate}%
          </p>
          <p className="mt-1 text-xs text-gray-400">기준: 95% 이상</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.foreignFound > 0 ? '#DC2626' : '#64748B'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">이물질 검출</p>
          <p className="text-3xl font-black" style={{ color: summary.foreignFound > 0 ? '#DC2626' : '#64748B' }}>
            {summary.foreignFound}건
          </p>
          <p className="mt-1 text-xs text-gray-400">금일 이물질 발견</p>
        </div>
      </div>

      {/* CCP 기준값 안내 */}
      <div className="mb-5 flex flex-wrap gap-4 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-3">
        <span className="text-xs font-semibold text-blue-700">HACCP CCP 관리기준</span>
        <span className="text-xs text-blue-600">세척수 온도: {CCP.tempMin}~{CCP.tempMax}°C</span>
        <span className="text-xs text-blue-600">pH: {CCP.phMin}~{CCP.phMax}</span>
      </div>

      {/* 필터 바 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">날짜</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          >
            {['전체', '대기', '진행중', '완료', 'CCP이탈'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}건 표시</span>
      </div>

      {/* 배치 목록 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-auto">
              <thead>
                <tr className="bg-[#F0F9FF]">
                  {['LOT번호', '제품명', '투입량(kg)', '수온(°C)', 'pH', '압력(bar)', '세척시간', '이물질', '담당자', '시작', '상태'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#0E7490]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="py-14 text-center text-sm text-gray-400">해당 조건의 배치가 없습니다.</td></tr>
                ) : filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-gray-100 transition-colors hover:bg-[#F0F9FF]"
                    style={b.status === 'CCP이탈' ? { background: 'rgba(220,38,38,0.04)' } : undefined}
                  >
                    <td className="px-4 py-3.5"><span className="font-mono text-xs text-gray-600">{b.lot_no}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm font-semibold text-gray-800">{b.product_name}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-gray-700">{b.input_qty.toLocaleString()}</span></td>
                    <td className="px-4 py-3.5"><CcpCell value={`${b.water_temp}`} pass={isTempPass(b.water_temp)} /></td>
                    <td className="px-4 py-3.5"><CcpCell value={`${b.ph}`} pass={isPhPass(b.ph)} /></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-gray-700">{b.pressure}</span></td>
                    <td className="px-4 py-3.5"><span className="text-sm text-gray-700">{b.wash_time}분</span></td>
                    <td className="px-4 py-3.5">
                      {b.foreign_matter
                        ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">검출</span>
                        : <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-600">없음</span>
                      }
                    </td>
                    <td className="px-4 py-3.5"><span className="text-sm text-gray-700">{b.manager}</span></td>
                    <td className="px-4 py-3.5"><span className="font-mono text-xs text-gray-500">{b.start_time}</span></td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[b.status]}`}>
                        {b.status}
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
