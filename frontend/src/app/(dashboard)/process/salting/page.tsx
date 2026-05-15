'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { saltingApi } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type SaltingStatus = '대기' | '진행중' | '완료임박' | '시간초과' | '이상' | '완료'
type QcResult = '합격' | '불합격' | '보류' | null
type MeasurementType = '초기' | '중간' | '최종'
type AlertType = '농도이탈' | '시간초과' | '온도이탈' | '완료임박'
type AlertLevel = '정보' | '경고' | '위험'
type ActiveTab = 'active' | 'concentration' | 'judgment' | 'statistics'

interface SaltingBatch {
  salting_batch_id: string
  lot_number: string
  raw_material_type: string
  input_weight_kg: number
  salt_used_kg: number
  target_salt_concentration_pct: number
  salting_temperature_c: number | null
  planned_duration_hours: number
  actual_duration_hours: number | null
  started_at: string
  target_completed_at: string
  actual_completed_at: string | null
  latest_concentration_pct: number | null
  qc_result: QcResult
  assigned_worker_name: string
  status: SaltingStatus
  season: string
}

interface ConcentrationLog {
  log_id: number
  salting_batch_id: string
  measurement_type: MeasurementType
  measured_concentration_pct: number
  is_within_limit: boolean
  deviation_pct: number | null
  measured_at: string
  measured_by: string
  note: string | null
}

interface SaltingAlert {
  alert_id: number
  salting_batch_id: string
  alert_type: AlertType
  alert_level: AlertLevel
  message: string
  is_acknowledged: boolean
  created_at: string
}

// ─── 빈 폴백 데이터 (API 실패 시) ───────────────────────────────────────────

const EMPTY_SALTING_BATCHES: SaltingBatch[] = []
const EMPTY_CONCENTRATION_LOGS: ConcentrationLog[] = []
const EMPTY_ALERTS: SaltingAlert[] = []

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getRemainingMinutes(targetCompleted: string): number {
  const target = new Date(targetCompleted).getTime()
  const current = now.getTime()
  return Math.round((target - current) / 60000)
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

function formatDateTimeFull(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getStatusStyle(status: SaltingStatus): { bg: string; text: string; border?: string } {
  switch (status) {
    case '대기': return { bg: 'bg-slate-100', text: 'text-slate-600' }
    case '진행중': return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border border-cyan-200' }
    case '완료임박': return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border border-orange-300' }
    case '시간초과': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border border-red-300' }
    case '이상': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border border-red-400' }
    case '완료': return { bg: 'bg-green-50', text: 'text-green-700' }
  }
}

function getAlertLevelStyle(level: AlertLevel): string {
  switch (level) {
    case '정보': return 'bg-blue-50 border-blue-200 text-blue-700'
    case '경고': return 'bg-orange-50 border-orange-300 text-orange-700'
    case '위험': return 'bg-red-50 border-red-400 text-red-700'
  }
}

function getConcentrationStatus(
  measured: number,
  target: number,
  rawMaterial: string
): { ok: boolean; critical: boolean; label: string } {
  const ccp = rawMaterial === '배추'
    ? { min: 10, max: 15 }
    : rawMaterial === '무'
    ? { min: 8, max: 12 }
    : { min: 6, max: 10 }
  const isCritical = measured < ccp.min || measured > ccp.max
  const isOk = Math.abs(measured - target) <= 1.0
  return {
    ok: isOk,
    critical: isCritical,
    label: isCritical ? 'CCP 이탈' : isOk ? '정상' : '경고',
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  unit,
  sub,
  color,
}: {
  label: string
  value: string | number
  unit?: string
  sub: string
  color: string
}) {
  return (
    <div
      className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <p className="mb-1 text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-3xl font-black" style={{ color }}>
        {value}
        {unit && <span className="ml-1 text-base font-semibold">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: SaltingStatus }) {
  const s = getStatusStyle(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.text} ${s.border ?? ''}`}
    >
      {status}
    </span>
  )
}

// ─── Countdown Timer Component ────────────────────────────────────────────────

function CountdownDisplay({ targetCompleted, status }: { targetCompleted: string; status: SaltingStatus }) {
  const rem = getRemainingMinutes(targetCompleted)
  if (status === '대기') return <span className="text-xs text-gray-400">대기 중</span>
  if (status === '완료') return <span className="text-xs text-green-600 font-semibold">완료</span>

  if (rem < 0) {
    const over = Math.abs(rem)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 inline-block" />
        {over}분 초과
      </span>
    )
  }
  if (rem <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-orange-500 inline-block" />
        {rem}분 남음
      </span>
    )
  }
  const h = Math.floor(rem / 60)
  const m = rem % 60
  return (
    <span className="text-xs font-semibold text-cyan-700">
      {h > 0 ? `${h}h ${m}m` : `${m}분`} 남음
    </span>
  )
}

// ─── Concentration Measurement Modal ─────────────────────────────────────────

function ConcentrationInputModal({
  batch,
  onClose,
  onSave,
}: {
  batch: SaltingBatch
  onClose: () => void
  onSave: (data: { measurement_type: MeasurementType; value: number; note: string }) => void
}) {
  const [measureType, setMeasureType] = useState<MeasurementType>('중간')
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')

  const numVal = parseFloat(value)
  const target = batch.target_salt_concentration_pct
  const isOk = !isNaN(numVal) && Math.abs(numVal - target) <= 1.0
  const isCritical = !isNaN(numVal) && (numVal < 10 || numVal > 15)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-800">소금 농도 측정 입력</h2>

        <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <span className="font-semibold">배치번호:</span> {batch.salting_batch_id}
          <span className="mx-3 text-gray-300">|</span>
          <span className="font-semibold">목표 농도:</span> {target}%
          <span className="mx-3 text-gray-300">|</span>
          <span className="font-semibold">허용:</span> {target - 1}~{target + 1}%
        </div>

        <div className="mb-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">측정 구분</label>
            <div className="flex gap-2">
              {(['초기', '중간', '최종'] as MeasurementType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMeasureType(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                    measureType === t
                      ? 'border-[#0891B2] bg-[#0891B2] text-white'
                      : 'border-gray-200 text-gray-600 hover:border-[#0891B2]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              측정 농도 (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="예: 12.3"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            />
          </div>

          {value && !isNaN(numVal) && (
            <div
              className={`rounded-lg border p-3 text-sm font-semibold ${
                isCritical
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : isOk
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : 'border-orange-300 bg-orange-50 text-orange-700'
              }`}
            >
              {isCritical
                ? `위험: CCP 한계기준(10~15%) 이탈! 즉시 조치 필요`
                : isOk
                ? `정상: 목표 범위(${target - 1}~${target + 1}%) 이내`
                : `경고: 목표 범위 이탈 (편차: ${(numVal - target).toFixed(1)}%)`}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">비고 (선택)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="특이사항 입력"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (!isNaN(numVal) && numVal > 0) {
                onSave({ measurement_type: measureType, value: numVal, note })
                onClose()
              }
            }}
            disabled={isNaN(numVal) || numVal <= 0}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: '#0891B2' }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Completion Judgment Modal ────────────────────────────────────────────────

function JudgmentModal({
  batch,
  concentrationLogs,
  onClose,
  onJudge,
}: {
  batch: SaltingBatch
  concentrationLogs: ConcentrationLog[]
  onClose: () => void
  onJudge: (batchId: string, result: '합격' | '불합격' | '보류', note: string) => void
}) {
  const [result, setResult] = useState<'합격' | '불합격' | '보류' | null>(null)
  const [note, setNote] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')

  const logs = concentrationLogs.filter(
    (l) => l.salting_batch_id === batch.salting_batch_id
  )
  const hasInitial = logs.some((l) => l.measurement_type === '초기')
  const hasMiddle = logs.some((l) => l.measurement_type === '중간')
  const hasFinal = logs.some((l) => l.measurement_type === '최종')
  const lastConc = batch.latest_concentration_pct
  const concOk = lastConc !== null && Math.abs(lastConc - batch.target_salt_concentration_pct) <= 1.0
  const rem = getRemainingMinutes(batch.target_completed_at)
  const timeOk = rem <= 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-gray-800">완료 판정</h2>
        <p className="mb-4 text-xs text-gray-500">
          {batch.salting_batch_id} · {batch.lot_number}
        </p>

        {/* 판정 체크리스트 */}
        <div className="mb-4 rounded-xl bg-gray-50 p-4">
          <p className="mb-2 text-xs font-bold text-gray-600">HACCP 판정 체크리스트</p>
          <div className="space-y-1.5">
            {[
              { label: '최종 소금 농도가 허용 범위 내', ok: concOk },
              { label: `절임 시간 최소 기준(4h) 이상`, ok: timeOk },
              { label: '초기 농도 측정 완료', ok: hasInitial },
              { label: '중간 농도 측정 완료', ok: hasMiddle },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    item.ok ? 'bg-green-500 text-white' : 'bg-red-100 text-red-500 border border-red-300'
                  }`}
                >
                  {item.ok ? '✓' : '✗'}
                </span>
                <span className={item.ok ? 'text-gray-700' : 'text-red-600'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 판정 버튼 */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-gray-600">판정 결과</p>
          <div className="flex gap-2">
            {(['합격', '불합격', '보류'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResult(r)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${
                  result === r
                    ? r === '합격'
                      ? 'border-green-500 bg-green-500 text-white'
                      : r === '불합격'
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-orange-400 bg-orange-400 text-white'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {result === '불합격' && (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-red-600">
              시정조치 내용 (필수 — HACCP 법적 요구)
            </label>
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              rows={3}
              placeholder="불합격 원인 및 시정조치 내용을 입력하세요"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-gray-600">판정 비고</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="판정 관련 특이사항"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0891B2] focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (result) {
                onJudge(batch.salting_batch_id, result, note)
                onClose()
              }
            }}
            disabled={!result || (result === '불합격' && !correctiveAction.trim())}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: '#0891B2' }}
          >
            판정 확정 (HACCP 기록)
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Active Batch List ───────────────────────────────────────────────────

function ActiveBatchTab({
  batches,
  onMeasure,
  onJudge,
}: {
  batches: SaltingBatch[]
  onMeasure: (batch: SaltingBatch) => void
  onJudge: (batch: SaltingBatch) => void
}) {
  const active = batches.filter((b) => b.status !== '완료')

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-sm">진행중인 배치가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] table-auto">
          <thead>
            <tr className="bg-[#F0F9FF]">
              {[
                '배치번호',
                'LOT',
                '원재료',
                '투입량(kg)',
                '목표농도',
                '최근측정',
                '시작시간',
                '남은시간',
                '온도(℃)',
                '담당자',
                '상태',
                '액션',
              ].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-[#0E7490]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((batch) => {
              const isAnomaly = batch.status === '이상' || batch.status === '시간초과'
              return (
                <tr
                  key={batch.salting_batch_id}
                  className="border-t border-gray-100 transition-colors hover:bg-[#F0F9FF]"
                  style={isAnomaly ? { background: 'rgba(220,38,38,0.03)' } : undefined}
                >
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs font-semibold text-gray-700">
                      {batch.salting_batch_id}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-gray-500">{batch.lot_number}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-gray-800">
                      {batch.raw_material_type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-gray-800">
                      {batch.input_weight_kg.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm font-semibold text-gray-700">
                      {batch.target_salt_concentration_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {batch.latest_concentration_pct !== null ? (
                      <span
                        className={`text-sm font-bold ${
                          Math.abs(
                            batch.latest_concentration_pct -
                              batch.target_salt_concentration_pct
                          ) <= 1
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {batch.latest_concentration_pct}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">미측정</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-gray-500">
                      {formatDateTime(batch.started_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <CountdownDisplay
                      targetCompleted={batch.target_completed_at}
                      status={batch.status}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    {batch.salting_temperature_c !== null ? (
                      <span
                        className={`text-xs font-semibold ${
                          batch.salting_temperature_c >= 15 && batch.salting_temperature_c <= 20
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {batch.salting_temperature_c}℃
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-gray-700">{batch.assigned_worker_name}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={batch.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onMeasure(batch)}
                        className="whitespace-nowrap rounded-lg border border-[#0891B2] px-2.5 py-1 text-xs font-semibold text-[#0891B2] hover:bg-[#F0F9FF]"
                      >
                        농도 입력
                      </button>
                      <button
                        onClick={() => onJudge(batch)}
                        className="whitespace-nowrap rounded-lg border border-green-500 px-2.5 py-1 text-xs font-semibold text-green-600 hover:bg-green-50"
                      >
                        완료 판정
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Concentration History ───────────────────────────────────────────────

function ConcentrationTab({
  batches,
  logs,
  selectedBatchId,
  onSelectBatch,
  onMeasure,
}: {
  batches: SaltingBatch[]
  logs: ConcentrationLog[]
  selectedBatchId: string
  onSelectBatch: (id: string) => void
  onMeasure: (batch: SaltingBatch) => void
}) {
  const selectedBatch = batches.find((b) => b.salting_batch_id === selectedBatchId)
  const batchLogs = logs
    .filter((l) => l.salting_batch_id === selectedBatchId)
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())

  if (!selectedBatch) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        배치 데이터가 없습니다.
      </div>
    )
  }

  const target = selectedBatch.target_salt_concentration_pct
  const maxChart = batchLogs.length > 0
    ? Math.max(...batchLogs.map((l) => l.measured_concentration_pct), target + 3)
    : target + 3
  const chartHeight = 140

  return (
    <div className="space-y-4">
      {/* 배치 선택 */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-500">배치 선택</label>
        <select
          value={selectedBatchId}
          onChange={(e) => onSelectBatch(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none"
        >
          {batches.map((b) => (
            <option key={b.salting_batch_id} value={b.salting_batch_id}>
              {b.salting_batch_id} ({b.raw_material_type} · {b.status})
            </option>
          ))}
        </select>
        <button
          onClick={() => onMeasure(selectedBatch)}
          className="ml-auto rounded-xl border border-[#0891B2] px-4 py-1.5 text-xs font-semibold text-[#0891B2] hover:bg-[#F0F9FF]"
        >
          + 농도 측정 입력
        </button>
      </div>

      {/* 차트 영역 */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <p className="mb-3 text-sm font-bold text-gray-700">소금 농도 시계열</p>
        {batchLogs.length === 0 ? (
          <div className="flex h-36 items-center justify-center text-sm text-gray-400">
            측정 이력이 없습니다.
          </div>
        ) : (
          <div className="relative" style={{ height: chartHeight + 40 }}>
            {/* Y축 라벨 */}
            <div className="absolute left-0 top-0 flex flex-col justify-between h-full pb-8 text-right pr-2">
              {[maxChart, Math.ceil((maxChart + 0) / 2), 0].map((v) => (
                <span key={v} className="text-[10px] text-gray-400">{v}%</span>
              ))}
            </div>
            {/* 차트 */}
            <div className="ml-8 h-full">
              <svg
                width="100%"
                height={chartHeight}
                viewBox={`0 0 ${Math.max(batchLogs.length * 80, 300)} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                {/* CCP 상한선 (15%) */}
                <line
                  x1="0" y1={chartHeight - (15 / maxChart) * chartHeight}
                  x2="100%" y2={chartHeight - (15 / maxChart) * chartHeight}
                  stroke="#DC2626" strokeWidth="1" strokeDasharray="4 2"
                />
                <text x="4" y={chartHeight - (15 / maxChart) * chartHeight - 2} fontSize="8" fill="#DC2626">CCP상한15%</text>
                {/* 목표 상한 */}
                <line
                  x1="0" y1={chartHeight - ((target + 1) / maxChart) * chartHeight}
                  x2="100%" y2={chartHeight - ((target + 1) / maxChart) * chartHeight}
                  stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2"
                />
                {/* 목표 농도 */}
                <line
                  x1="0" y1={chartHeight - (target / maxChart) * chartHeight}
                  x2="100%" y2={chartHeight - (target / maxChart) * chartHeight}
                  stroke="#0891B2" strokeWidth="1.5" strokeDasharray="6 2"
                />
                {/* 목표 하한 */}
                <line
                  x1="0" y1={chartHeight - ((target - 1) / maxChart) * chartHeight}
                  x2="100%" y2={chartHeight - ((target - 1) / maxChart) * chartHeight}
                  stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 2"
                />
                {/* CCP 하한선 (10%) */}
                <line
                  x1="0" y1={chartHeight - (10 / maxChart) * chartHeight}
                  x2="100%" y2={chartHeight - (10 / maxChart) * chartHeight}
                  stroke="#DC2626" strokeWidth="1" strokeDasharray="4 2"
                />
                {/* 데이터 포인트 */}
                {[...batchLogs].reverse().map((log, i) => {
                  const x = 40 + i * 80
                  const y = chartHeight - (log.measured_concentration_pct / maxChart) * chartHeight
                  const color = log.is_within_limit ? '#0891B2' : '#DC2626'
                  return (
                    <g key={log.log_id}>
                      {i > 0 && (
                        <line
                          x1={40 + (i - 1) * 80}
                          y1={chartHeight - ([...batchLogs].reverse()[i - 1].measured_concentration_pct / maxChart) * chartHeight}
                          x2={x} y2={y}
                          stroke={color} strokeWidth="1.5" opacity="0.6"
                        />
                      )}
                      <circle cx={x} cy={y} r="5" fill={color} />
                      <text x={x} y={y - 8} fontSize="9" fill={color} textAnchor="middle">
                        {log.measured_concentration_pct}%
                      </text>
                      <text x={x} y={chartHeight + 14} fontSize="8" fill="#9CA3AF" textAnchor="middle">
                        {log.measurement_type}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-6 bg-[#0891B2]" /> 목표 농도 ({target}%)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-6 border-t border-dashed border-[#F59E0B]" /> 허용 범위 (±1%)</span>
          <span className="flex items-center gap-1"><span className="inline-block h-[2px] w-6 border-t border-dashed border-[#DC2626]" /> CCP 한계기준 (10~15%)</span>
        </div>
      </div>

      {/* 측정 이력 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <p className="text-sm font-bold text-gray-700">측정 이력</p>
        </div>
        {batchLogs.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">측정 이력이 없습니다.</div>
        ) : (
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                {['측정구분', '농도(%)', '이탈여부', '측정자', '측정시간', '비고'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batchLogs.map((log) => (
                <tr key={log.log_id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold text-gray-700">{log.measurement_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${log.is_within_limit ? 'text-green-600' : 'text-red-600'}`}>
                      {log.measured_concentration_pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.is_within_limit ? (
                      <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">정상</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                        이탈 {log.deviation_pct !== null ? `(${log.deviation_pct > 0 ? '+' : ''}${log.deviation_pct}%)` : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{log.measured_by}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {formatDateTimeFull(log.measured_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{log.note ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Judgment ────────────────────────────────────────────────────────────

function JudgmentTab({
  batches,
  logs,
  onJudge,
}: {
  batches: SaltingBatch[]
  logs: ConcentrationLog[]
  onJudge: (batch: SaltingBatch) => void
}) {
  const pendingBatches = batches.filter(
    (b) => b.status !== '대기' && b.qc_result === null
  )
  const completedBatches = batches.filter((b) => b.qc_result !== null)

  return (
    <div className="space-y-5">
      {/* 판정 대기 */}
      <div>
        <p className="mb-3 text-sm font-bold text-gray-700">
          판정 대기 ({pendingBatches.length}건)
        </p>
        {pendingBatches.length === 0 ? (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white py-10 text-center text-sm text-gray-400">
            판정 대기 중인 배치가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingBatches.map((batch) => {
              const batchLogs = logs.filter((l) => l.salting_batch_id === batch.salting_batch_id)
              const concOk = batch.latest_concentration_pct !== null &&
                Math.abs(batch.latest_concentration_pct - batch.target_salt_concentration_pct) <= 1.0
              const rem = getRemainingMinutes(batch.target_completed_at)
              const timeOk = rem <= 0

              return (
                <div
                  key={batch.salting_batch_id}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{batch.salting_batch_id}</p>
                      <p className="text-xs text-gray-500">{batch.lot_number} · {batch.raw_material_type} · {batch.assigned_worker_name}</p>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-gray-400">투입량</p>
                      <p className="font-semibold text-gray-700">{batch.input_weight_kg}kg</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-gray-400">최근 농도</p>
                      <p className={`font-semibold ${concOk ? 'text-green-600' : 'text-red-600'}`}>
                        {batch.latest_concentration_pct !== null ? `${batch.latest_concentration_pct}%` : '미측정'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-gray-400">측정 횟수</p>
                      <p className="font-semibold text-gray-700">{batchLogs.length}회</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-2">
                      <p className="text-gray-400">경과 시간</p>
                      <p className={`font-semibold ${timeOk ? 'text-green-600' : 'text-orange-600'}`}>
                        {rem < 0 ? `${Math.abs(rem)}분 경과` : `${rem}분 남음`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onJudge(batch)}
                    className="w-full rounded-xl py-2.5 text-sm font-bold text-white"
                    style={{ background: '#0891B2' }}
                  >
                    완료 판정 처리
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 판정 완료 이력 */}
      {completedBatches.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-bold text-gray-700">판정 완료 이력</p>
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  {['배치번호', '원재료', '투입량', '최종농도', '판정결과', '담당자'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {completedBatches.map((b) => (
                  <tr key={b.salting_batch_id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{b.salting_batch_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.raw_material_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.input_weight_kg}kg</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                      {b.latest_concentration_pct !== null ? `${b.latest_concentration_pct}%` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        b.qc_result === '합격' ? 'bg-green-50 text-green-700' :
                        b.qc_result === '불합격' ? 'bg-red-50 text-red-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {b.qc_result}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.assigned_worker_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Statistics ──────────────────────────────────────────────────────────

function StatisticsTab({ batches }: { batches: SaltingBatch[] }) {
  const completed = batches.filter((b) => b.status === '완료')
  const passed = completed.filter((b) => b.qc_result === '합격').length
  const failed = completed.filter((b) => b.qc_result === '불합격').length
  const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0

  const saltUsageByMaterial: Record<string, { input: number; salt: number }> = {}
  batches.forEach((b) => {
    if (!saltUsageByMaterial[b.raw_material_type]) {
      saltUsageByMaterial[b.raw_material_type] = { input: 0, salt: 0 }
    }
    saltUsageByMaterial[b.raw_material_type].input += b.input_weight_kg
    saltUsageByMaterial[b.raw_material_type].salt += b.salt_used_kg
  })

  const totalInput = batches.reduce((s, b) => s + b.input_weight_kg, 0)
  const totalSalt = batches.reduce((s, b) => s + b.salt_used_kg, 0)
  const saltRatio = totalInput > 0 ? (totalSalt / totalInput).toFixed(3) : '0'

  const materials = Object.entries(saltUsageByMaterial)
  const maxInput = Math.max(...materials.map(([, v]) => v.input), 1)

  return (
    <div className="space-y-5">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #16A34A' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">품질 합격률</p>
          <p className={`text-3xl font-black ${passRate >= 98 ? 'text-green-600' : 'text-red-600'}`}>{passRate}%</p>
          <p className="mt-1 text-xs text-gray-400">기준: 98% 이상</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #0891B2' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">소금 원단위</p>
          <p className="text-3xl font-black text-[#0891B2]">{saltRatio}</p>
          <p className="mt-1 text-xs text-gray-400">kg소금 / kg원재료</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #D97706' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">총 투입량</p>
          <p className="text-3xl font-black text-[#D97706]">{totalInput.toLocaleString()}<span className="ml-1 text-base">kg</span></p>
          <p className="mt-1 text-xs text-gray-400">금일 전체 원재료</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #7C3AED' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">소금 사용량</p>
          <p className="text-3xl font-black text-[#7C3AED]">{totalSalt.toFixed(1)}<span className="ml-1 text-base">kg</span></p>
          <p className="mt-1 text-xs text-gray-400">금일 전체 소금</p>
        </div>
      </div>

      {/* 원재료별 투입량 차트 */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <p className="mb-4 text-sm font-bold text-gray-700">원재료별 소금 사용량</p>
        <div className="space-y-4">
          {materials.map(([material, { input, salt }]) => (
            <div key={material}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{material}</span>
                <span className="text-xs text-gray-500">
                  투입 {input}kg · 소금 {salt}kg · 원단위 {(salt / input).toFixed(3)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(input / maxInput) * 100}%`,
                      background: '#0891B2',
                    }}
                  />
                </div>
                <span className="min-w-[50px] text-right text-xs font-semibold text-gray-600">
                  {input}kg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 합격/불합격 도넛 */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <p className="mb-4 text-sm font-bold text-gray-700">배치 판정 현황</p>
        <div className="flex items-center gap-8">
          <div className="relative flex h-32 w-32 flex-shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
              {completed.length > 0 && (
                <circle
                  cx="18" cy="18" r="14"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="4"
                  strokeDasharray={`${(passed / completed.length) * 87.96} 87.96`}
                />
              )}
            </svg>
            <div className="absolute text-center">
              <p className="text-xl font-black text-gray-800">{passRate}%</p>
              <p className="text-[10px] text-gray-400">합격률</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">합격: <strong>{passed}건</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="text-sm text-gray-600">불합격: <strong>{failed}건</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-gray-200" />
              <span className="text-sm text-gray-600">진행중/대기: <strong>{batches.length - completed.length}건</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SaltingProcessPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('active')
  const [selectedBatchForMeasure, setSelectedBatchForMeasure] = useState<SaltingBatch | null>(null)
  const [selectedBatchForJudgment, setSelectedBatchForJudgment] = useState<SaltingBatch | null>(null)
  const [alerts, setAlerts] = useState<SaltingAlert[]>(EMPTY_ALERTS)
  const [showAlertPanel, setShowAlertPanel] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  // 오늘의 절임 배치 목록
  const { data: batchesRaw, isLoading } = useQuery(
    ['salting', 'batches', today],
    () =>
      saltingApi
        .getBatches({ date: today })
        .then((res) => (res.data as { data?: SaltingBatch[] }).data ?? (res.data as SaltingBatch[])),
    {
      staleTime: 30_000,
      onError: () => {},
    }
  )

  const batches: SaltingBatch[] = Array.isArray(batchesRaw) ? batchesRaw : EMPTY_SALTING_BATCHES

  // 농도 이력은 진행중 배치별로 개별 조회하는 대신
  // 배치 목록 조회 후 각 배치 ID로 조회하는 방식.
  // 백엔드 미구현 대비: 전체 배치의 농도 이력을 하나씩 불러오되 실패 시 빈 배열 사용.
  // 선택된 배치의 농도 이력 (농도 탭에서 사용)
  const [selectedConcentrationBatchId, setSelectedConcentrationBatchId] = useState<string>('')

  const targetBatchId =
    selectedConcentrationBatchId ||
    batches.find((b) => b.status !== '완료')?.salting_batch_id ||
    batches[0]?.salting_batch_id ||
    ''

  const { data: concentrationLogsRaw } = useQuery(
    ['salting', 'concentration', targetBatchId],
    () =>
      saltingApi
        .getConcentrationLogs(targetBatchId)
        .then((res) => (res.data as { data?: ConcentrationLog[] }).data ?? (res.data as ConcentrationLog[])),
    {
      enabled: !!targetBatchId,
      staleTime: 30_000,
      onError: () => {},
    }
  )

  const concentrationLogs: ConcentrationLog[] = Array.isArray(concentrationLogsRaw)
    ? concentrationLogsRaw
    : EMPTY_CONCENTRATION_LOGS

  // 농도 측정 등록 mutation
  const recordConcentrationMutation = useMutation(
    ({ batchId, data }: { batchId: string; data: Record<string, unknown> }) =>
      saltingApi.recordConcentration(batchId, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['salting', 'concentration', variables.batchId])
        queryClient.invalidateQueries(['salting', 'batches', today])
      },
    }
  )

  // 완료 판정 mutation
  const completeBatchMutation = useMutation(
    ({ batchId, data }: { batchId: string; data: Record<string, unknown> }) =>
      saltingApi.completeBatch(batchId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['salting', 'batches', today])
      },
    }
  )

  const summary = useMemo(() => {
    const inProgress = batches.filter((b) => ['진행중', '완료임박', '시간초과', '이상'].includes(b.status)).length
    const todayCompleted = batches.filter((b) => b.status === '완료').length
    const anomaly = batches.filter((b) => b.status === '이상' || b.status === '시간초과').length
    const completed = batches.filter((b) => b.status === '완료')
    const passed = completed.filter((b) => b.qc_result === '합격').length
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 100
    return { inProgress, todayCompleted, anomaly, passRate }
  }, [batches])

  const unacknowledgedCount = alerts.filter((a) => !a.is_acknowledged).length
  const criticalAlerts = alerts.filter((a) => a.alert_level === '위험' && !a.is_acknowledged)

  const handleAcknowledge = useCallback((alertId: number) => {
    setAlerts((prev) =>
      prev.map((a) => (a.alert_id === alertId ? { ...a, is_acknowledged: true } : a))
    )
  }, [])

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'active', label: '진행중 배치' },
    { key: 'concentration', label: '소금 농도 이력' },
    { key: 'judgment', label: '완료 판정' },
    { key: 'statistics', label: '통계' },
  ]

  return (
    <div className="relative">
      {/* 위험 등급 배너 */}
      {criticalAlerts.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-400 bg-red-50 px-4 py-3">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">!</span>
          <p className="flex-1 text-sm font-semibold text-red-700">
            {criticalAlerts[0].message}
          </p>
          <button
            onClick={() => handleAcknowledge(criticalAlerts[0].alert_id)}
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            확인
          </button>
        </div>
      )}

      <PageHeader
        title="절임 공정 관리"
        subtitle="HACCP CCP-2 절임 배치 현황 및 소금 농도 관리"
        breadcrumbs={[{ label: '공정관리' }, { label: '절임 공정' }]}
      />

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="진행중 배치"
          value={isLoading ? '-' : summary.inProgress}
          sub="현재 절임 중인 배치 수"
          color="#0891B2"
        />
        <SummaryCard
          label="오늘 완료"
          value={isLoading ? '-' : summary.todayCompleted}
          sub="금일 완료된 배치 수"
          color="#16A34A"
        />
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.anomaly > 0 ? '#DC2626' : '#6B7280'}` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold text-gray-500">이상 발생</p>
              <p
                className="text-3xl font-black"
                style={{ color: summary.anomaly > 0 ? '#DC2626' : '#6B7280' }}
              >
                {isLoading ? '-' : summary.anomaly}
              </p>
              <p className="mt-1 text-xs text-gray-400">미해결 이상 건수</p>
            </div>
            {unacknowledgedCount > 0 && (
              <button
                onClick={() => setShowAlertPanel(true)}
                className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white"
              >
                {unacknowledgedCount}
              </button>
            )}
          </div>
        </div>
        <SummaryCard
          label="품질 합격률"
          value={isLoading ? '-' : summary.passRate}
          unit="%"
          sub="기준: 98% 이상"
          color={summary.passRate >= 98 ? '#16A34A' : '#DC2626'}
        />
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-5 border-b border-gray-200">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-[#0891B2] text-[#0891B2]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key === 'judgment' && batches.filter((b) => b.status !== '대기' && b.qc_result === null).length > 0 && (
                <span className="ml-1.5 rounded-full bg-orange-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {batches.filter((b) => b.status !== '대기' && b.qc_result === null).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'active' && (
            <ActiveBatchTab
              batches={batches}
              onMeasure={setSelectedBatchForMeasure}
              onJudge={setSelectedBatchForJudgment}
            />
          )}
          {activeTab === 'concentration' && (
            <ConcentrationTab
              batches={batches}
              logs={concentrationLogs}
              selectedBatchId={targetBatchId}
              onSelectBatch={setSelectedConcentrationBatchId}
              onMeasure={setSelectedBatchForMeasure}
            />
          )}
          {activeTab === 'judgment' && (
            <JudgmentTab
              batches={batches}
              logs={concentrationLogs}
              onJudge={setSelectedBatchForJudgment}
            />
          )}
          {activeTab === 'statistics' && <StatisticsTab batches={batches} />}
        </>
      )}

      {/* 알림 패널 */}
      {showAlertPanel && (
        <div
          className="fixed inset-0 z-40 flex justify-end"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowAlertPanel(false)}
        >
          <div
            className="flex h-full w-80 flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4">
              <p className="font-bold text-gray-800">이상 알림</p>
              <button
                onClick={() => setShowAlertPanel(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {alerts.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">알림이 없습니다.</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    className={`rounded-xl border p-3 transition-opacity ${
                      getAlertLevelStyle(alert.alert_level)
                    } ${alert.is_acknowledged ? 'opacity-50' : ''}`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <span className="text-xs font-bold">[{alert.alert_level}] {alert.alert_type}</span>
                      {!alert.is_acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.alert_id)}
                          className="flex-shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold shadow-sm"
                        >
                          확인
                        </button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed">{alert.message}</p>
                    <p className="mt-1 text-[10px] opacity-60">{formatDateTimeFull(alert.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 알림 패널 열기 버튼 (미확인 있을 때) */}
      {unacknowledgedCount > 0 && !showAlertPanel && (
        <button
          onClick={() => setShowAlertPanel(true)}
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600"
        >
          <span className="text-lg font-bold">{unacknowledgedCount}</span>
        </button>
      )}

      {/* 모달들 */}
      {selectedBatchForMeasure && (
        <ConcentrationInputModal
          batch={selectedBatchForMeasure}
          onClose={() => setSelectedBatchForMeasure(null)}
          onSave={(data) => {
            recordConcentrationMutation.mutate({
              batchId: selectedBatchForMeasure.salting_batch_id,
              data: {
                measurement_type: data.measurement_type,
                measured_concentration_pct: data.value,
                note: data.note,
              },
            })
            setSelectedBatchForMeasure(null)
          }}
        />
      )}
      {selectedBatchForJudgment && (
        <JudgmentModal
          batch={selectedBatchForJudgment}
          concentrationLogs={concentrationLogs}
          onClose={() => setSelectedBatchForJudgment(null)}
          onJudge={(batchId, result, note) => {
            completeBatchMutation.mutate({
              batchId,
              data: { qc_result: result, note },
            })
            setSelectedBatchForJudgment(null)
          }}
        />
      )}
    </div>
  )
}
