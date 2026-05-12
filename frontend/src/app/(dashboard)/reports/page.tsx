'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportApi } from '@/lib/api'
import type { ProductionReport, ReportPeriod } from '@/types/reports'
import {
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

// ─── 유틸 함수 ───────────────────────────────────────────────────────────────

function getCurrentMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getCurrentMonth() {
  return new Date().getMonth() + 1
}

// 달성률 색상 (≥95% success, ≥80% warning, <80% danger)
function achievementColor(rate: number): string {
  if (rate >= 95) return 'text-green-600'
  if (rate >= 80) return 'text-yellow-600'
  return 'text-red-600'
}

function achievementBg(rate: number): string {
  if (rate >= 95) return 'bg-green-50 border-green-200'
  if (rate >= 80) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

// 불량률 색상 (≤1.3% success, ≤1.7% warning, >1.7% danger)
function defectColor(rate: number): string {
  if (rate <= 1.3) return 'text-green-600'
  if (rate <= 1.7) return 'text-yellow-600'
  return 'text-red-600'
}

function defectBg(rate: number): string {
  if (rate <= 1.3) return 'bg-green-50 border-green-200'
  if (rate <= 1.7) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

// ─── 서브 컴포넌트 ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  unit,
  extra,
  className,
}: {
  label: string
  value: string | number
  unit?: string
  extra?: string
  className?: string
}) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${className ?? ''}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-gray-500">{unit}</span>}
      </p>
      {extra && <p className="mt-0.5 text-xs text-gray-400">{extra}</p>}
    </div>
  )
}

function SummaryRow({ report }: { report: ProductionReport }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="계획 생산량"
        value={report.total_planned.toLocaleString()}
        unit="kg"
        className="border-gray-200"
      />
      <StatCard
        label="실제 생산량"
        value={report.total_actual.toLocaleString()}
        unit="kg"
        className="border-gray-200"
      />
      <StatCard
        label="달성률"
        value={`${report.overall_achievement.toFixed(1)}%`}
        className={`border ${achievementBg(report.overall_achievement)}`}
      />
      <StatCard
        label="불량률"
        value={`${report.overall_defect_rate.toFixed(2)}%`}
        extra="목표: 1.3% 이하"
        className={`border ${defectBg(report.overall_defect_rate)}`}
      />
      <StatCard
        label="CCP 이탈"
        value={report.ccp_violations}
        unit="건"
        className={report.ccp_violations > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200'}
      />
      <StatCard
        label="설비 비가동"
        value={report.equipment_downtime_minutes}
        unit="분"
        className={
          report.equipment_downtime_minutes > 60 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
        }
      />
    </div>
  )
}

function ProductTable({ rows }: { report: ProductionReport; rows: ProductionReport['by_product'] }) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">제품별 데이터가 없습니다.</div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {['제품명', '계획(kg)', '실적(kg)', '불량(kg)', '달성률', '불량률'].map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                {row.product_name}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                {row.planned_qty.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                {row.actual_qty.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                {row.defect_qty.toLocaleString()}
              </td>
              <td className={`whitespace-nowrap px-4 py-3 font-semibold ${achievementColor(row.achievement_rate)}`}>
                {row.achievement_rate.toFixed(1)}%
              </td>
              <td className={`whitespace-nowrap px-4 py-3 font-semibold ${defectColor(row.defect_rate)}`}>
                {row.defect_rate.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 날짜 입력 컴포넌트들 ────────────────────────────────────────────────────

function DailyInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  )
}

function WeeklyInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">주 시작일 (월요일)</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}

function MonthlyInput({
  year,
  month,
  onYearChange,
  onMonthChange,
}: {
  year: number
  month: number
  onYearChange: (y: number) => void
  onMonthChange: (m: number) => void
}) {
  const years = Array.from({ length: 5 }, (_, i) => getCurrentYear() - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}년</option>
        ))}
      </select>
      <select
        value={month}
        onChange={(e) => onMonthChange(Number(e.target.value))}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        {months.map((m) => (
          <option key={m} value={m}>{m}월</option>
        ))}
      </select>
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('daily')

  // 일별 파라미터
  const [dailyDate, setDailyDate] = useState(getToday())

  // 주별 파라미터
  const [weekStart, setWeekStart] = useState(getCurrentMonday())

  // 월별 파라미터
  const [reportYear, setReportYear] = useState(getCurrentYear())
  const [reportMonth, setReportMonth] = useState(getCurrentMonth())

  // 실제 조회 트리거용 state
  const [queryParams, setQueryParams] = useState<{
    period: ReportPeriod
    dailyDate: string
    weekStart: string
    year: number
    month: number
  } | null>(null)

  const { data, isLoading, isError, isFetching } = useQuery<{ data: ProductionReport }>({
    queryKey: ['production-report', queryParams],
    queryFn: () => {
      if (!queryParams) throw new Error('no params')
      if (queryParams.period === 'daily') return reportApi.getDaily(queryParams.dailyDate)
      if (queryParams.period === 'weekly') return reportApi.getWeekly(queryParams.weekStart)
      return reportApi.getMonthly(queryParams.year, queryParams.month)
    },
    enabled: !!queryParams,
    retry: false,
  })

  const report = data?.data

  const handleSearch = () => {
    setQueryParams({ period, dailyDate, weekStart, year: reportYear, month: reportMonth })
  }

  const handleExcelDownload = async () => {
    if (!queryParams) return
    try {
      let params: Record<string, unknown> = {}
      if (queryParams.period === 'daily') params = { date: queryParams.dailyDate }
      else if (queryParams.period === 'weekly') params = { week_start: queryParams.weekStart }
      else params = { year: queryParams.year, month: queryParams.month }

      const res = await reportApi.exportExcel(queryParams.period, params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      const filename =
        queryParams.period === 'daily'
          ? `report_${queryParams.dailyDate}.xlsx`
          : queryParams.period === 'weekly'
          ? `report_week_${queryParams.weekStart}.xlsx`
          : `report_${queryParams.year}_${String(queryParams.month).padStart(2, '0')}.xlsx`
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Excel 파일 다운로드에 실패했습니다.')
    }
  }

  const TABS: { label: string; value: ReportPeriod }[] = [
    { label: '일별', value: 'daily' },
    { label: '주별', value: 'weekly' },
    { label: '월별', value: 'monthly' },
  ]

  return (
    <div className="p-6">
      {/* 페이지 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">생산실적 보고서</h1>
          <p className="mt-1 text-sm text-gray-500">기간별 생산 달성률, 불량률, CCP 이탈 현황을 조회합니다.</p>
        </div>
        {report && (
          <button
            onClick={handleExcelDownload}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700
                       hover:bg-gray-50 shadow-sm transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4 text-green-600" />
            Excel 다운로드
          </button>
        )}
      </div>

      {/* 필터 영역 */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* 탭 */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPeriod(tab.value)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  period === tab.value
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 날짜 입력 */}
          {period === 'daily' && (
            <DailyInput value={dailyDate} onChange={setDailyDate} />
          )}
          {period === 'weekly' && (
            <WeeklyInput value={weekStart} onChange={setWeekStart} />
          )}
          {period === 'monthly' && (
            <MonthlyInput
              year={reportYear}
              month={reportMonth}
              onYearChange={setReportYear}
              onMonthChange={setReportMonth}
            />
          )}

          {/* 조회 버튼 */}
          <button
            onClick={handleSearch}
            disabled={isLoading || isFetching}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white
                       hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            조회
          </button>
        </div>
      </div>

      {/* 결과 없음 */}
      {!queryParams && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-20">
          <DocumentArrowDownIcon className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-base font-medium text-gray-400">
            기간을 선택한 후 조회 버튼을 클릭하세요
          </p>
        </div>
      )}

      {/* 로딩 */}
      {queryParams && (isLoading || isFetching) && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">보고서 조회 중...</span>
        </div>
      )}

      {/* 에러 */}
      {queryParams && isError && !isFetching && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-700">데이터 조회 실패</p>
            <p className="mt-0.5 text-sm text-red-500">
              해당 기간의 보고서 데이터를 불러올 수 없습니다.
            </p>
          </div>
        </div>
      )}

      {/* 보고서 결과 */}
      {report && !isFetching && (
        <div className="space-y-6">
          {/* 기간 표시 */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">기간:</span>
            <span>
              {report.date_from === report.date_to
                ? report.date_from
                : `${report.date_from} ~ ${report.date_to}`}
            </span>
          </div>

          {/* 요약 카드 */}
          <SummaryRow report={report} />

          {/* 제품별 실적 테이블 */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-800">제품별 실적</h2>
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">{report.by_product.length}개 제품</span>
            </div>
            <ProductTable report={report} rows={report.by_product} />
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              달성률 95% 이상
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
              달성률 80~95% / 불량률 1.3~1.7%
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
              달성률 80% 미만 / 불량률 1.7% 초과
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 opacity-60" />
              불량률 1.3% 이하 (목표)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
