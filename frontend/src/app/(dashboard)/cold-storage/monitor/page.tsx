'use client'

import React, { useState, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type StorageType = 'REFRIGERATOR' | 'FREEZER'
type StorageStatus = 'NORMAL' | 'ALERT' | 'MAINTENANCE'

interface StorageUnit {
  id: string
  name: string
  type: StorageType
  temp: number
  humidity: number
  status: StorageStatus
  min_temp: number
  max_temp: number
  last_measured: string
}

interface AlarmRecord {
  id: string
  occurred_at: string
  unit_name: string
  content: string
  action: string
  resolved_at: string | null
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// GET /api/v1/cold-storage/units
const mockStorages: StorageUnit[] = [
  { id: 'RF-01', name: '냉장창고 1호', type: 'REFRIGERATOR', temp: 2.3, humidity: 88, status: 'NORMAL', min_temp: 0, max_temp: 5, last_measured: '14:35' },
  { id: 'RF-02', name: '냉장창고 2호', type: 'REFRIGERATOR', temp: 6.1, humidity: 91, status: 'ALERT', min_temp: 0, max_temp: 5, last_measured: '14:35' },
  { id: 'RF-03', name: '냉장창고 3호', type: 'REFRIGERATOR', temp: 1.8, humidity: 87, status: 'NORMAL', min_temp: 0, max_temp: 5, last_measured: '14:35' },
  { id: 'RF-04', name: '냉장창고 4호', type: 'REFRIGERATOR', temp: 3.2, humidity: 90, status: 'NORMAL', min_temp: 0, max_temp: 5, last_measured: '14:35' },
  { id: 'FF-01', name: '냉동창고 1호', type: 'FREEZER', temp: -20.5, humidity: 70, status: 'NORMAL', min_temp: -25, max_temp: -18, last_measured: '14:35' },
  { id: 'FF-02', name: '냉동창고 2호', type: 'FREEZER', temp: -17.2, humidity: 68, status: 'ALERT', min_temp: -25, max_temp: -18, last_measured: '14:35' },
]

// GET /api/v1/cold-storage/alarms
const mockAlarms: AlarmRecord[] = [
  { id: 'ALM-001', occurred_at: '14:28', unit_name: '냉장창고 2호', content: '온도 초과 (6.1°C / 기준 5°C)', action: '담당자 출동 — 도어 밀봉 확인 중', resolved_at: null },
  { id: 'ALM-002', occurred_at: '14:22', unit_name: '냉동창고 2호', content: '온도 이탈 (-17.2°C / 기준 -18°C)', action: '냉동기 점검 요청', resolved_at: null },
  { id: 'ALM-003', occurred_at: '11:05', unit_name: '냉장창고 3호', content: '습도 저하 (78% / 기준 85%)', action: '가습기 수동 작동', resolved_at: '11:42' },
  { id: 'ALM-004', occurred_at: '09:18', unit_name: '냉장창고 1호', content: '온도 일시 이탈 (5.3°C)', action: '도어 정비 완료', resolved_at: '09:35' },
]

// 12시간 온도 추이 (CSS bar chart용) — 단순화된 mock
// GET /api/v1/cold-storage/units/{id}/trend
const mockTrend12h = [
  { hour: '03', temp: 2.1 }, { hour: '04', temp: 2.3 }, { hour: '05', temp: 2.0 },
  { hour: '06', temp: 2.2 }, { hour: '07', temp: 2.5 }, { hour: '08', temp: 2.8 },
  { hour: '09', temp: 3.1 }, { hour: '10', temp: 4.2 }, { hour: '11', temp: 3.8 },
  { hour: '12', temp: 3.2 }, { hour: '13', temp: 3.5 }, { hour: '14', temp: 6.1 },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(s: StorageStatus) {
  const map: Record<StorageStatus, string> = { NORMAL: '정상', ALERT: '경보', MAINTENANCE: '점검' }
  return map[s]
}

function statusClass(s: StorageStatus) {
  const map: Record<StorageStatus, string> = { NORMAL: 'ok', ALERT: 'danger', MAINTENANCE: 'warn' }
  return map[s]
}

/** 온도 게이지 바: 현재 온도가 [min, max] 범위 내에서 어느 위치인지 */
function TempGauge({ temp, min, max }: { temp: number; min: number; max: number }) {
  const range = max - min
  // 표시용 확장 범위 (min-2 ~ max+2)
  const displayMin = min - 2
  const displayMax = max + 2
  const displayRange = displayMax - displayMin
  const pct = Math.min(100, Math.max(0, ((temp - displayMin) / displayRange) * 100))
  const inRange = temp >= min && temp <= max

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
        <span>{displayMin.toFixed(0)}°C</span>
        <span style={{ color: inRange ? 'var(--ok)' : 'var(--danger)', fontWeight: 600, fontSize: 11 }}>
          {min}~{max}°C
        </span>
        <span>{displayMax.toFixed(0)}°C</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 99, position: 'relative', overflow: 'visible' }}>
        {/* 기준 범위 표시 */}
        <div style={{
          position: 'absolute',
          left: `${((min - displayMin) / displayRange) * 100}%`,
          width: `${(range / displayRange) * 100}%`,
          height: '100%',
          background: 'rgba(16,185,129,0.25)',
          borderRadius: 99,
        }} />
        {/* 현재 온도 포인터 */}
        <div style={{
          position: 'absolute',
          left: `calc(${pct}% - 6px)`,
          top: -3,
          width: 14,
          height: 14,
          borderRadius: 99,
          background: inRange ? 'var(--ok)' : 'var(--danger)',
          border: '2px solid white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          zIndex: 2,
        }} />
      </div>
    </div>
  )
}

/** 냉장고 카드 */
function StorageCard({ unit, selected, onClick }: { unit: StorageUnit; selected: boolean; onClick: () => void }) {
  const isAlert = unit.status === 'ALERT'
  const isNormal = unit.status === 'NORMAL'

  return (
    <div
      onClick={onClick}
      style={{
        background: isAlert ? 'var(--danger-bg)' : 'var(--surface)',
        border: `1.5px solid ${isAlert ? 'var(--danger)' : selected ? 'var(--brand)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px rgba(196,48,43,0.12)' : 'var(--shadow-sm)',
        transition: 'all 0.15s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{unit.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {unit.type === 'REFRIGERATOR' ? '냉장' : '냉동'} · 최종 {unit.last_measured}
          </div>
        </div>
        <span className={`badge ${statusClass(unit.status)}`}>
          <span className="dot" />
          {statusLabel(unit.status)}
        </span>
      </div>

      {/* Temperature (big) */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '12px 0 4px' }}>
        <span style={{
          fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em',
          color: isAlert ? 'var(--danger)' : isNormal ? 'var(--ink)' : 'var(--warn)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {unit.temp > 0 ? '+' : ''}{unit.temp.toFixed(1)}
        </span>
        <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 500 }}>°C</span>
      </div>

      {/* Humidity */}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
        습도 <strong style={{ color: 'var(--ink)' }}>{unit.humidity}%</strong>
        <span style={{ marginLeft: 6, fontSize: 11, color: unit.humidity >= 85 && unit.humidity <= 95 ? 'var(--ok)' : 'var(--warn)' }}>
          {unit.humidity >= 85 && unit.humidity <= 95 ? '(적정)' : '(기준 85~95%)'}
        </span>
      </div>

      {/* Gauge */}
      <TempGauge temp={unit.temp} min={unit.min_temp} max={unit.max_temp} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ColdStorageMonitorPage() {
  const [selectedId, setSelectedId] = useState<string>('RF-02')

  const alertUnits = useMemo(() => mockStorages.filter((u) => u.status === 'ALERT'), [])
  const hasAlert = alertUnits.length > 0

  const selectedUnit = mockStorages.find((u) => u.id === selectedId)

  // 12h 트렌드 최대값 (bar chart 스케일용)
  const trendMax = useMemo(() => Math.max(...mockTrend12h.map((t) => Math.abs(t.temp))), [])
  const maxRange = selectedUnit ? Math.abs(selectedUnit.max_temp) + 3 : 10

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">냉장고 모니터링</h1>
          <p className="page-desc">HACCP CCP — 냉장/냉동 창고 실시간 온도·습도 모니터링</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>자동 갱신 30초</span>
          <button className="btn btn-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
            새로고침
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {hasAlert ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--danger-bg)', border: '1px solid var(--danger)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth={2} strokeLinecap="round"><path d="M12 2 2 22h20z"/><path d="M12 9v5M12 18v.5"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', flex: 1 }}>
            온도 이탈 경보 — {alertUnits.map((u) => u.name).join(', ')} ({alertUnits.length}개소)
          </span>
          <span style={{ fontSize: 12, color: 'var(--danger)' }}>즉시 현장 확인 필요</span>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--ok-bg)', border: '1px solid var(--ok)',
          borderRadius: 8, padding: '10px 16px', marginBottom: 20,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth={2} strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ok)' }}>
            전체 창고 정상 운영 중
          </span>
        </div>
      )}

      {/* CCP 기준 안내 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: '냉장 CCP 기준', value: '0 ~ 5°C (최적 2°C)', icon: '❄' },
          { label: '냉동 CCP 기준', value: '-18°C 이하', icon: '🧊' },
          { label: '습도 기준', value: '85 ~ 95%', icon: '💧' },
        ].map((c) => (
          <div key={c.label} style={{
            padding: '6px 14px', background: 'var(--info-bg)',
            border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8,
            fontSize: 12, color: 'var(--info)', display: 'flex', gap: 6, alignItems: 'center',
          }}>
            <span>{c.icon}</span>
            <span style={{ color: 'var(--muted)' }}>{c.label}:</span>
            <strong>{c.value}</strong>
          </div>
        ))}
      </div>

      {/* Storage Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {mockStorages.map((unit) => (
          <StorageCard
            key={unit.id}
            unit={unit}
            selected={selectedId === unit.id}
            onClick={() => setSelectedId(unit.id)}
          />
        ))}
      </div>

      {/* 12h Trend Chart (CSS bar chart) */}
      {selectedUnit && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">시간별 온도 추이 — {selectedUnit.name}</div>
              <div className="card-subtitle">지난 12시간 · CCP 기준 {selectedUnit.min_temp}~{selectedUnit.max_temp}°C</div>
            </div>
            <span className={`badge ${statusClass(selectedUnit.status)}`}>
              <span className="dot" />{statusLabel(selectedUnit.status)}
            </span>
          </div>
          <div className="card-body">
            {/* Chart area */}
            <div style={{ position: 'relative', height: 120, display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {/* 기준선 표시 (max_temp) */}
              <div style={{
                position: 'absolute',
                bottom: `${(selectedUnit.max_temp - selectedUnit.min_temp + 2) / (maxRange + 4) * 100}%`,
                left: 0, right: 0,
                borderTop: '1.5px dashed var(--danger)',
                zIndex: 1,
              }}>
                <span style={{ position: 'absolute', right: 0, top: -14, fontSize: 10, color: 'var(--danger)', background: 'var(--surface)', padding: '0 4px' }}>
                  상한 {selectedUnit.max_temp}°C
                </span>
              </div>

              {mockTrend12h.map((point) => {
                const absTemp = selectedUnit.type === 'FREEZER' ? Math.abs(point.temp) : point.temp
                const barH = Math.min(100, (absTemp / (maxRange + 2)) * 100)
                const isOver = selectedUnit.type === 'FREEZER'
                  ? point.temp > selectedUnit.max_temp
                  : point.temp > selectedUnit.max_temp
                return (
                  <div key={point.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 9.5, color: isOver ? 'var(--danger)' : 'var(--muted)', fontWeight: isOver ? 700 : 400 }}>
                      {point.temp > 0 ? '+' : ''}{point.temp}
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${barH}%`,
                      background: isOver ? 'var(--danger)' : 'var(--ok)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      minHeight: 4,
                    }} />
                    <div style={{ fontSize: 9.5, color: 'var(--muted-2)' }}>{point.hour}시</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Alarm History Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">경보 이력</div>
          <span className="dim">오늘 발생 경보</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>발생시간</th>
                  <th>창고</th>
                  <th>이상내용</th>
                  <th>조치사항</th>
                  <th>해제시간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {mockAlarms.map((alarm) => (
                  <tr key={alarm.id} style={!alarm.resolved_at ? { background: 'var(--danger-bg)' } : undefined}>
                    <td className="mono" style={{ color: alarm.resolved_at ? 'var(--muted)' : 'var(--danger)', fontWeight: alarm.resolved_at ? 400 : 700 }}>
                      {alarm.occurred_at}
                    </td>
                    <td className="strong">{alarm.unit_name}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{alarm.content}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>{alarm.action}</td>
                    <td className="mono" style={{ color: 'var(--muted)' }}>
                      {alarm.resolved_at ?? '—'}
                    </td>
                    <td>
                      {alarm.resolved_at ? (
                        <span className="badge ok"><span className="dot" />해제</span>
                      ) : (
                        <span className="badge danger"><span className="dot" />진행중</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
