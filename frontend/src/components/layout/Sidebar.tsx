'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logout } from '@/lib/auth'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CubeIcon,
  BeakerIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  BuildingStorefrontIcon,
  DeviceTabletIcon,
} from '@heroicons/react/24/outline'

interface MenuItem {
  label: string
  href?: string
  icon: React.ElementType
  children?: { label: string; href: string }[]
  external?: boolean
}

const menuItems: MenuItem[] = [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    label: '기준정보관리',
    icon: ClipboardDocumentListIcon,
    children: [
      { label: '제품품목', href: '/master/products' },
      { label: 'BOM관리', href: '/master/bom' },
      { label: '거래처', href: '/master/customers' },
      { label: '작업자', href: '/master/workers' },
    ],
  },
  {
    label: '수주/생산계획',
    icon: CalendarDaysIcon,
    children: [
      { label: '수주관리', href: '/orders' },
      { label: '생산계획', href: '/production/plans' },
      { label: '작업지시', href: '/production/work-orders' },
    ],
  },
  {
    label: '자재/재고',
    icon: CubeIcon,
    children: [
      { label: '입고등록', href: '/inventory/receiving' },
      { label: '재고현황', href: '/inventory/status' },
    ],
  },
  {
    label: '공정관리',
    icon: BeakerIcon,
    children: [
      { label: '세척', href: '/process/washing' },
      { label: '절임', href: '/process/salting' },
      { label: '양념', href: '/process/seasoning' },
      { label: '포장', href: '/process/packaging' },
    ],
  },
  {
    label: '품질관리',
    href: '/quality',
    icon: BuildingStorefrontIcon,
  },
  {
    label: 'POP 현장작업',
    href: '/pop',
    icon: DeviceTabletIcon,
    external: true,
  },
  {
    label: 'KPI모니터링',
    href: '/kpi',
    icon: ChartBarIcon,
  },
  {
    label: '설비관리',
    href: '/equipment',
    icon: WrenchScrewdriverIcon,
  },
  {
    label: 'AI Agent',
    href: '/ai-agent',
    icon: CpuChipIcon,
  },
  {
    label: '시스템관리',
    href: '/system',
    icon: Cog6ToothIcon,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>(() => {
    // 현재 경로에 해당하는 메뉴 자동 열기
    return menuItems
      .filter(
        (item) =>
          item.children?.some((child) => pathname.startsWith(child.href))
      )
      .map((item) => item.label)
  })

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  const isActive = (href: string) => pathname === href
  const isParentActive = (item: MenuItem) =>
    item.children?.some((child) => pathname.startsWith(child.href)) ?? false

  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar-bg">
      {/* 로고 */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <span className="text-base font-black text-white">K</span>
        </div>
        <div>
          <p className="text-xs font-bold leading-tight text-white">임진강김치</p>
          <p className="text-[10px] leading-tight text-sidebar-text-muted">MES System</p>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const hasChildren = !!item.children
            const isOpen = openMenus.includes(item.label)
            const parentActive = isParentActive(item)

            if (hasChildren) {
              return (
                <li key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium',
                      'transition-colors duration-150',
                      parentActive
                        ? 'bg-white/15 text-white'
                        : 'text-sidebar-text-muted hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDownIcon
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <ul className="mt-0.5 space-y-0.5 pl-11">
                      {item.children!.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-150',
                              isActive(child.href)
                                ? 'bg-primary text-white'
                                : 'text-sidebar-text-muted hover:bg-white/10 hover:text-white'
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            }

            return (
              <li key={item.label}>
                <Link
                  href={item.href!}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    'transition-colors duration-150',
                    isActive(item.href!)
                      ? 'bg-primary text-white'
                      : 'text-sidebar-text-muted hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.external && (
                    <svg
                      className="ml-auto h-3.5 w-3.5 opacity-60"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <UserCircleIcon className="h-8 w-8 flex-shrink-0 text-sidebar-text-muted" />
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-semibold text-white">관리자</p>
            <p className="truncate text-[10px] text-sidebar-text-muted">admin@imjingang.com</p>
          </div>
          <button
            onClick={logout}
            title="로그아웃"
            className="rounded-md p-1.5 text-sidebar-text-muted hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
