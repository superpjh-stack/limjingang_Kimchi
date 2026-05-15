'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { washingApi } from '@/lib/api'

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

type MaterialType = 'CABBAGE' | 'RADISH' | 'GREEN_ONION' | 'MUSTARD_GREEN' | 'OTHER'
type BatchStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'DISCARDED'

interface WashingBatch {
  batch_id: string
  work_order_id: string
  material_type: MaterialType
  input_weight_kg: number
  wash_count: number
  water_temperature_c: number
  status: BatchStatus
  operator_name: string
  start_time: string | null
  foreign_matter_detected: boolean
  quality_grade: 'A' | 'B' | 'C' | null
}

interface WashingStandard {
  material_type: MaterialType
  material_label: string
  min_wash_count: number
  min_water_temp_c: number
  max_water_temp_c: number
  wash_method: string
  haccp_ccp_code: string
}

interface BatchRegisterForm {
  work_order_id: string
  material_type: MaterialType | ''
  input_weight_kg: string
  water_temperature_c: string
  remarks: string
}

// ─── 채소별 세척 기준 (하드코딩) ─────────────────────────────────────────────

const WASHING_STANDARDS: Record<MaterialType, WashingStandard> = {
  CABBAGE: {
    material_type: 'CABBAGE',
    material_label: '배추',
    min_wash_count: 3,
    min_water_temp_c: 5,
    max_water_temp_c: 15,
    wash_method: '침지 + 브러시',
    haccp_ccp_code: 'CCP-W1',
  },
  RADISH: {
    material_type: 'RADISH',
    material_label: '무',
    min_wash_count: 2,
    min_water_temp_c: 5,
    max_water_temp_c: 15,
    wash_method: '고압 세척 + 침지',
    haccp_ccp_code: 'CCP-W1',
  },
  GREEN_ONION: {
    material_type: 'GREEN_ONION',
    material_label: '파',
    min_wash_count: 3,
    min_water_temp_c: 5,
    max_water_temp_c: 15,
    wash_method: '흐르는 물 + 침지',
    haccp_ccp_code: 'CCP-W1',
  },
  MUSTARD_GREEN: {
    material_type: 'MUSTARD_GREEN',
    material_label: '갓',
    min_wash_count: 3,
    min_water_temp_c: 5,
    max_water_temp_c: 12,
    wash_method: '침지 + 흐르는 물',
    haccp_ccp_code: 'CCP-W1',
  },
  OTHER: {
    material_type: 'OTHER',
    material_label: '기타',
    min_wash_count: 2,
    min_water_temp_c: 5,
    max_water_temp_c: 15,
    wash_method: '흐르는 물',
    haccp_ccp_code: 'CCP-W1',
  },
}

const MATERIAL_LABELS: Record<MaterialType, string> = {
  CABBAGE: '배추',
  RADISH: '무',
  GREEN_ONION: '파',
  MUSTARD_GREEN: '갓',
  OTHER: '기타',
}

// ─── 폴백 데이터 (API 실패 시 빈 기본값) ─────────────────────────────────────

const EMPTY_BATCHES: WashingBatch[] = []

interface DailyStat { date: string; kg: number }
interface MaterialStat { material: string; kg: number; color: string }

const FALLBACK_DAILY_STATS: DailyStat[] = []
const FALLBACK_MATERIAL_STATS: MaterialStat[] = []

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

function calcElapsed(startTime: string | null): string {
  if (!startTime || startTime === '-') return '-'
  const [h, m] = startTime.split(':').map(Number)
  const now = new Date()
  const start = new Date()
  start.setHours(h, m, 0, 0)
  const diffMs = now.getTime() - start.getTime()
  if (diffMs < 0) return '-'
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin >= 60) return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`
  return `${diffMin}m`
}

// ─── 상태 배지 ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BatchStatus,
  { label: string; className: string }
> = {
  WAITING: { label: '대기', className: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { label: '진행중', className: 'bg-cyan-100 text-cyan-700' },
  COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700' },
  ON_HOLD: { label: '보류', className: 'bg-orange-100 text-orange-700' },
  DISCARDED: { label: '폐기', className: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }: { status: BatchStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  )
}

// ─── 스켈레톤 ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className ?? ''}`} />
}

// ─── 탭1: 오늘 현황 ───────────────────────────────────────────────────────────

function TodayTab({ batches, isLoading }: { batches: WashingBatch[]; isLoading: boolean }) {
  const summary = useMemo(() => {
    const totalKg = batches
      .filter((b) => b.status === 'COMPLETED')
      .reduce((s, b) => s + b.input_weight_kg, 0)
    const completedCount = batches.filter((b) => b.status === 'COMPLETED').length
    const inProgressCount = batches.filter((b) => b.status === 'IN_PROGRESS').length
    const foreignMatterCount = batches.filter((b) => b.foreign_matter_detected).length
    return { totalKg, completedCount, inProgressCount, foreignMatterCount }
  }, [batches])

  const hasForeignMatterAlert = summary.foreignMatterCount > 0

  const kpiCards = [
    {
      title: '총 세척량',
      value: `${summary.totalKg.toLocaleString()} kg`,
      sub: '완료 배치 기준',
      accent: '#0891B2',
    },
    {
      title: '완료 배치',
      value: `${summary.completedCount} 건`,
      sub: '금일 완료된 배치',
      accent: '#16A34A',
    },
    {
      title: '진행중',
      value: `${summary.inProgressCount} 건`,
      sub: '현재 세척 진행 중',
      accent: '#0891B2',
    },
    {
      title: '이물질 검출',
      value: `${summary.foreignMatterCount} 건`,
      sub: hasForeignMatterAlert ? '처리 필요' : '이상 없음',
      accent: hasForeignMatterAlert ? '#DC2626' : '#16A34A',
    },
  ]

  return (
    <div>
      {/* KPI 카드 */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((card) =>
          isLoading ? (
            <div
              key={card.title}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
            >
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="mb-1 h-8 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <div
              key={card.title}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
              style={{ borderTop: `3px solid ${card.accent}` }}
            >
              <p className="mb-1 text-xs font-semibold text-gray-500">{card.title}</p>
              <p className="text-3xl font-black" style={{ color: card.accent }}>
                {card.value}
              </p>
              <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
            </div>
          )
        )}
      </div>

      {/* 이물질 경보 배너 */}
      {hasForeignMatterAlert && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-3">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-bold text-red-700">
              이물질 검출 경보 — {summary.foreignMatterCount}건 처리 필요
            </p>
            <p className="text-xs text-red-600">
              보류 상태의 배치를 즉시 확인하고 품질관리자의 처리 지시를 진행하세요.
            </p>
          </div>
        </div>
      )}

      {/* 배치 현황 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="border-b border-[#E2E8F0] bg-[#F0F9FF] px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0E7490]">배치 현황</h3>
          <span className="text-xs text-gray-400">총 {batches.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F0F9FF]">
                {[
                  '배치번호',
                  '작업지시',
                  '원재료',
                  '투입량(kg)',
                  '세척횟수',
                  '수온(℃)',
                  '상태',
                  '작업자',
                  '시작시간',
                  '경과시간',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-[#0E7490] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-[#E2E8F0]">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-sm text-gray-400">
                    등록된 세척 배치가 없습니다.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const std = WASHING_STANDARDS[batch.material_type]
                  const tempAlert =
                    batch.status !== 'WAITING' &&
                    (batch.water_temperature_c < std.min_water_temp_c ||
                      batch.water_temperature_c > std.max_water_temp_c)

                  return (
                    <tr
                      key={batch.batch_id}
                      className="border-t border-[#E2E8F0] transition-colors hover:bg-[#F0F9FF]"
                      style={
                        batch.status === 'ON_HOLD' || batch.status === 'DISCARDED'
                          ? { backgroundColor: 'rgba(220,38,38,0.04)' }
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">
                        {batch.batch_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {batch.work_order_id}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">
                        {MATERIAL_LABELS[batch.material_type]}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 whitespace-nowrap">
                        {batch.input_weight_kg.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`text-sm font-bold ${
                            batch.wash_count >= std.min_wash_count
                              ? 'text-green-600'
                              : 'text-orange-600'
                          }`}
                        >
                          {batch.status === 'WAITING' ? '-' : batch.wash_count}
                        </span>
                        {batch.status !== 'WAITING' && (
                          <span className="ml-1 text-xs text-gray-400">
                            / {std.min_wash_count}회
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {batch.status === 'WAITING' ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          <span
                            className={`text-sm font-semibold ${
                              tempAlert ? 'text-red-600' : 'text-gray-800'
                            }`}
                          >
                            {batch.water_temperature_c}
                            {tempAlert && (
                              <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-600">
                                FAIL
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {batch.operator_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                        {batch.start_time ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {batch.status === 'WAITING'
                          ? '-'
                          : batch.status === 'COMPLETED'
                          ? '완료'
                          : calcElapsed(batch.start_time)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── 탭2: 배치 등록 ───────────────────────────────────────────────────────────

const WORK_ORDER_OPTIONS = [
  'WO-20260515-009',
  'WO-20260515-010',
  'WO-20260515-011',
]

function RegisterTab() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BatchRegisterForm>({
    work_order_id: '',
    material_type: '',
    input_weight_kg: '',
    water_temperature_c: '',
    remarks: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const selectedStandard =
    form.material_type ? WASHING_STANDARDS[form.material_type as MaterialType] : null

  const createMutation = useMutation(
    (data: Record<string, unknown>) => washingApi.createBatch(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['washing', 'batches'])
        setSubmitted(true)
        setSubmitError(null)
        setTimeout(() => setSubmitted(false), 3000)
        setForm({
          work_order_id: '',
          material_type: '',
          input_weight_kg: '',
          water_temperature_c: '',
          remarks: '',
        })
      },
      onError: () => {
        setSubmitError('배치 등록에 실패했습니다. 다시 시도해주세요.')
      },
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    createMutation.mutate({
      work_order_id: form.work_order_id,
      material_type: form.material_type,
      input_weight_kg: parseFloat(form.input_weight_kg),
      water_temperature_c: parseFloat(form.water_temperature_c),
      remarks: form.remarks,
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 배치 등록 폼 */}
      <div
        className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
        style={{ borderTop: '3px solid #0891B2' }}
      >
        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <h3 className="text-sm font-bold text-gray-800">세척 배치 등록</h3>
          <p className="mt-0.5 text-xs text-gray-400">배치번호는 등록 시 자동 채번됩니다 (WASH-YYYYMMDD-NNN)</p>
        </div>

        {submitted && (
          <div className="mx-5 mt-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            배치가 성공적으로 등록되었습니다. (상태: 대기)
          </div>
        )}
        {submitError && (
          <div className="mx-5 mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* 작업지시 선택 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              작업지시번호 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.work_order_id}
              onChange={(e) => setForm((f) => ({ ...f, work_order_id: e.target.value }))}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            >
              <option value="">-- 작업지시 선택 --</option>
              {WORK_ORDER_OPTIONS.map((wo) => (
                <option key={wo} value={wo}>{wo}</option>
              ))}
            </select>
          </div>

          {/* 원재료 종류 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              원재료 종류 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.material_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, material_type: e.target.value as MaterialType | '' }))
              }
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            >
              <option value="">-- 원재료 선택 --</option>
              {Object.entries(MATERIAL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* 세척 기준 자동 표시 */}
          {selectedStandard && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="mb-2 text-xs font-bold text-cyan-800">
                {selectedStandard.material_label} 세척 기준 (HACCP {selectedStandard.haccp_ccp_code})
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-cyan-700">
                <div>
                  <span className="font-semibold">최소 세척 횟수:</span>{' '}
                  {selectedStandard.min_wash_count}회
                </div>
                <div>
                  <span className="font-semibold">허용 수온:</span>{' '}
                  {selectedStandard.min_water_temp_c}~{selectedStandard.max_water_temp_c}℃
                </div>
                <div className="col-span-2">
                  <span className="font-semibold">세척 방법:</span> {selectedStandard.wash_method}
                </div>
              </div>
            </div>
          )}

          {/* 투입량 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              투입량(kg) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="예: 850.00"
              value={form.input_weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, input_weight_kg: e.target.value }))}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            />
          </div>

          {/* 수온 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              세척수 온도(℃) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              step="0.1"
              placeholder="예: 8.5"
              value={form.water_temperature_c}
              onChange={(e) => setForm((f) => ({ ...f, water_temperature_c: e.target.value }))}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            />
            {selectedStandard &&
              form.water_temperature_c &&
              (parseFloat(form.water_temperature_c) < selectedStandard.min_water_temp_c ||
                parseFloat(form.water_temperature_c) > selectedStandard.max_water_temp_c) && (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  수온 기준 이탈 ({selectedStandard.min_water_temp_c}~{selectedStandard.max_water_temp_c}℃)
                </p>
              )}
          </div>

          {/* 비고 */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">비고</label>
            <textarea
              rows={3}
              placeholder="특이사항을 입력하세요..."
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-gray-700 focus:border-[#0891B2] focus:outline-none focus:ring-1 focus:ring-[#0891B2]"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="w-full rounded-xl bg-[#0891B2] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0E7490] disabled:opacity-60"
          >
            {createMutation.isLoading ? '등록 중...' : '배치 등록 (상태: 대기)'}
          </button>
        </form>
      </div>

      {/* 배치 상세 진행 화면 */}
      <div
        className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm"
        style={{ borderTop: '3px solid #16A34A' }}
      >
        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <h3 className="text-sm font-bold text-gray-800">배치 상세 진행 화면</h3>
          <p className="mt-0.5 text-xs text-gray-400">진행중인 배치의 실시간 작업 현황</p>
        </div>
        <div className="p-5">
          {/* 예시 진행 배치 — WASH-20260515-004 */}
          <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-[#F0F9FF] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-gray-700">WASH-20260515-004</span>
              <StatusBadge status="IN_PROGRESS" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div><span className="font-semibold">원재료:</span> 배추</div>
              <div><span className="font-semibold">작업지시:</span> WO-20260515-004</div>
              <div><span className="font-semibold">투입량:</span> 920 kg</div>
              <div><span className="font-semibold">작업자:</span> 최지원</div>
              <div><span className="font-semibold">시작시간:</span> 10:00</div>
              <div><span className="font-semibold">HACCP:</span> CCP-W1</div>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="mb-2 text-xs font-bold text-gray-700">세척 횟수</p>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0891B2] text-xl font-black text-white">
                3
              </div>
              <div className="text-xs text-gray-500">
                <p>기준: 최소 3회</p>
                <p className="font-semibold text-green-600">기준 충족</p>
              </div>
              <button className="ml-auto rounded-lg border border-[#0891B2] px-3 py-1.5 text-xs font-semibold text-[#0891B2] hover:bg-[#F0F9FF]">
                +1 세척
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <button className="flex-1 rounded-xl border border-orange-300 bg-orange-50 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100">
              이물질 검출 등록
            </button>
            <button className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700">
              세척 완료 처리
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            완료 처리 시 품질 등급(A/B/C) 선택이 필요합니다.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── 탭3: 통계 ────────────────────────────────────────────────────────────────

function StatsTab({
  dailyStats,
  materialStats,
  isLoading,
}: {
  dailyStats: DailyStat[]
  materialStats: MaterialStat[]
  isLoading: boolean
}) {
  const maxKg = dailyStats.length > 0 ? Math.max(...dailyStats.map((d) => d.kg)) : 0
  const totalMaterialKg = materialStats.reduce((s, m) => s + m.kg, 0)

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-2xl border border-[#E2E8F0] bg-gray-100"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 일별 세척량 바 차트 */}
      <div
        className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
        style={{ borderTop: '3px solid #0891B2' }}
      >
        <h3 className="mb-4 text-sm font-bold text-gray-800">일별 세척량 (최근 7일)</h3>
        {dailyStats.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            통계 데이터가 없습니다.
          </div>
        ) : (
          <div className="flex items-end gap-2" style={{ height: 160 }}>
            {dailyStats.map((d) => {
              const heightPct = maxKg > 0 ? (d.kg / maxKg) * 100 : 0
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-gray-500">
                    {d.kg.toLocaleString()}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-300"
                    style={{
                      height: `${heightPct}%`,
                      minHeight: 4,
                      backgroundColor: '#0891B2',
                      opacity: 0.8,
                    }}
                  />
                  <span className="text-[10px] text-gray-400">{d.date}</span>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-center text-xs text-gray-400">단위: kg</p>
      </div>

      {/* 원재료별 도넛 차트 */}
      <div
        className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
        style={{ borderTop: '3px solid #16A34A' }}
      >
        <h3 className="mb-4 text-sm font-bold text-gray-800">원재료별 세척량 비율</h3>
        {materialStats.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            통계 데이터가 없습니다.
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-[#F0F9FF]">
              {totalMaterialKg > 0 && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: (() => {
                      let cumulative = 0
                      const segments = materialStats.map((m) => {
                        const start = (cumulative / totalMaterialKg) * 100
                        cumulative += m.kg
                        const end = (cumulative / totalMaterialKg) * 100
                        return `${m.color} ${start}% ${end}%`
                      })
                      return `conic-gradient(${segments.join(', ')})`
                    })(),
                  }}
                />
              )}
              <div className="absolute inset-[18px] rounded-full bg-white" />
              <span className="relative text-xs font-bold text-gray-600">합계</span>
            </div>
            <div className="flex-1 space-y-2">
              {materialStats.map((m) => (
                <div key={m.material} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-xs text-gray-600">{m.material}</span>
                  <span className="ml-auto text-xs font-semibold text-gray-800">
                    {m.kg.toLocaleString()} kg
                  </span>
                  <span className="w-9 text-right text-xs text-gray-400">
                    {totalMaterialKg > 0 ? Math.round((m.kg / totalMaterialKg) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-gray-400">
          오늘 기준 원재료별 세척량 합계: {totalMaterialKg.toLocaleString()} kg
        </p>
      </div>
    </div>
  )
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

type TabKey = 'today' | 'register' | 'stats'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'today', label: '오늘 현황' },
  { key: 'register', label: '배치 등록' },
  { key: 'stats', label: '통계' },
]

export default function WashingProcessPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('today')

  const today = new Date().toISOString().split('T')[0]

  // 오늘의 세척 배치 목록
  const { data, isLoading } = useQuery(
    ['washing', 'batches', today],
    () =>
      washingApi
        .getBatches({ date: today })
        .then((res) => (res.data as { data?: WashingBatch[] }).data ?? (res.data as WashingBatch[])),
    {
      staleTime: 30_000,
      onError: () => {
        // API 실패 시 조용히 빈 배열로 폴백
      },
    }
  )

  // 일별 통계
  const { data: dailyStatsRaw, isLoading: isStatsLoading } = useQuery(
    ['washing', 'stats', 'daily', today],
    () =>
      washingApi
        .getDailyStats(today)
        .then((res) => (res.data as { data?: DailyStat[] }).data ?? (res.data as DailyStat[])),
    {
      staleTime: 60_000,
      onError: () => {},
    }
  )

  // 원재료별 통계는 배치 데이터에서 집계
  const batches: WashingBatch[] = Array.isArray(data) ? data : EMPTY_BATCHES
  const dailyStats: DailyStat[] = Array.isArray(dailyStatsRaw)
    ? dailyStatsRaw
    : FALLBACK_DAILY_STATS

  const MATERIAL_COLORS: Record<MaterialType, string> = {
    CABBAGE: '#0891B2',
    RADISH: '#16A34A',
    GREEN_ONION: '#D97706',
    MUSTARD_GREEN: '#7C3AED',
    OTHER: '#64748B',
  }

  const materialStats: MaterialStat[] = useMemo(() => {
    const acc: Record<string, number> = {}
    batches.forEach((b) => {
      const label = MATERIAL_LABELS[b.material_type]
      acc[label] = (acc[label] ?? 0) + b.input_weight_kg
    })
    return Object.entries(acc).map(([material, kg]) => {
      const typeKey = Object.entries(MATERIAL_LABELS).find(([, v]) => v === material)?.[0]
      const color = typeKey ? (MATERIAL_COLORS[typeKey as MaterialType] ?? '#64748B') : '#64748B'
      return { material, kg, color }
    })
  }, [batches])

  return (
    <div>
      <PageHeader
        title="세척 공정 관리"
        subtitle="원재료 세척 배치 현황 및 품질 기록을 관리합니다."
        breadcrumbs={[{ label: '공정관리' }, { label: '세척' }]}
      />

      {/* 탭 네비게이션 */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#0891B2] bg-[#F0F9FF] text-[#0891B2]'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'today' && <TodayTab batches={batches} isLoading={isLoading} />}
      {activeTab === 'register' && <RegisterTab />}
      {activeTab === 'stats' && (
        <StatsTab
          dailyStats={dailyStats}
          materialStats={materialStats}
          isLoading={isStatsLoading}
        />
      )}
    </div>
  )
}
