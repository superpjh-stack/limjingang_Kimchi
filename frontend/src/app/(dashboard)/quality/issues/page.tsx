'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '@/components/layout/PageHeader'
import { qualityApi } from '@/lib/api'

type IssueType = 'CCP이탈' | '이물질' | '금속검출FAIL' | '불량률초과' | '관능검사이상' | '기타'
type IssueSeverity = '긴급' | '높음' | '보통' | '낮음'
type IssueStatus = '미해결' | '조치중' | '해결완료' | '재발방지완료'
type ProcessType = '세척' | '절임' | '양념버무림' | '포장' | '전처리' | '출하'

interface QualityIssue {
  id: number
  issue_no: string
  title: string
  type: IssueType
  severity: IssueSeverity
  status: IssueStatus
  process: ProcessType
  lot_no: string
  product_name: string
  description: string
  action_taken: string | null
  reported_by: string
  assigned_to: string | null
  reported_at: string
  resolved_at: string | null
}

const MOCK_ISSUES: QualityIssue[] = [
  { id: 1, issue_no: 'QI-2026-001', title: '세척 수온 CCP 기준 초과', type: 'CCP이탈', severity: '높음', status: '해결완료', process: '세척', lot_no: 'LOT-20260515-003', product_name: '총각김치', description: '세척수 온도 16.2°C 측정 — CCP 기준 15°C 초과. 냉각 조치 및 세척수 교체 실시.', action_taken: '세척수 전량 교체, 온도 8.5°C 재확인 후 작업 재개', reported_by: '박민준', assigned_to: '품질팀장 김부장', reported_at: '2026-05-15 09:30', resolved_at: '2026-05-15 10:15' },
  { id: 2, issue_no: 'QI-2026-002', title: '포장 금속검출 FAIL', type: '금속검출FAIL', severity: '긴급', status: '조치중', process: '포장', lot_no: 'LOT-20260515-002', product_name: '깍두기', description: '금속검출기 2호에서 FAIL 신호 발생. 포장라인 즉시 중단. 해당 로트 격리 완료.', action_taken: '라인 중단 → 격리 완료(32개) → 검출기 재교정 진행 중', reported_by: '이영희', assigned_to: '설비팀 박과장', reported_at: '2026-05-15 11:05', resolved_at: null },
  { id: 3, issue_no: 'QI-2026-003', title: '세척 중 이물질(배추잎 파편) 검출', type: '이물질', severity: '보통', status: '해결완료', process: '세척', lot_no: 'LOT-20260515-005', product_name: '갓김치', description: '세척 공정 중 배추잎 파편 이물질 발견. 재세척 처리 완료.', action_taken: '이물질 제거 후 재세척 3회 실시, 이물질 없음 확인', reported_by: '정수빈', assigned_to: '공정리더 이주임', reported_at: '2026-05-15 11:00', resolved_at: '2026-05-15 11:30' },
  { id: 4, issue_no: 'QI-2026-004', title: '절임 pH CCP 기준 이탈', type: 'CCP이탈', severity: '높음', status: '해결완료', process: '절임', lot_no: 'LOT-20260515-006', product_name: '깍두기', description: '세척 후 pH 6.2 측정 — CCP 기준 6.5 미달. 염수 농도 재조정 실시.', action_taken: '염수 농도 조정, pH 7.1 재확인 후 공정 재개', reported_by: '한도윤', assigned_to: '품질팀 최사원', reported_at: '2026-05-15 11:40', resolved_at: '2026-05-15 12:20' },
  { id: 5, issue_no: 'QI-2026-005', title: '포장 실링 불량 (POOR 등급)', type: '관능검사이상', severity: '낮음', status: '재발방지완료', process: '포장', lot_no: 'LOT-20260515-004', product_name: '갓김치', description: '포장 실링 상태 POOR 등급 다수 발생. 실링기 온도 설정값 점검 실시.', action_taken: '실링기 온도 185°C → 190°C 조정, 샘플 검사 합격 확인', reported_by: '최지원', assigned_to: '설비팀 박과장', reported_at: '2026-05-15 12:20', resolved_at: '2026-05-15 13:00' },
  { id: 6, issue_no: 'QI-2026-006', title: '불량률 기준 초과 — 배추김치 포장', type: '불량률초과', severity: '보통', status: '미해결', process: '포장', lot_no: 'LOT-20260514-010', product_name: '배추김치', description: '불량률 2.1% — 관리기준 1.3% 초과. 원인 분석 중.', action_taken: null, reported_by: '임태현', assigned_to: '품질팀장 김부장', reported_at: '2026-05-14 14:30', resolved_at: null },
  { id: 7, issue_no: 'QI-2026-007', title: '절임 염도 CCP 경계값 근접', type: 'CCP이탈', severity: '낮음', status: '재발방지완료', process: '절임', lot_no: 'LOT-20260513-015', product_name: '배추김치', description: '절임 후 염도 2.5% — CCP 하한 경계값. 절임 시간 연장 조치.', action_taken: '절임 시간 1시간 연장, 염도 2.8% 재확인', reported_by: '김철수', assigned_to: '공정리더 이주임', reported_at: '2026-05-13 15:00', resolved_at: '2026-05-13 16:30' },
  { id: 8, issue_no: 'QI-2026-008', title: '양념 레시피 계량 오차 초과', type: '기타', severity: '보통', status: '해결완료', process: '양념버무림', lot_no: 'LOT-20260513-016', product_name: '깍두기', description: '고춧가루 계량값이 레시피 허용 오차 ±5%를 초과 (실측 +7.2%). 해당 배치 관능 검사 추가 실시.', action_taken: '관능 검사 합격, 계량 저울 교정 실시', reported_by: '박민준', assigned_to: '품질팀 최사원', reported_at: '2026-05-13 13:00', resolved_at: '2026-05-13 15:30' },
]

const TYPE_STYLES: Record<IssueType, string> = {
  'CCP이탈': 'bg-red-100 text-red-700',
  '이물질': 'bg-orange-100 text-orange-700',
  '금속검출FAIL': 'bg-red-200 text-red-800',
  '불량률초과': 'bg-yellow-100 text-yellow-700',
  '관능검사이상': 'bg-purple-100 text-purple-700',
  '기타': 'bg-gray-100 text-gray-600',
}

const SEVERITY_STYLES: Record<IssueSeverity, string> = {
  긴급: 'bg-red-600 text-white',
  높음: 'bg-orange-500 text-white',
  보통: 'bg-yellow-400 text-gray-900',
  낮음: 'bg-gray-200 text-gray-600',
}

const STATUS_STYLES: Record<IssueStatus, string> = {
  미해결: 'bg-red-100 text-red-700 border border-red-300',
  조치중: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  해결완료: 'bg-green-100 text-green-700',
  재발방지완료: 'bg-blue-100 text-blue-700',
}

export default function QualityIssuesPage() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const queryClient = useQueryClient()
  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo)
  const [dateTo, setDateTo] = useState(today)
  const [typeFilter, setTypeFilter] = useState<string>('전체')
  const [statusFilter, setStatusFilter] = useState<string>('전체')
  const [severityFilter, setSeverityFilter] = useState<string>('전체')
  const [selectedIssue, setSelectedIssue] = useState<QualityIssue | null>(null)

  // 이슈 목록 — API 실패 시 mock 데이터 fallback
  const { data: issuesRaw, isLoading } = useQuery(
    ['quality', 'issues', dateFrom, dateTo, typeFilter, statusFilter, severityFilter],
    () =>
      qualityApi
        .getIssues({
          date_from: dateFrom,
          date_to: dateTo,
          issue_type: typeFilter === '전체' ? undefined : typeFilter,
          status: statusFilter === '전체' ? undefined : statusFilter,
          severity: severityFilter === '전체' ? undefined : severityFilter,
        })
        .then((res) => res.data),
    { staleTime: 60_000, retry: 1, onError: () => {} }
  )

  // API 응답 정규화
  const issues: QualityIssue[] = useMemo(() => {
    if (!issuesRaw) return MOCK_ISSUES
    if (Array.isArray((issuesRaw as any)?.data)) return (issuesRaw as any).data
    if (Array.isArray(issuesRaw)) return issuesRaw as QualityIssue[]
    return MOCK_ISSUES
  }, [issuesRaw])

  // 이슈 등록 뮤테이션
  const createIssueMutation = useMutation(
    (newIssue: Record<string, unknown>) => qualityApi.createIssue(newIssue),
    { onSuccess: () => queryClient.invalidateQueries(['quality', 'issues']) }
  )

  // 상태 변경 뮤테이션
  const updateStatusMutation = useMutation(
    (args: { id: number; status: string }) => qualityApi.updateIssueStatus(args.id, args.status),
    { onSuccess: () => queryClient.invalidateQueries(['quality', 'issues']) }
  )

  // 담당자 배정 뮤테이션
  const assignMutation = useMutation(
    (args: { id: number; assignee: string }) => qualityApi.assignIssue(args.id, args.assignee),
    { onSuccess: () => queryClient.invalidateQueries(['quality', 'issues']) }
  )

  // 클라이언트 측 추가 필터 (백엔드가 지원하지 않을 수 있는 조합 대비)
  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const matchType = typeFilter === '전체' || i.type === typeFilter
      const matchStatus = statusFilter === '전체' || i.status === statusFilter
      const matchSeverity = severityFilter === '전체' || i.severity === severityFilter
      return matchType && matchStatus && matchSeverity
    })
  }, [issues, typeFilter, statusFilter, severityFilter])

  const summary = useMemo(() => {
    const list = issues
    const open = list.filter((i) => i.status === '미해결' || i.status === '조치중').length
    const resolved = list.filter((i) => i.status === '해결완료' || i.status === '재발방지완료').length
    const critical = list.filter((i) => i.severity === '긴급' || i.severity === '높음').length
    const ccpIssues = list.filter((i) => i.type === 'CCP이탈' || i.type === '금속검출FAIL').length
    return { total: list.length, open, resolved, critical, ccpIssues }
  }, [issues])

  const typeOptions: string[] = ['전체', 'CCP이탈', '이물질', '금속검출FAIL', '불량률초과', '관능검사이상', '기타']
  const statusOptions: string[] = ['전체', '미해결', '조치중', '해결완료', '재발방지완료']
  const severityOptions: string[] = ['전체', '긴급', '높음', '보통', '낮음']

  return (
    <div>
      <PageHeader
        title="품질 이슈 이력"
        subtitle="공정별 품질 이상 및 CCP 이탈 이력을 통합 관리합니다. 미해결 이슈는 즉각 조치가 필요합니다."
        breadcrumbs={[{ label: '품질이상' }, { label: '이슈 이력' }]}
      />

      {/* 미해결/긴급 이슈 경보 */}
      {summary.open > 0 && (
        <div className="mb-5 rounded-2xl border-2 border-orange-400 bg-orange-50 px-5 py-3">
          <p className="text-sm font-bold text-orange-700">
            미처리 이슈 {summary.open}건 — 신속한 조치가 필요합니다
            {summary.critical > 0 && ` (긴급·높음 ${summary.critical}건 포함)`}
          </p>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #0891B2' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">전체 이슈</p>
          <p className="text-3xl font-black text-[#0891B2]">{summary.total}</p>
          <p className="mt-1 text-xs text-gray-400">조회 기간</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.open > 0 ? '#DC2626' : '#64748B'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">미처리</p>
          <p className="text-3xl font-black" style={{ color: summary.open > 0 ? '#DC2626' : '#64748B' }}>
            {summary.open}
          </p>
          <p className="mt-1 text-xs text-gray-400">미해결 + 조치중</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5" style={{ borderTop: '3px solid #16A34A' }}>
          <p className="mb-1 text-xs font-semibold text-gray-500">처리 완료</p>
          <p className="text-3xl font-black text-[#16A34A]">{summary.resolved}</p>
          <p className="mt-1 text-xs text-gray-400">해결 + 재발방지</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.critical > 0 ? '#DC2626' : '#64748B'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">긴급·높음</p>
          <p className="text-3xl font-black" style={{ color: summary.critical > 0 ? '#DC2626' : '#64748B' }}>
            {summary.critical}
          </p>
          <p className="mt-1 text-xs text-gray-400">중요도 높은 이슈</p>
        </div>
        <div
          className="rounded-2xl border border-[#E2E8F0] bg-white p-5"
          style={{ borderTop: `3px solid ${summary.ccpIssues > 0 ? '#DC2626' : '#64748B'}` }}
        >
          <p className="mb-1 text-xs font-semibold text-gray-500">CCP 이탈</p>
          <p className="text-3xl font-black" style={{ color: summary.ccpIssues > 0 ? '#DC2626' : '#64748B' }}>
            {summary.ccpIssues}
          </p>
          <p className="mt-1 text-xs text-gray-400">HACCP 관련</p>
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
          <label className="text-xs font-semibold text-gray-500">유형</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none">
            {typeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">중요도</label>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none">
            {severityOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">상태</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none">
            {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length}건</span>
      </div>

      {/* 이슈 목록 */}
      {isLoading ? (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white py-14 text-center text-sm text-gray-400">
          불러오는 중...
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white py-14 text-center text-sm text-gray-400">
              해당 조건의 이슈가 없습니다.
            </div>
          ) : filtered.map((issue) => (
            <div
              key={issue.id}
              className="cursor-pointer rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm"
              style={
                issue.severity === '긴급'
                  ? { borderLeft: '4px solid #DC2626' }
                  : issue.severity === '높음'
                  ? { borderLeft: '4px solid #F97316' }
                  : { borderLeft: '4px solid #E2E8F0' }
              }
              onClick={() => setSelectedIssue(issue)}
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{issue.issue_no}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_STYLES[issue.severity]}`}>
                      {issue.severity}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_STYLES[issue.type]}`}>
                      {issue.type}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {issue.process}공정
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-gray-900">{issue.title}</h4>
                  <p className="line-clamp-2 text-sm text-gray-500">{issue.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    <span>LOT: <span className="font-mono font-semibold text-gray-600">{issue.lot_no}</span></span>
                    <span>제품: <span className="font-semibold text-gray-600">{issue.product_name}</span></span>
                    <span>보고자: {issue.reported_by}</span>
                    <span>보고일: {issue.reported_at}</span>
                    {issue.assigned_to && <span>담당: <span className="font-semibold text-blue-600">{issue.assigned_to}</span></span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[issue.status]}`}>
                    {issue.status}
                  </span>
                  {issue.resolved_at && (
                    <span className="text-[10px] text-gray-400">해결: {issue.resolved_at}</span>
                  )}
                  {issue.action_taken && (
                    <span className="max-w-[200px] truncate text-right text-[10px] text-green-600" title={issue.action_taken}>
                      조치: {issue.action_taken}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedIssue(null)}>
          <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" style={{ maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-gray-400">{selectedIssue.issue_no}</p>
                <h3 className="mt-0.5 text-xl font-black text-gray-900">{selectedIssue.title}</h3>
              </div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[selectedIssue.status]}`}>
                {selectedIssue.status}
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${SEVERITY_STYLES[selectedIssue.severity]}`}>{selectedIssue.severity}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TYPE_STYLES[selectedIssue.type]}`}>{selectedIssue.type}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{selectedIssue.process}공정</span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="mb-1 text-xs font-bold text-gray-500">이슈 내용</p>
                <p className="text-gray-800">{selectedIssue.description}</p>
              </div>

              {[
                ['LOT번호', selectedIssue.lot_no],
                ['제품명', selectedIssue.product_name],
                ['보고자', selectedIssue.reported_by],
                ['담당자', selectedIssue.assigned_to ?? '미배정'],
                ['보고일시', selectedIssue.reported_at],
                ['해결일시', selectedIssue.resolved_at ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}

              {selectedIssue.action_taken ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-bold text-green-700">조치 내역</p>
                  <p className="mt-1 text-xs text-green-700">{selectedIssue.action_taken}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-bold text-red-700">조치 내역 미등록 — 담당자 배정 및 조치 필요</p>
                </div>
              )}
            </div>

            <button onClick={() => setSelectedIssue(null)}
              className="mt-5 flex h-[48px] w-full items-center justify-center rounded-xl bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
