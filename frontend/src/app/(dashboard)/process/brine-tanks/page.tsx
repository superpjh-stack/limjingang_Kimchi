'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'

// HACCP CCP2 — 절임통 운영 관리기준
const CCP2 = {
  brineMin: 10,    // %
  brineMax: 15,    // %
  brineTarget: 12, // %
  saltingHoursMin: 6,
  saltingHoursMax: 8,
  saltingHoursTarget: 7,
  tempMin: 5,      // °C
  tempMax: 15,     // °C
}

interface BrineTank {
  id: string
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE'
  material: string | null
  input_kg: number
  brine_conc: number | null
  elapsed_hours: number
  target_hours: number
  temp: number
  ccp_pass: boolean | null
}

interface BrineLog {
  id: number
  measured_at: string
  tank_id: string
  brine_conc: number
  temp: number
  ccp_pass: boolean
  operator: string
}

interface MeasureForm {
  tank_id: string
  brine_conc: string
  temp: string
  operator: string
}

const mockTanks: BrineTank[] = [
  { id: 'ST-01', status: 'ACTIVE', material: '배추', input_kg: 500, brine_conc: 12.3, elapsed_hours: 4.5, target_hours: 7, temp: 11, ccp_pass: true },
  { id: 'ST-02', status: 'ACTIVE', material: '배추', input_kg: 400, brine_conc: 11.8, elapsed_hours: 2.0, target_hours: 7, temp: 10, ccp_pass: true },
  { id: 'ST-03', status: 'IDLE', material: null, input_kg: 0, brine_conc: null, elapsed_hours: 0, target_hours: 7, temp: 9, ccp_pass: null },
]

const mockBrineLogs: BrineLog[] = [
  { id: 1, measured_at: '2026-05-15 06:00', tank_id: 'ST-01', brine_conc: 12.0, temp: 10, ccp_pass: true, operator: '김철수' },
  { id: 2, measured_at: '2026-05-15 07:00', tank_id: 'ST-01', brine_conc: 12.3, temp: 11, ccp_pass: true, operator: '이영희' },
  { id: 3, measured_at: '2026-05-15 08:00', tank_id: 'ST-02', brine_conc: 9.5,  temp: 10, ccp_pass: false, operator: '박민수' },
  { id: 4, measured_at: '2026-05-15 09:00', tank_id: 'ST-02', brine_conc: 11.8, temp: 10, ccp_pass: true, operator: '박민수' },
  { id: 5, measured_at: '2026-05-15 10:00', tank_id: 'ST-01', brine_conc: 12.5, temp: 11, ccp_pass: true, operator: '최지원' },
  { id: 6, measured_at: '2026-05-15 11:00', tank_id: 'ST-02', brine_conc: 12.1, temp: 10, ccp_pass: true, operator: '정수빈' },
  { id: 7, measured_at: '2026-05-15 12:00', tank_id: 'ST-01', brine_conc: 11.9, temp: 11, ccp_pass: true, operator: '김철수' },
  { id: 8, measured_at: '2026-05-15 13:00', tank_id: 'ST-01', brine_conc: 12.3, temp: 11, ccp_pass: true, operator: '이영희' },
]

function isBrinePass(v: number) { return v >= CCP2.brineMin && v <= CCP2.brineMax }
function isTempPass(v: number) { return v >= CCP2.tempMin && v <= CCP2.tempMax }

function getStatusLabel(status: BrineTank['status']) {
  switch (status) {
    case 'ACTIVE': return { text: '가동중', color: '#16A34A', bg: '#F0FDF4' }
    case 'IDLE': return { text: '대기', color: '#94A3B8', bg: '#F8FAFC' }
    case 'MAINTENANCE': return { text: '점검중', color: '#D97706', bg: '#FFFBEB' }
  }
}

function formatHours(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}시간 ${mm}분`
}

function getExpectedFinish(elapsed: number, target: number): string {
  const remaining = Math.max(0, target - elapsed)
  const now = new Date()
  now.setMinutes(now.getMinutes() + remaining * 60)
  return now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export default function BrineTanksPage() {
  const [now, setNow] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<MeasureForm>({ tank_id: 'ST-01', brine_conc: '', temp: '', operator: '' })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // GET /api/v1/salting/ccp2-logs
  const { data: logs, isLoading } = useQuery(
    ['brine-ccp2-logs'],
    async (): Promise<BrineLog[]> => {
      await new Promise((r) => setTimeout(r, 400))
      return mockBrineLogs
    },
    { staleTime: 30_000 }
  )

  // GET /api/v1/salting/tanks
  const { data: tanks } = useQuery(
    ['brine-tanks'],
    async (): Promise<BrineTank[]> => {
      await new Promise((r) => setTimeout(r, 300))
      return mockTanks
    },
    { staleTime: 30_000 }
  )

  const activeTanks = tanks ?? mockTanks

  // 전체 CCP2 판정: 가동중인 절임통 모두 PASS여야 함
  const overallPass = useMemo(() => {
    return activeTanks
      .filter((t) => t.status === 'ACTIVE')
      .every((t) => t.ccp_pass === true)
  }, [activeTanks])

  const currentBrine = activeTanks.find((t) => t.status === 'ACTIVE' && t.brine_conc !== null)
  const currentBrineConc = currentBrine?.brine_conc ?? null
  const currentTemp = activeTanks.find((t) => t.status === 'ACTIVE')?.temp ?? null
  const currentElapsed = activeTanks.find((t) => t.status === 'ACTIVE')?.elapsed_hours ?? null

  // 시간별 바 차트 데이터 (최근 8개 로그 기준)
  const chartLogs = (logs ?? mockBrineLogs).slice(-8)
  const maxBrine = Math.max(...chartLogs.map((l) => l.brine_conc), CCP2.brineMax + 2)

  const summary = useMemo(() => {
    const list = logs ?? []
    const total = list.length
    const failCount = list.filter((l) => !l.ccp_pass).length
    const passRate = total > 0 ? Math.round(((total - failCount) / total) * 100) : 100
    return { total, failCount, passRate }
  }, [logs])

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // POST /api/v1/salting/ccp2-logs
    alert(`등록 완료\n절임통: ${form.tank_id} | 농도: ${form.brine_conc}% | 온도: ${form.temp}°C | 작업자: ${form.operator}`)
    setShowModal(false)
    setForm({ tank_id: 'ST-01', brine_conc: '', temp: '', operator: '' })
  }

  return (
    <div>
      <PageHeader
        title="절임통 운영 (CCP2)"
        subtitle="HACCP CCP2 — 염수농도(10~15%), 절임시간(6~8시간), 절임실 온도(5~15°C)를 실시간 모니터링합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '절임 공정' }, { label: 'CCP2 절임통' }]}
      />

      {/* 현재 CCP2 상태 — 대형 배너 */}
      <div
        className={`mb-6 rounded-2xl border-4 p-6 text-center ${
          overallPass
            ? 'border-green-400 bg-green-50'
            : 'border-red-500 bg-red-600'
        }`}
      >
        <p className={`text-sm font-semibold ${overallPass ? 'text-green-700' : 'text-white'}`}>
          현재 CCP2 판정 (가동중 절임통 기준) · {now.toLocaleTimeString('ko-KR')}
        </p>
        <p className={`mt-1 text-6xl font-black ${overallPass ? 'text-green-700' : 'text-white'}`}>
          {overallPass ? 'CCP PASS' : 'CCP FAIL'}
        </p>
        <div className={`mt-3 flex flex-wrap justify-center gap-6 text-sm ${overallPass ? 'text-green-700' : 'text-red-100'}`}>
          {currentBrineConc !== null && (
            <span>염수농도 <strong className="text-base">{currentBrineConc}%</strong></span>
          )}
          {currentElapsed !== null && (
            <span>절임경과 <strong className="text-base">{formatHours(currentElapsed)}</strong></span>
          )}
          {currentTemp !== null && (
            <span>절임실 온도 <strong className="text-base">{currentTemp}°C</strong></span>
          )}
        </div>
        {!overallPass && (
          <p className="mt-2 text-sm font-bold text-white">즉시 조치 필요 — 염수 농도 확인 및 보정 바랍니다</p>
        )}
      </div>

      {/* 절임통 카드 3개 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {activeTanks.map((tank) => {
          const statusInfo = getStatusLabel(tank.status)
          const brinePass = tank.brine_conc !== null ? isBrinePass(tank.brine_conc) : null
          const tempPass = isTempPass(tank.temp)
          const progressPct = Math.min(100, Math.round((tank.elapsed_hours / tank.target_hours) * 100))
          const brineGaugePct = tank.brine_conc !== null
            ? Math.min(100, Math.round(((tank.brine_conc - CCP2.brineMin) / (CCP2.brineMax - CCP2.brineMin)) * 100))
            : 0

          return (
            <div
              key={tank.id}
              className="rounded-lg bg-white shadow p-6 border-t-4"
              style={{ borderTopColor: tank.status === 'ACTIVE' ? (tank.ccp_pass ? '#16A34A' : '#DC2626') : '#CBD5E1' }}
            >
              {/* 절임통 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-gray-800">{tank.id}</h3>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ background: statusInfo.bg, color: statusInfo.color }}
                >
                  {statusInfo.text}
                </span>
              </div>

              {tank.status === 'IDLE' || tank.status === 'MAINTENANCE' ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {tank.status === 'IDLE' ? '절임 대기 중' : '설비 점검 중'}
                </div>
              ) : (
                <>
                  {/* 기본 정보 */}
                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">재료</span>
                      <span className="font-semibold text-gray-800">{tank.material}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">투입량</span>
                      <span className="font-semibold text-gray-800">{tank.input_kg}kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">절임실 온도</span>
                      <span className={`font-semibold ${tempPass ? 'text-gray-800' : 'text-red-600'}`}>
                        {tank.temp}°C {!tempPass && '⚠'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">예상 완료</span>
                      <span className="font-semibold text-gray-800">
                        {getExpectedFinish(tank.elapsed_hours, tank.target_hours)}
                      </span>
                    </div>
                  </div>

                  {/* 염수농도 게이지 */}
                  {tank.brine_conc !== null && (
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">염수농도</span>
                        <span className={`text-xs font-bold ${brinePass ? 'text-green-700' : 'text-red-600'}`}>
                          {tank.brine_conc}% {brinePass ? '✓' : '⚠ FAIL'}
                        </span>
                      </div>
                      <div className="relative h-2.5 rounded-full bg-gray-100">
                        {/* 목표범위 표시 */}
                        <div
                          className="absolute top-0 h-full rounded-full opacity-20 bg-green-500"
                          style={{ left: '0%', width: '100%' }}
                        />
                        <div
                          className="absolute top-0 h-full rounded-full transition-all"
                          style={{
                            width: `${brineGaugePct}%`,
                            background: brinePass ? '#16A34A' : '#DC2626',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5 text-[10px] text-gray-400">
                        <span>{CCP2.brineMin}%</span>
                        <span>목표 {CCP2.brineTarget}%</span>
                        <span>{CCP2.brineMax}%</span>
                      </div>
                    </div>
                  )}

                  {/* 절임시간 진행률 */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500">절임 진행</span>
                      <span className="text-xs font-bold text-gray-700">
                        {formatHours(tank.elapsed_hours)} / {tank.target_hours}시간
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-blue-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="text-right mt-0.5 text-[10px] text-gray-400">{progressPct}%</div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* 시간별 염수농도 바 차트 */}
      <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">측정 이력 — 염수농도 추이</h3>
          <span className="text-xs text-gray-400">최근 8회 측정</span>
        </div>
        <div className="flex h-40 items-end gap-3">
          {chartLogs.map((log, i) => {
            const barH = Math.round((log.brine_conc / maxBrine) * 100)
            const minLine = Math.round((CCP2.brineMin / maxBrine) * 100)
            const maxLine = Math.round((CCP2.brineMax / maxBrine) * 100)
            const timeLabel = log.measured_at.split(' ')[1]?.slice(0, 5) ?? String(i)
            return (
              <div key={log.id} className="relative flex flex-1 flex-col items-center">
                <span className="mb-1 text-[10px] font-semibold" style={{ color: log.ccp_pass ? '#16A34A' : '#DC2626' }}>
                  {log.brine_conc}
                </span>
                <div className="relative w-full" style={{ height: '100px' }}>
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
                    className="absolute bottom-0 w-full rounded-t-md transition-all"
                    style={{
                      height: `${barH}px`,
                      background: log.ccp_pass ? '#16A34A' : '#DC2626',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="mt-1 text-[10px] text-gray-500">{timeLabel}</span>
                <span className="text-[9px] text-gray-400">{log.tank_id}</span>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-5 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-green-600" /> PASS</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-red-500" /> FAIL</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-orange-400" /> 상한({CCP2.brineMax}%)</span>
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-blue-400" /> 하한({CCP2.brineMin}%)</span>
        </div>
      </div>

      {/* 필터 + 요약 + 측정 등록 버튼 */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">날짜</label>
          <input
            type="date"
            defaultValue="2026-05-15"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-red-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">절임통</label>
          <select className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-red-400 focus:outline-none">
            {['전체', 'ST-01', 'ST-02', 'ST-03'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-6 text-xs">
          <span className="text-gray-500">총 측정: <strong className="text-gray-800">{summary.total}회</strong></span>
          <span className="text-red-600">이탈: <strong>{summary.failCount}회</strong></span>
          <span style={{ color: summary.passRate >= 95 ? '#16A34A' : '#DC2626' }}>
            준수율: <strong>{summary.passRate}%</strong>
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-red-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-800 transition-colors"
          >
            농도 측정 등록
          </button>
        </div>
      </div>

      {/* 측정 이력 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-auto">
              <thead>
                <tr className="bg-red-50">
                  {['측정시각', '절임통', '염수농도(%)', '온도(°C)', 'CCP 판정', '작업자'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-red-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(logs ?? mockBrineLogs).length === 0 ? (
                  <tr><td colSpan={6} className="py-14 text-center text-sm text-gray-400">측정 기록이 없습니다.</td></tr>
                ) : (logs ?? mockBrineLogs).map((log) => {
                  return (
                    <tr
                      key={log.id}
                      className="border-t border-gray-100 transition-colors hover:bg-red-50/30"
                      style={!log.ccp_pass ? { background: 'rgba(220,38,38,0.04)' } : undefined}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-600">{log.measured_at}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-700">{log.tank_id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${isBrinePass(log.brine_conc) ? 'text-gray-800' : 'text-red-600'}`}>
                          {log.brine_conc}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${isTempPass(log.temp) ? 'text-gray-800' : 'text-red-600'}`}>
                          {log.temp}°C
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            log.ccp_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {log.ccp_pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-700">{log.operator}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 농도 측정 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-black text-gray-800">CCP2 — 농도 측정 등록</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">절임통</label>
                <select
                  name="tank_id"
                  value={form.tank_id}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                >
                  {['ST-01', 'ST-02', 'ST-03'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  염수농도 (%) — 기준: {CCP2.brineMin}~{CCP2.brineMax}%
                </label>
                <input
                  type="number"
                  name="brine_conc"
                  value={form.brine_conc}
                  onChange={handleFormChange}
                  step="0.1"
                  min="0"
                  max="30"
                  required
                  placeholder="예: 12.3"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  절임실 온도 (°C) — 기준: {CCP2.tempMin}~{CCP2.tempMax}°C
                </label>
                <input
                  type="number"
                  name="temp"
                  value={form.temp}
                  onChange={handleFormChange}
                  step="0.1"
                  min="-10"
                  max="40"
                  required
                  placeholder="예: 11.0"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">작업자</label>
                <input
                  type="text"
                  name="operator"
                  value={form.operator}
                  onChange={handleFormChange}
                  required
                  placeholder="이름 입력"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-bold text-white hover:bg-red-800"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
