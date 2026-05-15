'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import PageHeader from '@/components/layout/PageHeader'
import Table, { Pagination } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Column } from '@/types/common'
import { workerApi } from '@/lib/api'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type Department = '세척' | '절임' | '양념' | '포장' | '품질' | '출하' | '관리'
type Shift = '1조' | '2조' | '3조'
type WorkerStatus = '재직' | '휴직' | '퇴직'

interface Worker {
  id: number
  emp_no: string
  name: string
  department: Department
  position: string
  shift: Shift
  phone: string
  hire_date: string
  status: WorkerStatus
}

interface WorkerFilters {
  search: string
  department: Department | ''
  shift: Shift | ''
  status: WorkerStatus | ''
}

interface ModalState {
  open: boolean
  mode: 'create' | 'edit'
  target: Worker | null
}

// ────────────────────────────────────────────────────────────
// Mock data
// ────────────────────────────────────────────────────────────

const MOCK_WORKERS: Worker[] = [
  { id: 1,  emp_no: 'EMP001', name: '김철수', department: '세척', position: '반장',   shift: '1조', phone: '010-1234-5678', hire_date: '2019-03-04', status: '재직' },
  { id: 2,  emp_no: 'EMP002', name: '이영희', department: '세척', position: '기능원', shift: '2조', phone: '010-2345-6789', hire_date: '2020-07-15', status: '재직' },
  { id: 3,  emp_no: 'EMP003', name: '박민준', department: '세척', position: '기능원', shift: '3조', phone: '010-3456-7890', hire_date: '2021-01-10', status: '재직' },
  { id: 4,  emp_no: 'EMP004', name: '정수진', department: '절임', position: '반장',   shift: '1조', phone: '010-4567-8901', hire_date: '2018-05-20', status: '재직' },
  { id: 5,  emp_no: 'EMP005', name: '최동현', department: '절임', position: '기능원', shift: '2조', phone: '010-5678-9012', hire_date: '2022-02-28', status: '재직' },
  { id: 6,  emp_no: 'EMP006', name: '한지은', department: '절임', position: '기능원', shift: '3조', phone: '010-6789-0123', hire_date: '2021-09-01', status: '휴직' },
  { id: 7,  emp_no: 'EMP007', name: '윤상훈', department: '양념', position: '반장',   shift: '1조', phone: '010-7890-1234', hire_date: '2017-11-15', status: '재직' },
  { id: 8,  emp_no: 'EMP008', name: '강미래', department: '양념', position: '기능원', shift: '2조', phone: '010-8901-2345', hire_date: '2023-04-03', status: '재직' },
  { id: 9,  emp_no: 'EMP009', name: '임재원', department: '포장', position: '반장',   shift: '1조', phone: '010-9012-3456', hire_date: '2020-06-22', status: '재직' },
  { id: 10, emp_no: 'EMP010', name: '오세영', department: '포장', position: '기능원', shift: '3조', phone: '010-0123-4567', hire_date: '2022-11-07', status: '재직' },
  { id: 11, emp_no: 'EMP011', name: '신혜린', department: '품질', position: '검사원', shift: '1조', phone: '010-1122-3344', hire_date: '2019-08-19', status: '재직' },
  { id: 12, emp_no: 'EMP012', name: '류태양', department: '출하', position: '기능원', shift: '2조', phone: '010-2233-4455', hire_date: '2016-03-31', status: '퇴직' },
]

const DEPARTMENTS: Department[] = ['세척', '절임', '양념', '포장', '품질', '출하', '관리']
const SHIFTS: Shift[] = ['1조', '2조', '3조']
const STATUSES: WorkerStatus[] = ['재직', '휴직', '퇴직']
const POSITIONS = ['반장', '기능원', '검사원', '관리자', '사원']

const PAGE_SIZE = 8

// ────────────────────────────────────────────────────────────
// Status badge helper
// ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WorkerStatus }) {
  if (status === '재직') {
    return (
      <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-700">
        재직
      </span>
    )
  }
  if (status === '휴직') {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        휴직
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      퇴직
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Worker Modal
// ────────────────────────────────────────────────────────────

interface WorkerModalProps {
  modal: ModalState
  onClose: () => void
  onSave: (worker: Omit<Worker, 'id'> & { id?: number }) => void
}

const EMPTY_FORM: Omit<Worker, 'id'> = {
  emp_no: '',
  name: '',
  department: '세척',
  position: '기능원',
  shift: '1조',
  phone: '',
  hire_date: '',
  status: '재직',
}

function WorkerModal({ modal, onClose, onSave }: WorkerModalProps) {
  const [form, setForm] = useState<Omit<Worker, 'id'>>(
    modal.target
      ? {
          emp_no: modal.target.emp_no,
          name: modal.target.name,
          department: modal.target.department,
          position: modal.target.position,
          shift: modal.target.shift,
          phone: modal.target.phone,
          hire_date: modal.target.hire_date,
          status: modal.target.status,
        }
      : EMPTY_FORM
  )

  const handleChange = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(modal.target ? { ...form, id: modal.target.id } : form)
  }

  if (!modal.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4"
             style={{ borderTop: '3px solid #0891B2' }}>
          <h2 className="text-base font-semibold text-gray-900">
            {modal.mode === 'create' ? '작업자 등록' : '작업자 수정'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid grid-cols-2 gap-4">
            {/* 사원번호 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">사원번호 *</label>
              <input
                type="text"
                required
                placeholder="EMP001"
                value={form.emp_no}
                onChange={(e) => handleChange('emp_no', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              />
            </div>

            {/* 이름 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">이름 *</label>
              <input
                type="text"
                required
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              />
            </div>

            {/* 부서 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">부서(공정) *</label>
              <select
                required
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value as Department)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 직급 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">직급 *</label>
              <select
                required
                value={form.position}
                onChange={(e) => handleChange('position', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              >
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 교대조 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">교대조 *</label>
              <select
                required
                value={form.shift}
                onChange={(e) => handleChange('shift', e.target.value as Shift)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              >
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 연락처 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">연락처</label>
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              />
            </div>

            {/* 입사일 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">입사일 *</label>
              <input
                type="date"
                required
                value={form.hire_date}
                onChange={(e) => handleChange('hire_date', e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              />
            </div>

            {/* 상태 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">상태 *</label>
              <select
                required
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value as WorkerStatus)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              {modal.mode === 'create' ? '등록' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Main page component
// ────────────────────────────────────────────────────────────

export default function WorkersPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<WorkerFilters>({
    search: '',
    department: '',
    shift: '',
    status: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', target: null })

  // ---- 실제 API 호출 (백엔드 /workers) ----
  const { data: queryData, isLoading } = useQuery({
    queryKey: ['workers', filters],
    queryFn: async () => {
      try {
        const res = await workerApi.getList({
          search: filters.search || undefined,
          department: filters.department || undefined,
          shift: filters.shift || undefined,
          status: filters.status || undefined,
          limit: 500,
        })
        const list = (res.data?.data ?? res.data) as Worker[]
        return list
      } catch (err) {
        // 백엔드가 아직 마이그레이션 안 됐을 때 목업으로 폴백
        console.warn('[workers] API 호출 실패, MOCK 데이터로 폴백', err)
        return MOCK_WORKERS
      }
    },
    keepPreviousData: true,
  })

  const workers = queryData ?? []

  // Derived: filtered list (서버 필터 + 클라이언트 안전망)
  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const matchSearch =
        !filters.search ||
        w.name.includes(filters.search) ||
        w.emp_no.includes(filters.search)
      const matchDept = !filters.department || w.department === filters.department
      const matchShift = !filters.shift || w.shift === filters.shift
      const matchStatus = !filters.status || w.status === filters.status
      return matchSearch && matchDept && matchShift && matchStatus
    })
  }, [workers, filters])

  // Stats
  const totalCount = workers.length
  const activeCount = workers.filter((w) => w.status === '재직').length
  const inactiveCount = workers.filter((w) => w.status === '휴직' || w.status === '퇴직').length

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pagedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = <K extends keyof WorkerFilters>(key: K, value: WorkerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  // CRUD handlers
  const openCreate = () => setModal({ open: true, mode: 'create', target: null })
  const openEdit = (w: Worker) => setModal({ open: true, mode: 'edit', target: w })
  const closeModal = () => setModal({ open: false, mode: 'create', target: null })

  const handleSave = async (data: Omit<Worker, 'id'> & { id?: number }) => {
    try {
      if (modal.mode === 'create') {
        await workerApi.create(data as unknown as Record<string, unknown>)
      } else if (data.id) {
        await workerApi.update(data.id, data as unknown as Record<string, unknown>)
      }
      await queryClient.invalidateQueries({ queryKey: ['workers'] })
    } catch (err) {
      console.error('[workers] 저장 실패', err)
      window.alert('작업자 저장에 실패했습니다.')
    }
    closeModal()
  }

  const handleDelete = async (worker: Worker) => {
    if (!window.confirm(`${worker.name} 작업자를 삭제하시겠습니까?`)) return
    try {
      await workerApi.delete(worker.id)
      await queryClient.invalidateQueries({ queryKey: ['workers'] })
    } catch (err) {
      console.error('[workers] 삭제 실패', err)
      window.alert('작업자 삭제에 실패했습니다.')
    }
  }

  // Table columns
  const columns: Column<Worker>[] = [
    { key: 'emp_no', title: '사원번호', width: '100px' },
    { key: 'name',   title: '이름',    width: '90px' },
    {
      key: 'department',
      title: '부서(공정)',
      width: '90px',
      render: (v) => (
        <Badge variant="secondary">{String(v)}</Badge>
      ),
    },
    { key: 'position', title: '직급', width: '80px' },
    {
      key: 'shift',
      title: '교대조',
      width: '70px',
      align: 'center',
      render: (v) => (
        <span className="inline-flex items-center rounded-full bg-[#F0F9FF] px-2 py-0.5 text-xs font-medium text-[#0E7490]">
          {String(v)}
        </span>
      ),
    },
    { key: 'phone',     title: '연락처',  width: '130px' },
    { key: 'hire_date', title: '입사일',  width: '100px' },
    {
      key: 'status',
      title: '상태',
      width: '75px',
      align: 'center',
      render: (v) => <StatusBadge status={v as WorkerStatus} />,
    },
    {
      key: 'actions' as keyof Worker,
      title: '관리',
      width: '90px',
      align: 'center',
      render: (_v, record) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(record) }}
            className="rounded p-1 text-[#0891B2] hover:bg-[#F0F9FF] transition-colors"
            title="수정"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          {record.status === '재직' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(record) }}
              className="rounded p-1 text-[#DC2626] hover:bg-red-50 transition-colors"
              title="삭제"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="작업자 관리"
        subtitle="생산 공정 작업자 등록 및 관리"
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '기준정보관리' },
          { label: '작업자' },
        ]}
      />

      {/* ── 통계 카드 3개 ── */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {/* 전체 작업자 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
             style={{ borderTop: '3px solid #0891B2' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0F9FF]">
              <UsersIcon className="h-5 w-5 text-[#0891B2]" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">전체 작업자</p>
              <p className="text-2xl font-bold text-[#0891B2]">{totalCount}<span className="ml-1 text-sm font-normal text-gray-500">명</span></p>
            </div>
          </div>
        </div>

        {/* 재직 중 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
             style={{ borderTop: '3px solid #16A34A' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">재직 중</p>
              <p className="text-2xl font-bold text-green-600">{activeCount}<span className="ml-1 text-sm font-normal text-gray-500">명</span></p>
            </div>
          </div>
        </div>

        {/* 휴직/퇴직 */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
             style={{ borderTop: '3px solid #64748B' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">휴직 / 퇴직</p>
              <p className="text-2xl font-bold text-slate-500">{inactiveCount}<span className="ml-1 text-sm font-normal text-gray-500">명</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 검색 + 필터 바 ── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* 검색 */}
        <div className="flex w-56 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
          <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="이름 또는 사원번호 검색"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {/* 부서 필터 */}
        <select
          value={filters.department}
          onChange={(e) => handleFilterChange('department', e.target.value as Department | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
        >
          <option value="">전체 부서</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* 교대조 필터 */}
        <select
          value={filters.shift}
          onChange={(e) => handleFilterChange('shift', e.target.value as Shift | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
        >
          <option value="">전체 교대조</option>
          {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* 상태 필터 */}
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value as WorkerStatus | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#0891B2] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20"
        >
          <option value="">전체 상태</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Spacer + 등록 버튼 */}
        <div className="ml-auto">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#DC2626]/30"
          >
            <PlusIcon className="h-4 w-4" />
            작업자 등록
          </button>
        </div>
      </div>

      {/* ── 테이블 ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Custom thead override for theme colors */}
        <style>{`
          .workers-table thead tr { background-color: #F0F9FF; }
          .workers-table thead th { color: #0E7490; }
          .workers-table tbody tr:hover { background-color: #F0F9FF; }
        `}</style>
        <div className="workers-table">
          <Table<Worker>
            columns={columns}
            data={pagedData}
            rowKey="id"
            loading={isLoading}
            emptyText={
              filters.search || filters.department || filters.shift || filters.status
                ? '검색 조건에 맞는 작업자가 없습니다.'
                : '등록된 작업자가 없습니다.'
            }
          />
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ── 등록/수정 모달 ── */}
      {modal.open && (
        <WorkerModal modal={modal} onClose={closeModal} onSave={handleSave} />
      )}
    </div>
  )
}
