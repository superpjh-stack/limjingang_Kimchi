'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'

// HACCP CCP3 — 버무림 온도 관리기준
const CCP3 = {
  roomTempMax: 10,       // °C
  roomTempTarget: 8,     // °C
  materialTempMax: 5,    // °C
  durationMinPer500: 45, // 분 (500kg 기준)
  durationMaxPer500: 60, // 분
}

interface MixingBatch {
  id: number
  batch_no: string
  material: string
  start_time: string
  room_temp: number
  material_temp: number
  duration_min: number
  ccp_pass: boolean
  worker: string
}

interface HourlyTemp {
  time: string
  room_temp: number
  status: 'PASS' | 'FAIL'
}

interface MeasureForm {
  batch_no: string
  material: string
  room_temp: string
  material_temp: string
  duration_min: string
  worker: string
}

const mockMixingLog: MixingBatch[] = [
  { id: 1, batch_no: 'MIX-20260515-001', material: '배추김치', start_time: '08:00', room_temp: 8.2, material_temp: 4.5, duration_min: 52, ccp_pass: true, worker: '김철수' },
  { id: 2, batch_no: 'MIX-20260515-002', material: '깍두기', start_time: '10:30', room_temp: 9.8, material_temp: 4.9, duration_min: 48, ccp_pass: true, worker: '이영희' },
  { id: 3, batch_no: 'MIX-20260515-003', material: '총각김치', start_time: '13:00', room_temp: 11.2, material_temp: 5.3, duration_min: 55, ccp_pass: false, worker: '박민수' },
]

const mockHourlyTemp: HourlyTemp[] = [
  { time: '06:00', room_temp: 7.8, status: 'PASS' },
  { time: '07:00', room_temp: 8.0, status: 'PASS' },
  { time: '08:00', room_temp: 8.2, status: 'PASS' },
  { time: '09:00', room_temp: 8.5, status: 'PASS' },
  { time: '10:00', room_temp: 9.3, status: 'PASS' },
  { time: '11:00', room_temp: 9.8, status: 'PASS' },
  { time: '12:00', room_temp: 10.5, status: 'FAIL' },
  { time: '13:00', room_temp: 11.2, status: 'FAIL' },
]

function isRoomTempPass(v: number) { return v <= CCP3.roomTempMax }
function isMaterialTempPass(v: number) { return v <= CCP3.materialTempMax }
function isDurationPass(min: number) { return min >= CCP3.durationMinPer500 && min <= CCP3.durationMaxPer500 }

export default function MixingCcpPage() {
  const [now, setNow] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<MeasureForm>({
    batch_no: '',
    material: '',
    room_temp: '',
    material_temp: '',
    duration_min: '',
    worker: '',
  })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // GET /api/v1/mixing/ccp3-logs
  const { data: batches, isLoading } = useQuery(
    ['mixing-ccp3-logs'],
    async (): Promise<MixingBatch[]> => {
      await new Promise((r) => setTimeout(r, 400))
      return mockMixingLog
    },
    { staleTime: 30_000 }
  )

  // GET /api/v1/mixing/hourly-temp
  const { data: hourlyData } = useQuery(
    ['mixing-hourly-temp'],
    async (): Promise<HourlyTemp[]> => {
      await new Promise((r) => setTimeout(r, 300))
      return mockHourlyTemp
    },
    { staleTime: 30_000 }
  )

  const chartData = hourlyData ?? mockHourlyTemp
  const batchList = batches ?? mockMixingLog

  // 최신 배치 기준 버무림실 온도
  const latestBatch = batchList[batchList.length - 1]
  const currentRoomTemp = latestBatch?.room_temp ?? null
  const currentMaterialTemp = latestBatch?.material_temp ?? null
  const activeBatchCount = batchList.filter((b) => b.ccp_pass !== false).length

  // 전체 CCP3 판정
  const overallPass = useMemo(() => {
    return batchList.every((b) => b.ccp_pass)
  }, [batchList])

  const summary = useMemo(() => {
    const total = batchList.length
    const failCount = batchList.filter((b) => !b.ccp_pass).length
    const passRate = total > 0 ? Math.round(((total - failCount) / total) * 100) : 100
    return { total, failCount, passRate }
  }, [batchList])

  // 바 차트 스케일
  const maxTemp = Math.max(...chartData.map((d) => d.room_temp), CCP3.roomTempMax + 3)

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // POST /api/v1/mixing/ccp3-logs
    const roomTempNum = parseFloat(form.room_temp)
    const materialTempNum = parseFloat(form.material_temp)
    const durationNum = parseInt(form.duration_min)
    const pass = isRoomTempPass(roomTempNum) && isMaterialTempPass(materialTempNum) && isDurationPass(durationNum)
    alert(`등록 완료\n배치: ${form.batch_no} | 버무림실: ${form.room_temp}°C | 재료: ${form.material_temp}°C | CCP: ${pass ? 'PASS' : 'FAIL'}`)
    setShowModal(false)
    setForm({ batch_no: '', material: '', room_temp: '', material_temp: '', duration_min: '', worker: '' })
  }

  return (
    <div>
      <PageHeader
        title="버무림 온도 (CCP3)"
        subtitle="HACCP CCP3 — 버무림실 온도(10°C 이하), 재료 온도(5°C 이하), 버무림 시간(45~60분/500kg)을 배치별로 관리합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '양념 버무림' }, { label: 'CCP3 버무림 온도' }]}
      />

      {/* 현재 CCP3 상태 — 대형 배너 */}
      <div
        className={`mb-6 rounded-2xl border-4 p-6 text-center ${
          overallPass
            ? 'border-green-400 bg-green-50'
            : 'border-red-500 bg-red-600'
        }`}
      >
        <p className={`text-sm font-semibold ${overallPass ? 'text-green-700' : 'text-white'}`}>
          현재 CCP3 판정 (금일 배치 기준) · {now.toLocaleTimeString('ko-KR')}
        </p>
        <p className={`mt-1 text-6xl font-black ${overallPass ? 'text-green-700' : 'text-white'}`}>
          {overallPass ? 'CCP PASS' : 'CCP FAIL'}
        </p>
        {currentRoomTemp !== null && (
          <div className={`mt-3 text-sm ${overallPass ? 'text-green-700' : 'text-red-100'}`}>
            <span>버무림실 온도 <strong className="text-2xl font-black">{currentRoomTemp}°C</strong></span>
            <span className="mx-4 text-xs opacity-60">|</span>
            <span>기준 {CCP3.roomTempMax}°C 이하</span>
          </div>
        )}
        {!overallPass && (
          <p className="mt-2 text-sm font-bold text-white">버무림실 냉방 강화 또는 작업 중단 후 온도 복귀 확인 바랍니다</p>
        )}
      </div>

      {/* 현재 환경 카드 3개 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 버무림실 온도 */}
        <div
          className="rounded-lg bg-white shadow p-6 border-t-4"
          style={{ borderTopColor: currentRoomTemp !== null ? (isRoomTempPass(currentRoomTemp) ? '#16A34A' : '#DC2626') : '#CBD5E1' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">버무림실 온도</p>
          {currentRoomTemp !== null ? (
            <>
              <p
                className="text-3xl font-black"
                style={{ color: isRoomTempPass(currentRoomTemp) ? '#16A34A' : '#DC2626' }}
              >
                {currentRoomTemp}
                <span className="ml-1 text-base font-semibold">°C</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">기준: {CCP3.roomTempMax}°C 이하 (목표 {CCP3.roomTempTarget}°C)</p>
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((currentRoomTemp / (CCP3.roomTempMax + 5)) * 100))}%`,
                      background: isRoomTempPass(currentRoomTemp) ? '#16A34A' : '#DC2626',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-2xl font-black text-gray-300">—</p>
          )}
        </div>

        {/* 재료 투입 온도 */}
        <div
          className="rounded-lg bg-white shadow p-6 border-t-4"
          style={{ borderTopColor: currentMaterialTemp !== null ? (isMaterialTempPass(currentMaterialTemp) ? '#16A34A' : '#DC2626') : '#CBD5E1' }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">재료 투입 온도</p>
          {currentMaterialTemp !== null ? (
            <>
              <p
                className="text-3xl font-black"
                style={{ color: isMaterialTempPass(currentMaterialTemp) ? '#16A34A' : '#DC2626' }}
              >
                {currentMaterialTemp}
                <span className="ml-1 text-base font-semibold">°C</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">기준: {CCP3.materialTempMax}°C 이하</p>
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((currentMaterialTemp / (CCP3.materialTempMax + 5)) * 100))}%`,
                      background: isMaterialTempPass(currentMaterialTemp) ? '#16A34A' : '#DC2626',
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-2xl font-black text-gray-300">—</p>
          )}
        </div>

        {/* 진행 배치 수 */}
        <div className="rounded-lg bg-white shadow p-6 border-t-4 border-red-600">
          <p className="mb-1 text-xs font-semibold text-gray-500">금일 배치 현황</p>
          <p className="text-3xl font-black text-gray-800">
            {batchList.length}
            <span className="ml-1 text-base font-semibold text-gray-500">건</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            PASS <strong className="text-green-700">{batchList.filter((b) => b.ccp_pass).length}건</strong>
            &nbsp;/ FAIL <strong className="text-red-600">{batchList.filter((b) => !b.ccp_pass).length}건</strong>
          </p>
          <div className="mt-2 flex items-center gap-1">
            {batchList.map((b) => (
              <div
                key={b.id}
                title={`${b.batch_no} — ${b.ccp_pass ? 'PASS' : 'FAIL'}`}
                className="h-3 flex-1 rounded-sm"
                style={{ background: b.ccp_pass ? '#16A34A' : '#DC2626', opacity: 0.8 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 시간별 버무림실 온도 추이 바 차트 */}
      <div className="mb-6 rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">시간별 버무림실 온도 추이 (지난 8시간)</h3>
          <span className="text-xs text-gray-400">CCP 기준선: {CCP3.roomTempMax}°C</span>
        </div>
        <div className="flex h-40 items-end gap-3">
          {chartData.map((log) => {
            const barH = Math.round((log.room_temp / maxTemp) * 100)
            const limitLine = Math.round((CCP3.roomTempMax / maxTemp) * 100)
            return (
              <div key={log.time} className="relative flex flex-1 flex-col items-center">
                <span className="mb-1 text-[10px] font-semibold" style={{ color: log.status === 'PASS' ? '#16A34A' : '#DC2626' }}>
                  {log.room_temp}
                </span>
                <div className="relative w-full" style={{ height: '100px' }}>
                  {/* CCP 기준선 (10°C) */}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-red-400"
                    style={{ bottom: `${limitLine}%` }}
                  />
                  <div
                    className="absolute bottom-0 w-full rounded-t-md transition-all"
                    style={{
                      height: `${barH}px`,
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
          <span className="flex items-center gap-1"><span className="inline-block w-4 border-t-2 border-dashed border-red-400" /> CCP 상한({CCP3.roomTempMax}°C)</span>
        </div>
      </div>

      {/* 필터 + 요약 + 온도 측정 등록 버튼 */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">날짜</label>
          <input
            type="date"
            defaultValue="2026-05-15"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-red-400 focus:outline-none"
          />
        </div>
        <div className="ml-auto flex items-center gap-6 text-xs">
          <span className="text-gray-500">총 배치: <strong className="text-gray-800">{summary.total}건</strong></span>
          <span className="text-red-600">FAIL: <strong>{summary.failCount}건</strong></span>
          <span style={{ color: summary.passRate >= 95 ? '#16A34A' : '#DC2626' }}>
            준수율: <strong>{summary.passRate}%</strong>
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-red-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-800 transition-colors"
          >
            온도 측정 등록
          </button>
        </div>
      </div>

      {/* 배치별 CCP 판정 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] table-auto">
              <thead>
                <tr className="bg-red-50">
                  {['배치번호', '재료', '시작시간', '버무림실(°C)', '재료온도(°C)', '소요(분)', 'CCP 판정', '작업자'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-red-800">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batchList.length === 0 ? (
                  <tr><td colSpan={8} className="py-14 text-center text-sm text-gray-400">배치 기록이 없습니다.</td></tr>
                ) : batchList.map((batch) => {
                  const roomPass = isRoomTempPass(batch.room_temp)
                  const matPass = isMaterialTempPass(batch.material_temp)
                  const durPass = isDurationPass(batch.duration_min)
                  return (
                    <tr
                      key={batch.id}
                      className="border-t border-gray-100 transition-colors hover:bg-red-50/30"
                      style={!batch.ccp_pass ? { background: 'rgba(220,38,38,0.04)' } : undefined}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-700">{batch.batch_no}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-semibold text-gray-800">{batch.material}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm text-gray-600">{batch.start_time}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${roomPass ? 'text-gray-800' : 'text-red-600'}`}>
                          {batch.room_temp}°C {!roomPass && '⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${matPass ? 'text-gray-800' : 'text-red-600'}`}>
                          {batch.material_temp}°C {!matPass && '⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-sm font-semibold ${durPass ? 'text-gray-800' : 'text-orange-600'}`}>
                          {batch.duration_min}분
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            batch.ccp_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {batch.ccp_pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-700">{batch.worker}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 온도 측정 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-black text-gray-800">CCP3 — 배치 온도 등록</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">배치번호</label>
                <input
                  type="text"
                  name="batch_no"
                  value={form.batch_no}
                  onChange={handleFormChange}
                  required
                  placeholder="예: MIX-20260515-004"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">재료</label>
                <select
                  name="material"
                  value={form.material}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                >
                  <option value="">선택</option>
                  {['배추김치', '깍두기', '총각김치', '열무김치', '파김치'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  버무림실 온도 (°C) — 기준: {CCP3.roomTempMax}°C 이하
                </label>
                <input
                  type="number"
                  name="room_temp"
                  value={form.room_temp}
                  onChange={handleFormChange}
                  step="0.1"
                  min="-10"
                  max="40"
                  required
                  placeholder="예: 8.5"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  재료 투입 온도 (°C) — 기준: {CCP3.materialTempMax}°C 이하
                </label>
                <input
                  type="number"
                  name="material_temp"
                  value={form.material_temp}
                  onChange={handleFormChange}
                  step="0.1"
                  min="-10"
                  max="30"
                  required
                  placeholder="예: 4.5"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  버무림 시간 (분) — 기준: {CCP3.durationMinPer500}~{CCP3.durationMaxPer500}분/500kg
                </label>
                <input
                  type="number"
                  name="duration_min"
                  value={form.duration_min}
                  onChange={handleFormChange}
                  min="0"
                  max="120"
                  required
                  placeholder="예: 52"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">작업자</label>
                <input
                  type="text"
                  name="worker"
                  value={form.worker}
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
