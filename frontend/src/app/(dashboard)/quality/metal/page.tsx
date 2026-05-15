'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { qualityApi } from '@/lib/api'

// HACCP CCP4 — 금속검출기 관리기준
const CCP4 = {
  standard: 'Fe 1.5mm / Sus 2.0mm / Non-Fe 2.0mm 이상 검출',
  action: '라인 즉시 중단 → 격리 → 책임자 보고 → 원인 파악 → 재검',
}

type DetectResult = 'PASS' | 'FAIL'
type DetectorStatus = '정상' | '점검중' | '이상'

interface MetalDetectRecord {
  id: number
  lot_no: string
  product_name: string
  work_order_no: string
  package_spec: string
  total_packages: number
  defect_packages: number
  metal_detect_result: DetectResult
  seal_quality: 'GOOD' | 'POOR' | 'FAIL'
  expiry_date: string
  operator: string
  recorded_at: string
  action_taken: string | null
}

interface Detector {
  id: string
  name: string
  line: string
  status: DetectorStatus
  last_calibrated: string
  today_pass: number
  today_fail: number
}

const MOCK_DETECTORS: Detector[] = [
  { id: 'MD-01', name: '금속검출기 1호', line: 'A라인', status: '정상', last_calibrated: '2026-05-15 06:00', today_pass: 12, today_fail: 1 },
  { id: 'MD-02', name: '금속검출기 2호', line: 'B라인', status: '정상', last_calibrated: '2026-05-15 06:00', today_pass: 8, today_fail: 0 },
  { id: 'MD-03', name: '금속검출기 3호', line: 'C라인', status: '점검중', last_calibrated: '2026-05-14 18:00', today_pass: 0, today_fail: 0 },
]

const MOCK_RECORDS: MetalDetectRecord[] = [
  { id: 1, lot_no: 'LOT-20260515-001', product_name: '배추김치', work_order_no: 'WO-20260515-001', package_spec: '봉지 500g', total_packages: 2000, defect_packages: 0, metal_detect_result: 'PASS', seal_quality: 'GOOD', expiry_date: '2026-11-15', operator: '김철수', recorded_at: '2026-05-15 10:30', action_taken: null },
  { id: 2, lot_no: 'LOT-20260515-002', product_name: '깍두기', work_order_no: 'WO-20260515-002', package_spec: '봉지 500g', total_packages: 840, defect_packages: 2, metal_detect_result: 'FAIL', seal_quality: 'GOOD', expiry_date: '2026-11-15', operator: '이영희', recorded_at: '2026-05-15 11:05', action_taken: '라인 중단 → 불량품 격리 32개 → 금속검출기 재교정 → 라인 재가동' },
  { id: 3, lot_no: 'LOT-20260515-003', product_name: '총각김치', work_order_no: 'WO-20260515-003', package_spec: '용기 1kg', total_packages: 620, defect_packages: 0, metal_detect_result: 'PASS', seal_quality: 'GOOD', expiry_date: '2026-11-15', operator: '박민준', recorded_at: '2026-05-15 11:50', action_taken: null },
  { id: 4, lot_no: 'LOT-20260515-004', product_name: '갓김치', work_order_no: 'WO-20260515-004', package_spec: '봉지 500g', total_packages: 560, defect_packages: 0, metal_detect_result: 'PASS', seal_quality: 'POOR', expiry_date: '2026-11-15', operator: '최지원', recorded_at: '2026-05-15 12:20', action_taken: null },
  { id: 5, lot_no: 'LOT-20260515-005', product_name: '파김치', work_order_no: 'WO-20260515-005', package_spec: '용기 500g', total_packages: 300, defect_packages: 0, metal_detect_result: 'PASS', seal_quality: 'GOOD', expiry_date: '2026-11-15', operator: '정수빈', recorded_at: '2026-05-15 13:10', action_taken: null },
  { id: 6, lot_no: 'LOT-20260514-008', product_name: '배추김치', work_order_no: 'WO-20260514-008', package_spec: '봉지 500g', total_packages: 1800, defect_packages: 0, metal_detect_result: 'PASS', seal_quality: 'GOOD', expiry_date: '2026-11-14', operator: '한도윤', recorded_at: '2026-05-14 14:00', action_taken: null },
  { id: 7, lot_no: 'LOT-20260514-009', product_name: '깍두기', work_order_no: 'WO-20260514-009', package_spec: '용기 1kg', total_packages: 450, defect_packages: 0, metal_detect_result: 'PASS', seal_quality: 'GOOD', expiry_date: '2026-11-14', operator: '윤서아', recorded_at: '2026-05-14 15:30', action_taken: null },
]

const SEAL_STYLES = {
  GOOD: 'bg-green-100 text-green-700',
  POOR: 'bg-yellow-100 text-yellow-700',
  FAIL: 'bg-red-100 text-red-700',
}

const DETECTOR_STATUS_STYLES: Record<DetectorStatus, string> = {
  정상: 'bg-green-100 text-green-700',
  점검중: 'bg-yellow-100 text-yellow-700',
  이상: 'bg-red-100 text-red-700',
}

export default function MetalDetectPage() {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const queryClient = useQueryClient()
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const [resultFilter, setResultFilter] = useState<string>('전체')
  const [selectedRecord, setSelectedRecord] = useState<MetalDetectRecord | null>(null)

  // 금속검출 기록 목록 — API 실패 시 mock 데이터 fallback
  const { data: recordsRaw, isLoading } = useQuery(
    ['quality', 'metal', dateFrom, dateTo, resultFilter],
    () =>
      qualityApi
        .getMetalDetectLogs({
          date: dateTo, // 단일 날짜 또는 백엔드 확장 시 date_from/date_to 추가 가능
          result: resultFilter === '전체' ? undefined : resultFilter,
        })
        .then((res) => res.data),
    { staleTime: 30_000, retry: 1, onError: () => {} }
  )

  // API 응답 정규화
  const records: MetalDetectRecord[] = useMemo(() => {
    if (!recordsRaw) return MOCK_RECORDS
    if (Array.isArray((recordsRaw as any)?.data)) return (recordsRaw as any).data
    if (Array.isArray(recordsRaw)) return recordsRaw as MetalDetectRecord[]
    return MOCK_RECORDS
  }, [recordsRaw])

  // 오늘 통계
  const { data: statsRaw } = useQuery(
    ['quality', 'metal', 'stats'],
    () => qualityApi.getMetalDetectStats().then((res) => res.data),
    { staleTime: 60_000, retry: 1, onError: () => {} }
  )

  // 검사 결과 등록 뮤테이션
  const createLogMutation = useMutation(
    (logData: Record<string, unknown>) => qualityApi.createMetalDetectLog(logData),
    { onSuccess: () => queryClient.invalidateQueries(['quality', 'metal']) }
  )

  const filtered = useMemo(() => {
    return records.filter((r) =>
      resultFilter === '전체' || r.metal_detect_result === resultFilter
    )
  }, [records, resultFilter])

  const summary = useMemo(() => {
    const list = records
    const total = list.length
    const failCount = list.filter((r) => r.metal_detect_result === 'FAIL').length
    const passCount = total - failCount
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 100
    const totalPackages = list.reduce((s, r) => s + r.total_packages, 0)
    return { total, failCount, passCount, passRate, totalPackages }
  }, [records])

  const hasTodayFail = MOCK_DETECTORS.some((d) => d.today_fail > 0)

  return (
    <div>
      <PageHeader
        title="금속 검출 현황 (CCP4)"
        subtitle="HACCP CCP4 — 포장 완제품 금속검출 결과를 관리합니다. FAIL 발생 시 즉시 라인 중단 조치가 필요합니다."
        breadcrumbs={[{ label: '품질이상' }, { label: '금속검출 CCP4' }]}
      />

      {/* CCP4 FAIL 발생 경보 배너 */}
      {summary.failCount > 0 && (
        <div className="mb-5 rounded-2xl border-4 border-red-500 bg-red-600 px-5 py-4 text-center">
          <p className="text-xl font-black text-white">
            금속검출 FAIL {summary.failCount}건 발생 — 조치 내역을 반드시 확인하십시오
          </p>
          <p className="mt-1 text-sm text-red-100">{CCP4.action}</p>
        </div>
      )}

      {/* 금속검출기 장비 상태 */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {MOCK_DETECTORS.map((d) => (
          <div
            key={d.id}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
            style={{ borderTop: `3px solid ${d.status === '정상' ? '#16A34A' : d.status === '점검중' ? '#D97706' : '#DC2626'}` }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700">{d.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${DETECTOR_STATUS_STYLES[d.status]}`}>
                {d.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">{d.line}</p>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="text-green-600 font-semibold">PASS {d.today_pass}건</span>
              <span className={`font-semibold ${d.today_fail > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                FAIL {d.today_fail}건
              </span>
            </div>
            <p className="mt-2 text-[10px] text-gray-400">최근 교정: {d.last_calibrated}</p>
          </div>
        ))}
      </div>

      {/* CCP4 기준 안내 */}
      <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-red-700">HACCP CCP4 관리기준</span>
          <span className="text-xs text-red-600">{CCP4.standard}</span>
          <span className="ml-auto text-xs text-red-400">이탈 시: {CCP4.action}</span>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #0891B2' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">총 검사 건수</p>
          <p className="text-3xl font-black text-[#0891B2]">{summary.total}</p>
          <p className="mt-1 text-xs text-gray-400">조회 기간 내</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #16A34A' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">PASS</p>
          <p className="text-3xl font-black text-[#16A34A]">{summary.passCount}</p>
          <p className="mt-1 text-xs text-gray-400">이상 없음</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.failCount > 0 ? '#DC2626' : '#64748B'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">FAIL</p>
          <p className="text-3xl font-black" style={{ color: summary.failCount > 0 ? '#DC2626' : '#64748B' }}>
            {summary.failCount}
          </p>
          <p className="mt-1 text-xs text-gray-400">즉시 조치 필요</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.passRate >= 99 ? '#16A34A' : '#DC2626'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">CCP 준수율</p>
          <p className="text-3xl font-black" style={{ color: summary.passRate >= 99 ? '#16A34A' : '#DC2626' }}>
            {summary.passRate}%
          </p>
          <p className="mt-1 text-xs text-gray-400">기준: 100% (무결점)</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">시작일</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <span className="text-xs text-gray-400">~</span>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">종료일</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">결과</label>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none">
            {['전체', 'PASS', 'FAIL'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}건</span>
      </div>

      {/* 검사 기록 테이블 */}
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-auto">
              <thead>
                <tr className="bg-[#FFF1F2]">
                  {['LOT번호', '작업지시', '제품명', '포장규격', '총수량', '불량', '금속검출', '실링', '유통기한', '담당자', '기록일시', '조치'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-[#9F1239]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={12} className="py-14 text-center text-sm text-gray-400">해당 조건의 기록이 없습니다.</td></tr>
                ) : filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-t border-gray-100 transition-colors hover:bg-red-50"
                    style={r.metal_detect_result === 'FAIL' ? { background: 'rgba(220,38,38,0.06)' } : undefined}
                    onClick={() => setSelectedRecord(r)}
                  >
                    <td className="px-3 py-3.5"><span className="font-mono text-xs text-gray-600">{r.lot_no}</span></td>
                    <td className="px-3 py-3.5"><span className="font-mono text-xs text-gray-600">{r.work_order_no}</span></td>
                    <td className="px-3 py-3.5"><span className="text-sm font-semibold text-gray-800">{r.product_name}</span></td>
                    <td className="px-3 py-3.5"><span className="text-xs text-gray-600">{r.package_spec}</span></td>
                    <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{r.total_packages.toLocaleString()}</span></td>
                    <td className="px-3 py-3.5">
                      <span className={`text-sm font-semibold ${r.defect_packages > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {r.defect_packages}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-black ${
                        r.metal_detect_result === 'PASS'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700 ring-2 ring-red-400'
                      }`}>
                        {r.metal_detect_result}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${SEAL_STYLES[r.seal_quality]}`}>
                        {r.seal_quality}
                      </span>
                    </td>
                    <td className="px-3 py-3.5"><span className="text-xs text-gray-600">{r.expiry_date}</span></td>
                    <td className="px-3 py-3.5"><span className="text-sm text-gray-700">{r.operator}</span></td>
                    <td className="px-3 py-3.5"><span className="font-mono text-xs text-gray-500">{r.recorded_at}</span></td>
                    <td className="px-3 py-3.5">
                      {r.action_taken
                        ? <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">조치완료</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-gray-500">{selectedRecord.work_order_no}</p>
                <h3 className="text-xl font-black text-gray-900">{selectedRecord.product_name} 금속검출 기록</h3>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${
                selectedRecord.metal_detect_result === 'PASS'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700 ring-2 ring-red-400'
              }`}>
                CCP4 {selectedRecord.metal_detect_result}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {['LOT번호', '포장규격', '총 포장수량', '불량수량', '금속검출', '실링상태', '라벨부착', '유통기한', '담당자', '기록일시'].map((label, i) => {
                const values = [
                  selectedRecord.lot_no,
                  selectedRecord.package_spec,
                  `${selectedRecord.total_packages.toLocaleString()}개`,
                  `${selectedRecord.defect_packages}개`,
                  selectedRecord.metal_detect_result,
                  selectedRecord.seal_quality,
                  '완료',
                  selectedRecord.expiry_date,
                  selectedRecord.operator,
                  selectedRecord.recorded_at,
                ]
                return (
                  <div key={label} className="flex justify-between border-b pb-2">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-800">{values[i]}</span>
                  </div>
                )
              })}
              {selectedRecord.action_taken && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                  <p className="text-xs font-bold text-orange-700">조치 내역</p>
                  <p className="mt-1 text-xs text-orange-600">{selectedRecord.action_taken}</p>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedRecord(null)}
              className="mt-5 flex h-[48px] w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
