'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { notificationApi } from '@/lib/api'

// ─── 타입 (types/notification.ts 가 생성될 때까지 인라인 정의) ──────────────
type NotificationSeverity = 'DANGER' | 'WARNING' | 'INFO'

interface Notification {
  id: number
  title: string
  message: string
  severity: NotificationSeverity
  is_read: boolean
  created_at: string
}

interface NotificationCount {
  unread_count: number
  total_count: number
}

// ─── 심각도 설정 ─────────────────────────────────────────────────────────────
const severityConfig: Record<
  NotificationSeverity,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  DANGER: {
    icon: ExclamationCircleIcon,
    color: 'text-[#EA4335]',
    bg: 'bg-[#EA4335]/10',
    label: 'DANGER',
  },
  WARNING: {
    icon: ExclamationTriangleIcon,
    color: 'text-[#FBBC04]',
    bg: 'bg-[#FBBC04]/10',
    label: 'WARNING',
  },
  INFO: {
    icon: InformationCircleIcon,
    color: 'text-[#1A73E8]',
    bg: 'bg-[#1A73E8]/10',
    label: 'INFO',
  },
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// ─── 알림 아이템 ─────────────────────────────────────────────────────────────
function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification
  onMarkRead: (id: number) => void
}) {
  const cfg = severityConfig[notification.severity] ?? severityConfig.INFO
  const Icon = cfg.icon

  return (
    <div
      className={`flex gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors hover:bg-gray-50 ${
        notification.is_read ? 'opacity-50' : ''
      }`}
    >
      <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${cfg.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-900 truncate">{notification.title}</p>
        <p className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">{notification.message}</p>
        <p className="mt-1 text-[10px] text-gray-400">{formatRelativeTime(notification.created_at)}</p>
      </div>
      {!notification.is_read && (
        <button
          onClick={() => onMarkRead(notification.id)}
          className="flex-shrink-0 self-start rounded px-1.5 py-0.5 text-[10px] text-[#1A73E8] hover:bg-[#1A73E8]/10 transition-colors"
          title="읽음 처리"
        >
          읽음
        </button>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  // 읽지 않은 알림 수 (5초마다 갱신)
  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationApi.getCount().then((r) => r.data),
    refetchInterval: 5000,
  })

  // 드롭다운용 최근 읽지 않은 알림 10개
  const { data: listData } = useQuery({
    queryKey: ['notifications-preview'],
    queryFn: () =>
      notificationApi.getList({ limit: 10, is_read: false }).then((r) => r.data),
    enabled: isOpen,
  })

  // 개별 읽음 처리
  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount: number = (countData as any)?.data?.unread_count ?? 0
  const notifications: Notification[] = (listData as any)?.data ?? []

  return (
    <div className="relative">
      {/* 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        aria-label="알림"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EA4335] text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 드롭다운 */}
      {isOpen && (
        <>
          {/* 오버레이 */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-10 z-20 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">알림</span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#EA4335] px-2 py-0.5 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded p-0.5 hover:bg-gray-100"
                  aria-label="닫기"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* 알림 목록 */}
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <BellIcon className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-xs">새 알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                  />
                ))
              )}
            </div>

            {/* 하단 링크 */}
            <div className="border-t border-gray-100 p-2">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block w-full rounded-lg py-2 text-center text-xs text-[#1A73E8] hover:bg-[#1A73E8]/5 transition-colors"
              >
                전체 알림 보기
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
