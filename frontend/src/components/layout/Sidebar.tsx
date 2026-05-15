'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

// ── Inline SVG icons (lucide-style, matching prototype) ──────────────────
function Icon({ name, size = 14 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'dashboard':   return <svg {...p}><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>
    case 'database':    return <svg {...p}><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>
    case 'clipboard':   return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M9 12h6M9 16h4"/></svg>
    case 'package':     return <svg {...p}><path d="M16 3.5 8 3.5 3 7v11l9 4 9-4V7z"/><path d="M3 7l9 4 9-4M12 11v11"/></svg>
    case 'leaf':        return <svg {...p}><path d="M21 3c-1 11-7 18-18 18 1-11 7-18 18-18z"/><path d="M3 21c5-5 9-9 12-12"/></svg>
    case 'droplet':     return <svg {...p}><path d="M12 3s7 7.5 7 12.5a7 7 0 0 1-14 0C5 10.5 12 3 12 3z"/></svg>
    case 'beaker':      return <svg {...p}><path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3"/></svg>
    case 'blender':     return <svg {...p}><path d="M6 3h12l2 9H4l2-9z"/><path d="M4 12l2 8h12l2-8"/><path d="M12 12v8"/></svg>
    case 'box':         return <svg {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>
    case 'snowflake':   return <svg {...p}><path d="M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17M2 12h20M4.9 17l14.2-10M19.1 17 4.9 7"/></svg>
    case 'shield':      return <svg {...p}><path d="M12 2 4 5v7c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5z"/></svg>
    case 'trending-up': return <svg {...p}><path d="M3 17l6-6 4 4 8-8M14 7h7v7"/></svg>
    case 'cpu':         return <svg {...p}><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>
    case 'tablet':      return <svg {...p}><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
    case 'ai':          return <svg {...p}><path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>
    case 'settings':    return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>
    case 'chevron-down':  return <svg {...p}><path d="M6 9l6 6 6-6"/></svg>
    case 'chevron-right': return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>
    case 'logout':        return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
    default: return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>
  }
}

// ── Menu structure ────────────────────────────────────────────────────────
interface Child {
  label: string
  href: string
  badge?: string   // '준비중' | '개발' | 'CCP' etc.
  badgeColor?: string
}
interface MenuGroup {
  id: string
  label: string
  icon: string
  children: Child[]
}

const MENU: MenuGroup[] = [
  {
    id: 'dashboard', label: '대시보드', icon: 'dashboard',
    children: [
      { label: '메인 대시보드',  href: '/dashboard' },
    ],
  },
  {
    id: 'master', label: '기준정보 관리', icon: 'database',
    children: [
      { label: '제품 품목',   href: '/master/products' },
      { label: '레시피 BOM',  href: '/master/bom' },
      { label: '거래처',      href: '/master/customers' },
      { label: '작업자',      href: '/master/workers' },
      { label: '공통 코드',   href: '/admin/common-codes' },
    ],
  },
  {
    id: 'order', label: '수주 생산계획', icon: 'clipboard',
    children: [
      { label: '수주 정보',   href: '/orders' },
      { label: '생산 계획',   href: '/production/plans' },
      { label: '작업지시서',  href: '/production/work-orders' },
    ],
  },
  {
    id: 'inventory', label: '자재·재고', icon: 'package',
    children: [
      { label: '원부자재 입고',  href: '/inventory/materials' },
      { label: '실시간 재고',    href: '/inventory/products' },
    ],
  },
  {
    id: 'pretreat', label: '입고 전처리', icon: 'leaf',
    children: [
      { label: '원물 입고 검사',   href: '/process/incoming' },
      { label: '전처리 중량',      href: '/process/pretreat' },
    ],
  },
  {
    id: 'wash', label: '세척 공정', icon: 'droplet',
    children: [
      { label: '세척 공정 관리', href: '/process/washing' },
      { label: '소독수 (CCP1)', href: '/process/sanitizer', badge: 'CCP', badgeColor: '#C4302B' },
    ],
  },
  {
    id: 'brine', label: '절임 공정', icon: 'beaker',
    children: [
      { label: '절임 공정 관리',     href: '/process/salting' },
      { label: '절임통 운영 (CCP2)', href: '/process/brine-tanks', badge: 'CCP', badgeColor: '#C4302B' },
    ],
  },
  {
    id: 'mix', label: '양념 버무림', icon: 'blender',
    children: [
      { label: '양념 공정 관리', href: '/production/seasoning' },
      { label: '버무림 CCP3',   href: '/process/mixing-ccp', badge: 'CCP', badgeColor: '#C4302B' },
    ],
  },
  {
    id: 'pack', label: '포장 출하', icon: 'box',
    children: [
      { label: '포장 공정 관리', href: '/production/packaging' },
      { label: '출하 관리',     href: '/shipments' },
    ],
  },
  {
    id: 'aging', label: '숙성 냉장', icon: 'snowflake',
    children: [
      { label: '숙성 재고',      href: '/cold-storage' },
      { label: '냉장고 모니터링', href: '/cold-storage/monitor' },
    ],
  },
  {
    id: 'quality', label: '품질 이상', icon: 'shield',
    children: [
      { label: '공정별 불량',        href: '/quality' },
      { label: '금속 검출 (CCP4)',    href: '/quality/metal',  badge: 'CCP', badgeColor: '#C4302B' },
      { label: '이슈 이력',           href: '/quality/issues' },
    ],
  },
  {
    id: 'kpi', label: 'KPI 모니터링', icon: 'trending-up',
    children: [
      { label: '생산성 KPI', href: '/kpi' },
      { label: 'OEE 분석',   href: '/oee' },
      { label: '보고서',     href: '/reports' },
    ],
  },
  {
    id: 'equip', label: '설비 관리', icon: 'cpu',
    children: [
      { label: '설비 가동', href: '/equipment' },
      { label: 'LOT 추적',  href: '/lot-trace' },
    ],
  },
  {
    id: 'pop', label: 'POP 작업', icon: 'tablet',
    children: [
      { label: '작업지시서', href: '/pop' },
    ],
  },
  {
    id: 'ai', label: 'AI Agent', icon: 'ai',
    children: [
      { label: 'AI 질의',   href: '/ai-agent' },
      { label: '알림',       href: '/notifications' },
    ],
  },
  {
    id: 'sys', label: '시스템 관리', icon: 'settings',
    children: [
      { label: '사용자 계정', href: '/admin/users' },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed?: boolean
  onCollapse?: () => void
}

export default function Sidebar({ collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname()

  const findActiveGroup = () => {
    for (const g of MENU) {
      if (g.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))) return g.id
    }
    return null
  }

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = findActiveGroup()
    return active ? new Set([active]) : new Set(['dashboard'])
  })

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const isChildActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="sidebar" style={{ width: collapsed ? 60 : 'var(--side-w)' }}>
      {/* ── Brand ── */}
      <div className="brand">
        <div className="brand-mark">林</div>
        {!collapsed && (
          <div>
            <div className="brand-name">임진강김치</div>
            <div className="brand-sub">MES Smart Factory</div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="nav scrollbar-thin">
        {MENU.map((group) => {
          const expanded = openGroups.has(group.id)
          const groupActive = group.children.some((c) => isChildActive(c.href))

          return (
            <div key={group.id} className="nav-group">
              <button
                className={`nav-section${groupActive ? ' active' : ''}`}
                onClick={() => toggleGroup(group.id)}
                title={collapsed ? group.label : undefined}
              >
                <span className="nav-icon">
                  <Icon name={group.icon} size={14} />
                </span>
                {!collapsed && (
                  <>
                    <span className="nav-label">{group.label}</span>
                    <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={11} />
                  </>
                )}
              </button>

              {!collapsed && expanded && (
                <div className="nav-children">
                  {group.children.map((child) => {
                    const active = isChildActive(child.href)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`nav-item${active ? ' active' : ''}`}
                      >
                        {child.label}
                        {child.badge && (
                          <span
                            className="nav-badge"
                            style={{
                              background: child.badgeColor ? `${child.badgeColor}18` : 'var(--bg-2)',
                              color: child.badgeColor ?? 'var(--muted)',
                            }}
                          >
                            {child.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── System Status ── */}
      {!collapsed && (
        <div className="sidebar-status">
          <div className="status-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ok)', display: 'inline-block' }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)' }}>시스템 정상</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>MES v1.0 · 연천 본사 공장</div>
          </div>

          {/* 사용자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 99, background: 'var(--brand)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>관</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>관리자</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>admin@imjingang.com</div>
            </div>
            <button
              onClick={logout}
              title="로그아웃"
              className="icon-btn"
              style={{ flexShrink: 0 }}
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
