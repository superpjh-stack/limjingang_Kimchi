'use client'

import React, { useState, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type WorkType = '트리밍' | '세절' | '기타'

interface PretreatRecord {
  id: string
  date: string
  material: string
  type: WorkType
  input_kg: number
  output_kg: number
  waste_kg: number
  yield_pct: number
  standard_yield: number
  ccp_pass: boolean
  worker: string
}

interface YieldSummary {
  material: string
  input_kg: number
  output_kg: number
  waste_kg: number
  yield_pct: number
  standard_yield: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// GET /api/v1/process/pretreat
const mockPretreat: PretreatRecord[] = [
  { id: 'PT-20260515-001', date: '2026-05-15', material: '배추', type: '트리밍', input_kg: 1500, output_kg: 1155, waste_kg: 345, yield_pct: 77.0, standard_yield: 75, ccp_pass: true, worker: '김작업' },
  { id: 'PT-20260515-002', date: '2026-05-15', material: '무', type: '세절', input_kg: 800, output_kg: 664, waste_kg: 136, yield_pct: 83.0, standard_yield: 85, ccp_pass: false, worker: '이작업' },
  { id: 'PT-20260515-003', date: '2026-05-15', material: '고추가루', type: '기타', input_kg: 200, output_kg: 197, waste_kg: 3, yield_pct: 98.5, standard_yield: 98, ccp_pass: true, worker: '박작업' },
  { id: 'PT-20260514-001', date: '2026-05-14', material: '배추', type: '트리밍', input_kg: 2000, output_kg: 1540, waste_kg: 460, yield_pct: 77.0, standard_yield: 75, ccp_pass: true, worker: '김작업' },
  { id: 'PT-20260514-002', date: '2026-05-14', material: '마늘', type: '트리밍', input_kg: 150, output_kg: 127, waste_kg: 23, yield_pct: 84.7, standard_yield: 80, ccp_pass: true, worker: '이작업' },
  { id: 'PT-20260514-003', date: '2026-05-14', material: '무', type: '세절', input_kg: 600, output_kg: 496, waste_kg: 104, yield_pct: 82.7, standard_yield: 85, ccp_pass: false, worker: '박작업' },
]

// 수율 기준
const YIELD_STANDARDS: Record<string, number> = {
  '배추': 75,
  '무': 85,
  '고추가루': 98,
  '마늘': 80,
  '생강': 78,
}

// ─── Register Modal ───────────────────────────────────────────────────────────

interface RegisterModalProps {
  onClose: () => void
}

function RegisterModal({ onClose }: RegisterModalProps) {
  const [form, setForm] = useState({
    material: '배추',
    type: '트리밍' as WorkType,
    input_kg: '',
    output_kg: '',
    worker: '',
  })

  const inputNum = parseFloat(form.input_kg) || 0
  const outputNum = parseFloat(form.output_kg) || 0
  const wasteNum = inputNum - outputNum
  const yieldPct = inputNum > 0 ? ((outputNum / inputNum) * 100).toFixed(1) : '—'
  const standard = YIELD_STANDARDS[form.material] ?? 75
  const isPass = inputNum > 0 && outputNum > 0 && (outputNum / inputNum) * 100 >= standard

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // POST /api/v1/process/pretreat
    alert('전처리 기록 등록 완료 (Mock)')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">전처리 기록 등록</span>
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
                  {Object.keys(YIELD_STANDARDS).map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">작업 유형 *</label>
                <select className="form-input filter-select" style={{ width: '100%' }}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as WorkType })}>
                  {(['트리밍', '세절', '기타'] as WorkType[]).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">투입량 (kg) *</label>
                <input className="form-input" type="number" min={0} step="0.1" placeholder="0.0" required
                  value={form.input_kg}
                  onChange={(e) => setForm({ ...form, input_kg: e.target.value })} />
              </div>
              <div>
                <label className="form-label">산출량 (kg) *</label>
                <input className="form-input" type="number" min={0} step="0.1" placeholder="0.0" required
                  value={form.output_kg}
                  onChange={(e) => setForm({ ...form, output_kg: e.target.value })} />
              </div>
              <div>
                <label className="form-label">작업자 *</label>
                <input className="form-input" placeholder="작업자명" required
                  value={form.worker}
                  onChange={(e) => setForm({ ...form, worker: e.target.value })} />
              </div>
            </div>

            {/* 실시간 수율 계산 */}
            {inputNum > 0 && outputNum > 0 && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 8,
                background: isPass ? 'var(--ok-bg)' : 'var(--danger-bg)',
                border: `1px solid ${isPass ? 'var(--ok)' : 'var(--danger)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isPass ? 'var(--ok)' : 'var(--danger)' }}>
                    {isPass ? 'CCP 합격' : 'CCP 불합격 — 기준 미달'}
                  </span>
                  <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                    <span>폐기량: <strong>{wasteNum.toFixed(1)} kg</strong></span>
                    <span>수율: <strong>{yieldPct}%</strong></span>
                    <span style={{ color: 'var(--muted)' }}>기준: {standard}% 이상</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>취소</button>
            <button type="submit" className="btn btn-brand">등록</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PretreatPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('전체')

  // Today's stats
  const todayRecords = useMemo(() =>
    mockPretreat.filter((r) => r.date === '2026-05-15'),
    []
  )

  const kpi = useMemo(() => {
    const totalInput = todayRecords.reduce((s, r) => s + r.input_kg, 0)
    const totalOutput = todayRecords.reduce((s, r) => s + r.output_kg, 0)
    const avgYield = totalInput > 0 ? ((totalOutput / totalInput) * 100).toFixed(1) : '—'
    return {
      totalInput,
      avgYield,
      batchCount: todayRecords.length,
    }
  }, [todayRecords])

  // Yield summary by material (today)
  const yieldSummary = useMemo<YieldSummary[]>(() => {
    const map: Record<string, YieldSummary> = {}
    todayRecords.forEach((r) => {
      if (!map[r.material]) {
        map[r.material] = {
          material: r.material,
          input_kg: 0, output_kg: 0, waste_kg: 0,
          yield_pct: 0,
          standard_yield: r.standard_yield,
        }
      }
      map[r.material].input_kg += r.input_kg
      map[r.material].output_kg += r.output_kg
      map[r.material].waste_kg += r.waste_kg
    })
    return Object.values(map).map((s) => ({
      ...s,
      yield_pct: s.input_kg > 0 ? parseFloat(((s.output_kg / s.input_kg) * 100).toFixed(1)) : 0,
    }))
  }, [todayRecords])

  // Filtered records
  const filtered = useMemo(() => {
    return mockPretreat.filter((r) => {
      if (filterDate && r.date !== filterDate) return false
      if (filterMaterial !== '전체' && r.material !== filterMaterial) return false
      return true
    })
  }, [filterDate, filterMaterial])

  const materials = ['전체', ...Array.from(new Set(mockPretreat.map((r) => r.material)))]

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">전처리 중량 관리</h1>
          <p className="page-desc">원물 손질(트리밍·세절) 수율 추적 및 CCP 기준 판정</p>
        </div>
        <button className="btn btn-brand" onClick={() => setModalOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          전처리 기록 등록
        </button>
      </div>

      {/* KPI Cards (3개) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 2 2 22h20z"/></svg>
            오늘 처리량
          </div>
          <div className="kpi-value">{kpi.totalInput.toLocaleString('ko-KR')}<span className="unit">kg</span></div>
          <div className="kpi-meta"><span className="dim">총 투입 중량</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            평균 수율
          </div>
          <div className="kpi-value" style={{ color: parseFloat(kpi.avgYield) >= 75 ? 'var(--ok)' : 'var(--danger)' }}>
            {kpi.avgYield}<span className="unit">%</span>
          </div>
          <div className="kpi-meta"><span className="dim">기준: 원물별 상이</span></div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 15h6"/></svg>
            처리 배치 수
          </div>
          <div className="kpi-value">{kpi.batchCount}<span className="unit">배치</span></div>
          <div className="kpi-meta"><span className="dim">오늘 완료 배치</span></div>
        </div>
      </div>

      {/* Yield Summary Table */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">원물별 수율 요약 (오늘)</div>
          <span className="dim">CCP 기준 대비 수율 현황</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>원물종류</th>
                  <th className="num">투입량(kg)</th>
                  <th className="num">산출량(kg)</th>
                  <th className="num">폐기량(kg)</th>
                  <th className="num">수율(%)</th>
                  <th className="num">기준수율(%)</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                {yieldSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 13 }}>오늘 기록 없음</td>
                  </tr>
                ) : yieldSummary.map((s) => {
                  const pass = s.yield_pct >= s.standard_yield
                  return (
                    <tr key={s.material}>
                      <td className="strong">{s.material}</td>
                      <td className="num tnum">{s.input_kg.toLocaleString('ko-KR')}</td>
                      <td className="num tnum">{s.output_kg.toLocaleString('ko-KR')}</td>
                      <td className="num tnum" style={{ color: 'var(--danger)' }}>{s.waste_kg.toLocaleString('ko-KR')}</td>
                      <td className="num tnum" style={{ fontWeight: 700, color: pass ? 'var(--ok)' : 'var(--danger)' }}>{s.yield_pct.toFixed(1)}</td>
                      <td className="num tnum dim">{s.standard_yield}</td>
                      <td>
                        <span className={`badge ${pass ? 'ok' : 'danger'}`}>
                          <span className="dot" />
                          {pass ? 'CCP 합격' : 'CCP 불합격'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input type="date" className="filter-input" value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)} style={{ minWidth: 140 }} />
        <select className="filter-select" value={filterMaterial}
          onChange={(e) => setFilterMaterial(e.target.value)}>
          {materials.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="filter-spacer" />
        <span className="dim">{filtered.length}건</span>
        {(filterDate || filterMaterial !== '전체') && (
          <button className="btn btn-sm" onClick={() => { setFilterDate(''); setFilterMaterial('전체') }}>초기화</button>
        )}
      </div>

      {/* Batch Records Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">배치별 전처리 기록</div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>배치번호</th>
                  <th>날짜</th>
                  <th>원물</th>
                  <th>작업유형</th>
                  <th className="num">투입(kg)</th>
                  <th className="num">산출(kg)</th>
                  <th className="num">폐기(kg)</th>
                  <th className="num">수율(%)</th>
                  <th>CCP</th>
                  <th>작업자</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>
                      검색 결과가 없습니다
                    </td>
                  </tr>
                ) : filtered.map((r) => (
                  <tr key={r.id} style={!r.ccp_pass ? { background: 'var(--danger-bg)' } : undefined}>
                    <td className="mono">{r.id}</td>
                    <td className="dim">{r.date}</td>
                    <td className="strong">{r.material}</td>
                    <td>
                      <span className={`tag-pill`}>{r.type}</span>
                    </td>
                    <td className="num tnum">{r.input_kg.toLocaleString('ko-KR')}</td>
                    <td className="num tnum">{r.output_kg.toLocaleString('ko-KR')}</td>
                    <td className="num tnum" style={{ color: 'var(--danger)' }}>{r.waste_kg.toLocaleString('ko-KR')}</td>
                    <td className="num tnum" style={{ fontWeight: 700, color: r.ccp_pass ? 'var(--ok)' : 'var(--danger)' }}>
                      {r.yield_pct.toFixed(1)}
                    </td>
                    <td>
                      <span className={`badge ${r.ccp_pass ? 'ok' : 'danger'}`}>
                        <span className="dot" />
                        {r.ccp_pass ? '합격' : '불합격'}
                      </span>
                    </td>
                    <td className="dim">{r.worker}</td>
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
