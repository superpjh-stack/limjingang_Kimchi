'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'

// HACCP CCP1 — 소독수 농도 관리기준
const CCP1 = {
  concentrationMin: 100,  // ppm
  concentrationMax: 200,  // ppm
  tempMax: 15,            // °C
  phMin: 6.5,
  phMax: 8.5,
}

interface SanitizerReading {
  id: number
  measured_at: string
  concentration: number
  temperature: number
  ph: number
  tank_no: string
  operator: string
  corrective_action: string | null
}

interface DailyLog {
  time: string
  concentration: number
  status: 'PASS' | 'FAIL'
}

const MOCK_READINGS: SanitizerReading[] = [
  { id: 1, measured_at: '2026-05-15 06:00', concentration: 150, temperature: 8.5, ph: 7.2, tank_no: 'TANK-1', operator: '김철수', corrective_action: null },
  { id: 2, measured_at: '2026-05-15 07:00', concentration: 145, temperature: 9.0, ph: 7.0, tank_no: 'TANK-1', operator: '이영희', corrective_action: null },
  { id: 3, measured_at: '2026-05-15 08:00', concentration: 98, temperature: 9.5, ph: 7.3, tank_no: 'TANK-1', operator: '박민준', corrective_action: '소독액 추가 보충 (100ppm → 155ppm)' },
  { id: 4, measured_at: '2026-05-15 09:00', concentration: 155, temperature: 8.8, ph: 7.1, tank_no: 'TANK-1', operator: '최지원', corrective_action: null },
  { id: 5, measured_at: '2026-05-15 10:00', concentration: 160, temperature: 8.2, ph: 7.4, tank_no: 'TANK-2', operator: '정수빈', corrective_action: null },
  { id: 6, measured_at: '2026-05-15 11:00', concentration: 175, temperature: 7.9, ph: 7.2, tank_no: 'TANK-2', operator: '한도윤', corrective_action: null },
  { id: 7, measured_at: '2026-05-15 12:00', concentration: 140, temperature: 8.1, ph: 7.0, tank_no: 'TANK-1', operator: '윤서아', corrective_action: null },
  { id: 8, measured_at: '2026-05-15 13:00', concentration: 165, temperature: 8.0, ph: 7.3, tank_no: 'TANK-2', operator: '임태현', corrective_action: null },
]

const HOURLY_LOG: DailyLog[] = [
  { time: '06:00', concentration: 150, status: 'PASS' },
  { time: '07:00', concentration: 145, status: 'PASS' },
  { time: '08:00', concentration: 98,  status: 'FAIL' },
  { time: '09:00', concentration: 155, status: 'PASS' },
  { time: '10:00', concentration: 160, status: 'PASS' },
  { time: '11:00', concentration: 175, status: 'PASS' },
  { time: '12:00', concentration: 140, status: 'PASS' },
  { time: '13:00', concentration: 165, status: 'PASS' },
]

function isConcentrationPass(v: number) { return v >= CCP1.concentrationMin && v <= CCP1.concentrationMax }
function isTempPass(v: number) { return v <= CCP1.tempMax }
function isPhPass(v: number) { return v >= CCP1.phMin && v <= CCP1.phMax }

export default function SanitizerPage() {
  const today = new Date().toISOString().split('T')[0]
  const [dateFilter, setDateFilter] = useState(today)
  const [tankFilter, setTankFilter] = useState('전체')

  const { data: readings, isLoading } = useQuery(
    ['sanitizer-readings', dateFilter, tankFilter],
    async (): Promise<SanitizerReading[]> => {
      await new Promise((r) => setTimeout(r, 400))
      if (tankFilter === '전체') return MOCK_READINGS
      return MOCK_READINGS.filter((r) => r.tank_no === tankFilter)
    },
    { staleTime: 30_000 }
  )

  const latest = readings?.[readings.length - 1]
  const latestPass = latest
    ? isConcentrationPass(latest.concentration) && isTempPass(latest.temperature) && isPhPass(latest.ph)
    : true

  const summary = useMemo(() => {
    const list = readings ?? []
    const total = list.length
    const failCount = list.filter((r) => !isConcentrationPass(r.concentration)).length
    const passRate = total > 0 ? Math.round(((total - failCount) / total) * 100) : 100
    return { total, failCount, passRate }
  }, [readings])

  // 간이 바 차트 데이터
  const maxVal = Math.max(...HOURLY_LOG.map((l) => l.concentration), CCP1.concentrationMax)

  return (
    <div>
      <PageHeader
        title="소독수 농도 관리 (CCP1)"
        subtitle="HACCP CCP1 — 세척 소독수 농도(100~200ppm)를 시간별로 측정하고 이탈 시 즉각 조치합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '세척 공정' }, { label: 'CCP1 소독수' }]}
      />

      {/* 현재 CCP1 상태 — 대형 배너 */}
      <div
        className={`mb-6 rounded-2xl border-4 p-6 text-center ${
          latestPass
            ? 'border-green-400 bg-green-50'
            : 'border-red-500 bg-red-600'
        }`}
      >
        <p className={`text-sm font-semibold ${latestPass ? 'text-green-700' : 'text-white'}`}>
          현재 CCP1 판정 (최근 측정 기준)
        </p>
        <p className={`mt-1 text-4xl font-black ${latestPass ? 'text-green-700' : 'text-white'}`}>
          {latestPass ? 'CCP PASS' : 'CCP FAIL — 즉시 조치 필요'}
        </p>
        {latest && (
          <p className={`mt-2 text-sm ${latestPass ? 'text-green-600' : 'text-red-100'}`}>
            {latest.measured_at} | {latest.tank_no} | 농도 {latest.concentration}ppm | 담당: {latest.operator}
          </p>
        )}
      </div>

      {/* 현재 측정값 카드 3종 */}
      {latest && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
            style={{ borderTop: `3px solid ${isConcentrationPass(latest.concentration) ? '#16A34A' : '#DC2626'}` }}
          >
            <p className="mb-1 text-xs font-semibold text-gray-500">소독수 농도</p>
            <p
              className="text-3xl font-black"
              style={{ color: isConcentrationPass(latest.concentration) ? '#16A34A' : '#DC2626' }}
            >
              {latest.concentration}
              <span className="ml-1 text-base font-semibold">ppm</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">기준: {CCP1.concentrationMin}~{CCP1.concentrationMax}ppm</p>
          </div>
          <div
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
            style={{ borderTop: `3px solid ${isTempPass(latest.temperature) ? '#16A34A' : '#DC2626'}` }}
          >
            <p className="mb-1 text-xs font-semibold text-gray-500">수온</p>
            <p
              className="text-3xl font-black"
              style={{ color: isTempPass(latest.temperature) ? '#16A34A' : '#DC2626' }}
            >
              {latest.temperature}
              <span className="ml-1 text-base font-semibold">°C</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">기준: {CCP1.tempMax}°C 이하</p>
          </div>
          <div
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
            style={{ borderTop: `3px solid ${isPhPass(latest.ph) ? '#16A34A' : '#DC2626'}` }}
          >
            <p className="mb-1 text-xs font-semibold text-gray-500">pH</p>
            <p
              className="text-3xl font-black"
              style={{ color: isPhPass(latest.ph) ? '#16A34A' : '#DC2626' }}
            >
              {latest.ph}
            </p>
            <p className="mt-1 text-xs text-gray-400">기준: {CCP1.phMin}~{CCP1.phMax}</p>
          </div>
        </div>
      )}

      {/* 시간별 농도 트렌드 바 차트 */}
      <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-gray-700">시간별 소독수 농도 추이</h3>
        <div className="flex h-40 items-end gap-3">
          {HOURLY_LOG.map((log) => {
            const barH = Math.round((log.concentration / maxVal) * 100)
            const minLine = Math.round((CCP1.concentrationMin / maxVal) * 100)
            const maxLine = Math.round((CCP1.concentrationMax / maxVal) * 100)
            return (
              <div key={log.time} className="relative flex flex-1 flex-col items-center">
                <span className="mb-1 text-[10px] font-semibold" style={{ color: log.status === 'PASS' ? '#16A34A' : '#DC2626' }}>
                  {log.concentration}
                </span>
                <div className="relative w-full">
                  {/* 상한선 */}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-orange-400"
                    style={{ bottom: `${maxLine}%` }}
                  />
                  {/* 하한선 */}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400"
                    style={{ bottom: `${minLine}%` }}
                  />
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${barH * 1.4}px`,
                      background: log.status === 'PASS' ? '#16A34A' : '#DC2626',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="mt-1 text-[10px] text-gray-500">{log.time}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-5 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-green-600" /> PASS</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-red-500" /> FAIL</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-orange-400" /> 상한({CCP1.concentrationMax}ppm)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-blue-400" /> 하한({CCP1.concentrationMin}ppm)</span>
        </div>
      </div>

      {/* 필터 + 요약 */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
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
          <label className="text-xs font-semibold text-gray-500">탱크</label>
          <select
            value={tankFilter}
            onChange={(e) => setTankFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
          >
            {['전체', 'TANK-1', 'TANK-2'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-6 text-xs">
          <span className="text-gray-500">총 측정: <strong className="text-gray-800">{summary.total}회</strong></span>
          <span className="text-red-600">이탈: <strong>{summary.failCount}회</strong></span>
          <span style={{ color: summary.passRate >= 95 ? '#16A34A' : '#DC2626' }}>
            준수율: <strong>{summary.passRate}%</strong>
          </span>
        </div>
      </div>

      {/* 측정 이력 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] table-auto">
              <thead>
                <tr className="bg-[#F0F9FF]">
                  {['측정시각', '탱크', '농도(ppm)', '수온(°C)', 'pH', 'CCP판정', '담당자', '조치사항'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#0E7490]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(readings ?? []).length === 0 ? (
                  <tr><td colSpan={8} className="py-14 text-center text-sm text-gray-400">측정 기록이 없습니다.</td></tr>
                ) : (readings ?? []).map((r) => {
                  const pass = isConcentrationPass(r.concentration) && isTempPass(r.temperature) && isPhPass(r.ph)
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-gray-100 transition-colors hover:bg-[#F0F9FF]"
                      style={!pass ? { background: 'rgba(220,38,38,0.04)' } : undefined}
                    >
                      <td className="px-4 py-3.5"><span className="font-mono text-xs text-gray-600">{r.measured_at}</span></td>
                      <td className="px-4 py-3.5"><span className="text-sm font-semibold text-gray-700">{r.tank_no}</span></td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${isConcentrationPass(r.concentration) ? 'text-gray-800' : 'text-red-600'}`}>
                          {r.concentration}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${isTempPass(r.temperature) ? 'text-gray-800' : 'text-red-600'}`}>
                          {r.temperature}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${isPhPass(r.ph) ? 'text-gray-800' : 'text-red-600'}`}>
                          {r.ph}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><span className="text-sm text-gray-700">{r.operator}</span></td>
                      <td className="px-4 py-3.5">
                        {r.corrective_action
                          ? <span className="text-xs font-semibold text-orange-600">{r.corrective_action}</span>
                          : <span className="text-xs text-gray-400">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
