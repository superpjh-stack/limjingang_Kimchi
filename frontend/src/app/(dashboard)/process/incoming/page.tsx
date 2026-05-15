'use client'

import React, { useState, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type InspectionResult = 'PASS' | 'FAIL' | 'HOLD'
type CheckResult = 'PASS' | 'FAIL'

interface IncomingRecord {
  id: string
  date: string
  material: string
  supplier: string
  qty_kg: number
  moisture: number
  brix: number | null
  appearance: CheckResult
  foreign_matter: CheckResult
  result: InspectionResult
  inspector: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// GET /api/v1/process/incoming
const mockIncomings: IncomingRecord[] = [
  { id: 'IC-20260515-001', date: '2026-05-15', material: '배추', supplier: '농협직거래', qty_kg: 1500, moisture: 92.3, brix: 4.2, appearance: 'PASS', foreign_matter: 'PASS', result: 'PASS', inspector: '김검사' },
  { id: 'IC-20260515-002', date: '2026-05-15', material: '무', supplier: '강원채소', qty_kg: 800, moisture: 94.1, brix: 3.8, appearance: 'PASS', foreign_matter: 'FAIL', result: 'FAIL', inspector: '이검사' },
  { id: 'IC-20260515-003', date: '2026-05-15', material: '고추가루', supplier: '청양농산', qty_kg: 200, moisture: 12.5, brix: null, appearance: 'PASS', foreign_matter: 'PASS', result: 'PASS', inspector: '박검사' },
  { id: 'IC-20260514-001', date: '2026-05-14', material: '배추', supplier: '농협직거래', qty_kg: 2000, moisture: 91.8, brix: 4.5, appearance: 'PASS', foreign_matter: 'PASS', result: 'PASS', inspector: '김검사' },
  { id: 'IC-20260514-002', date: '2026-05-14', material: '마늘', supplier: '단양농협', qty_kg: 150, moisture: 58.2, brix: null, appearance: 'PASS', foreign_matter: 'PASS', result: 'PASS', inspector: '이검사' },
  { id: 'IC-20260514-003', date: '2026-05-14', material: '생강', supplier: '완주생강', qty_kg: 80, moisture: 85.0, brix: null, appearance: 'FAIL', foreign_matter: 'PASS', result: 'HOLD', inspector: '박검사' },
  { id: 'IC-20260513-001', date: '2026-05-13', material: '배추', supplier: '해남농협', qty_kg: 1800, moisture: 93.1, brix: 4.0, appearance: 'PASS', foreign_matter: 'PASS', result: 'PASS', inspector: '김검사' },
]

const MATERIALS = ['전체', '배추', '무', '고추가루', '마늘', '생강']
const RESULTS: { value: string; label: string }[] = [
  { value: '전체', label: '전체' },
  { value: 'PASS', label: '합격' },
  { value: 'FAIL', label: '불합격' },
  { value: 'HOLD', label: '보류' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ResultBadge({ value }: { value: InspectionResult | CheckResult }) {
  const map: Record<string, string> = {
    PASS: 'ok',
    FAIL: 'danger',
    HOLD: 'warn',
  }
  const label: Record<string, string> = {
    PASS: '합격',
    FAIL: '불합격',
    HOLD: '보류',
  }
  return (
    <span className={`badge ${map[value] ?? 'muted'}`}>
      <span className="dot" />
      {label[value] ?? value}
    </span>
  )
}

function CheckBadge({ value }: { value: CheckResult }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 600,
      color: value === 'PASS' ? 'var(--ok)' : 'var(--danger)',
    }}>
      {value === 'PASS' ? '✓' : '✗'} {value}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface RegisterModalProps {
  onClose: () => void
}

function RegisterModal({ onClose }: RegisterModalProps) {
  const [form, setForm] = useState({
    material: '배추',
    supplier: '',
    qty_kg: '',
    moisture: '',
    brix: '',
    appearance: 'PASS',
    foreign_matter: 'PASS',
    inspector: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // POST /api/v1/process/incoming
    alert('입고 검사 등록 완료 (Mock)')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">원물 입고 검사 등록</span>
          <button className="icon-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div>
                <label className="form-label">원물 종류 *</label>
                <select className="form-input filter-select" style={{ width: '100%' }}
                  value={form.material}
                  onChange={(e) => setForm({ ...form, material: e.target.value })}>
                  {['배추', '무', '고추가루', '마늘', '생강', '젓갈류', '기타'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">납품업체 *</label>
                <input className="form-input" placeholder="업체명" required
                  value={form.supplier}
                  onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <div>
                <label className="form-label">입고량 (kg) *</label>
                <input className="form-input" type="number" placeholder="0" required min={0}
                  value={form.qty_kg}
                  onChange={(e) => setForm({ ...form, qty_kg: e.target.value })} />
              </div>
              <div>
                <label className="form-label">수분함량 (%)</label>
                <input className="form-input" type="number" step="0.1" placeholder="0.0"
                  value={form.moisture}
                  onChange={(e) => setForm({ ...form, moisture: e.target.value })} />
              </div>
              <div>
                <label className="form-label">당도 (Brix)</label>
                <input className="form-input" type="number" step="0.1" placeholder="해당없으면 빈칸"
                  value={form.brix}
                  onChange={(e) => setForm({ ...form, brix: e.target.value })} />
              </div>
              <div>
                <label className="form-label">담당 검사자 *</label>
                <input className="form-input" placeholder="검사자명" required
                  value={form.inspector}
                  onChange={(e) => setForm({ ...form, inspector: e.target.value })} />
              </div>
              <div>
                <label className="form-label">외관 검사</label>
                <select className="form-input filter-select" style={{ width: '100%' }}
                  value={form.appearance}
                  onChange={(e) => setForm({ ...form, appearance: e.target.value })}>
                  <option value="PASS">합격 (PASS)</option>
                  <option value="FAIL">불합격 (FAIL)</option>
                </select>
              </div>
              <div>
                <label className="form-label">이물 검사</label>
                <select className="form-input filter-select" style={{ width: '100%' }}
                  value={form.foreign_matter}
                  onChange={(e) => setForm({ ...form, foreign_matter: e.target.value })}>
                  <option value="PASS">합격 (PASS)</option>
                  <option value="FAIL">불합격 (FAIL)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--brand-50)', borderRadius: 8, fontSize: 12, color: 'var(--brand-600)' }}>
              HACCP CCP 기준 — 외관 또는 이물 불합격 시 자동으로 FAIL 판정됩니다.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-brand">검사 등록</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncomingInspectionPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('전체')
  const [filterResult, setFilterResult] = useState('전체')

  // Derived stats (today only)
  const todayRecords = useMemo(() =>
    mockIncomings.filter((r) => r.date === '2026-05-15'),
    []
  )

  const stats = useMemo(() => ({
    total: todayRecords.length,
    pass: todayRecords.filter((r) => r.result === 'PASS').length,
    fail: todayRecords.filter((r) => r.result === 'FAIL').length,
    avgMoisture: todayRecords.length
      ? (todayRecords.reduce((s, r) => s + r.moisture, 0) / todayRecords.length).toFixed(1)
      : '—',
  }), [todayRecords])

  const filtered = useMemo(() => {
    return mockIncomings.filter((r) => {
      if (filterDate && r.date !== filterDate) return false
      if (filterMaterial !== '전체' && r.material !== filterMaterial) return false
      if (filterResult !== '전체' && r.result !== filterResult) return false
      return true
    })
  }, [filterDate, filterMaterial, filterResult])

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">원물 입고 검사</h1>
          <p className="page-desc">외부 납품 원물의 HACCP 입고 검사 기록 및 합격 판정 관리</p>
        </div>
        <button className="btn btn-brand" onClick={() => setModalOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          입고 검사 등록
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            오늘 입고 건수
          </div>
          <div className="kpi-value">{stats.total}<span className="unit">건</span></div>
          <div className="kpi-meta"><span className="dim">2026-05-15 기준</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
            합격 건수
          </div>
          <div className="kpi-value" style={{ color: 'var(--ok)' }}>{stats.pass}<span className="unit">건</span></div>
          <div className="kpi-meta">
            <span className="delta up">
              {stats.total > 0 ? ((stats.pass / stats.total) * 100).toFixed(0) : 0}% 합격률
            </span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            불합격 건수
          </div>
          <div className="kpi-value" style={{ color: stats.fail > 0 ? 'var(--danger)' : 'var(--ink)' }}>
            {stats.fail}<span className="unit">건</span>
          </div>
          {stats.fail > 0 && (
            <div className="kpi-meta"><span className="dim" style={{ color: 'var(--danger)', fontWeight: 600 }}>즉시 확인 필요</span></div>
          )}
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            평균 수분함량
          </div>
          <div className="kpi-value">{stats.avgMoisture}<span className="unit">%</span></div>
          <div className="kpi-meta"><span className="dim">오늘 입고 평균</span></div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="date"
          className="filter-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          style={{ minWidth: 140 }}
        />
        <select className="filter-select"
          value={filterMaterial}
          onChange={(e) => setFilterMaterial(e.target.value)}>
          {MATERIALS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select className="filter-select"
          value={filterResult}
          onChange={(e) => setFilterResult(e.target.value)}>
          {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <div className="filter-spacer" />
        <span className="dim">{filtered.length}건</span>
        {(filterDate || filterMaterial !== '전체' || filterResult !== '전체') && (
          <button className="btn btn-sm" onClick={() => { setFilterDate(''); setFilterMaterial('전체'); setFilterResult('전체') }}>
            초기화
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">입고 검사 목록</div>
          <span className="dim">HACCP CCP 원물 입고 기록</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>입고번호</th>
                  <th>날짜</th>
                  <th>원물종류</th>
                  <th>납품업체</th>
                  <th className="num">입고량(kg)</th>
                  <th className="num">수분함량(%)</th>
                  <th className="num">당도(Brix)</th>
                  <th>외관검사</th>
                  <th>이물검사</th>
                  <th>판정</th>
                  <th>담당자</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: 13 }}>
                      검색 결과가 없습니다
                    </td>
                  </tr>
                ) : filtered.map((r) => (
                  <tr key={r.id}
                    style={r.result === 'FAIL' ? { background: 'var(--danger-bg)' } : r.result === 'HOLD' ? { background: 'var(--warn-bg)' } : undefined}>
                    <td className="mono">{r.id}</td>
                    <td className="dim">{r.date}</td>
                    <td className="strong">{r.material}</td>
                    <td>{r.supplier}</td>
                    <td className="num tnum">{r.qty_kg.toLocaleString('ko-KR')}</td>
                    <td className="num tnum">{r.moisture.toFixed(1)}</td>
                    <td className="num tnum">{r.brix !== null ? r.brix.toFixed(1) : '—'}</td>
                    <td><CheckBadge value={r.appearance} /></td>
                    <td><CheckBadge value={r.foreign_matter} /></td>
                    <td><ResultBadge value={r.result} /></td>
                    <td className="dim">{r.inspector}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm">상세</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && <RegisterModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
