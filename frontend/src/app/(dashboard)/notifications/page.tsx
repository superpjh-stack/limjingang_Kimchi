'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid'
import {
  BellIcon,
  ArrowPathIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { notificationApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'

// ─── 타입 인라인 정의 ────────────────────────────────────────────────────────
type NotificationSeverity = 'DANGER' | 'WARNING' | 'INFO'
type FilterTab = 'ALL' | 'UNREAD' | 'DANGER' | 'WARNING'

interface Notification {
  id: number
  title: string
  message: string
  severity: NotificationSeverity
  is_read: boolean
  notification_type: string
  created_at: string
}

interface NotificationListResponse {
  data: Notification[]
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// ─── 심각도 설정 ─────────────────────────────────────────────────────────────
const severityConfig: Record<
  NotificationSeverity,
  { icon: React.ElementType; iconColor: string; bg: string; badgeClass: string; label: string }
> = {
  DANGER: {
    icon: ExclamationCircleIcon,
    iconColor: 'text-[#EA4335]',
    bg: 'bg-[#EA4335]/10',
    badgeClass: 'bg-[#EA4335]/10 text-[#EA4335]',
    label: 'DANGER',
  },
  WARNING: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-[#FBBC04]',
    bg: 'bg-[#FBBC04]/10',
    badgeClass: 'bg-[#FBBC04]/10 text-[#FBBC04]',
    label: 'WARNING',
  },
  INFO: {
    icon: InformationCircleIcon,
    iconColor: 'text-[#1A73E8]',
    bg: 'bg-[#1A73E8]/10',
    badgeClass: 'bg-[#1A73E8]/10 text-[#1A73E8]',
    label: 'INFO',
  },
}

// ─── 날짜 포맷 ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── 필터 탭 버튼 ────────────────────────────────────────────────────────────
const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'UNREAD', label: '읽지않음' },
  { key: 'DANGER', label: 'DANGER' },
  { key: 'WARNING', label: 'WARNING' },
]

// ─── 알림 카드 ───────────────────────────────────────────────────────────────
function NotificationCard({
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
      className={cn(
        'flex gap-4 rounded-xl border bg-white p-4 shadow-sm transition-all',
        notification.is_read
          ? 'border-gray-100 opacity-60'
          : 'border-gray-200 hover:border-[#1A73E8]/30 hover:shadow-md'
      )}
    >
      {/* 아이콘 */}
      <div className={cn('mt-0.5 flex-shrink-0 rounded-full p-2 self-start', cfg.bg)}>
        <Icon className={cn('h-5 w-5', cfg.iconColor)} />
      </div>

      {/* 내용 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
              cfg.badgeClass
            )}
          >
            {cfg.label}
          </span>
          <span className="text-sm font-semibold text-gray-900">{notification.title}</span>
          {notification.is_read && (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
              <CheckIcon className="h-3 w-3" />
              읽음
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{notification.message}</p>
        <p className="mt-2 text-xs text-gray-400">{formatDate(notification.created_at)}</p>
      </div>

      {/* 읽음 버튼 */}
      {!notification.is_read && (
        <div className="flex-shrink-0 self-start">
          <button
            onClick={() => onMarkRead(notification.id)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            읽음
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 페이지 컴포넌트 ─────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // 목록 쿼리
  const { data, isLoading, isError } = useQuery<NotificationListResponse>({
    queryKey: ['notifications', activeTab, page],
    queryFn: async () => {
      const params: Record<string, unknown> = { limit: LIMIT, page }
      if (activeTab === 'UNREAD') params.is_read = false
      if (activeTab === 'DANGER') params.severity = 'DANGER'
      if (activeTab === 'WARNING') params.severity = 'WARNING'
      const res = await notificationApi.getList(params)
      return res.data
    },
    staleTime: 30_000,
  })

  // 읽지 않은 알림 수
  const { data: countData } = useQuery({
    queryKey: ['notification-count'],
    queryFn: () => notificationApi.getCount().then((r) => r.data),
    refetchInterval: 10_000,
  })

  // 개별 읽음 처리
  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] })
    },
  })

  // 전체 읽음 처리
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-preview'] })
    },
  })

  // 시스템 체크
  const triggerCheckMutation = useMutation({
    mutationFn: () => notificationApi.triggerCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-count'] })
    },
  })

  const notifications: Notification[] = data?.data ?? []
  const pagination = data?.pagination
  const unreadCount: number = (countData as any)?.data?.unread_count ?? 0

  // 탭 변경 시 페이지 초기화
  function handleTabChange(tab: FilterTab) {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="알림 관리" subtitle="시스템 알림 및 HACCP 이상 징후 알림">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerCheckMutation.mutate()}
            disabled={triggerCheckMutation.isPending}
            leftIcon={
              <ArrowPathIcon
                className={cn('h-4 w-4', triggerCheckMutation.isPending && 'animate-spin')}
              />
            }
          >
            시스템 체크
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            leftIcon={<CheckIcon className="h-4 w-4" />}
          >
            전체 읽음
          </Button>
        </div>
      </PageHeader>

      {/* 필터 탭 + 미읽음 배지 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-white text-[#1A73E8] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-[#EA4335]/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#EA4335] animate-pulse" />
            <span className="text-sm font-medium text-[#EA4335]">미읽음 {unreadCount}건</span>
          </div>
        )}
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          알림을 불러오는 중...
        </div>
      )}

      {/* 오류 */}
      {isError && (
        <div className="rounded-xl border border-[#EA4335]/20 bg-[#EA4335]/5 px-6 py-8 text-center text-sm text-[#EA4335]">
          알림 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
        </div>
      )}

      {/* 알림 목록 */}
      {!isLoading && !isError && (
        <>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white py-16 shadow-sm">
              <BellIcon className="mb-3 h-12 w-12 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">알림이 없습니다</p>
              <p className="mt-1 text-xs text-gray-400">해당 조건에 맞는 알림이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              ))}
            </div>
          )}

          {/* 페이지네이션 */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              <span className="text-sm text-gray-500">
                {page} / {pagination.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={page >= pagination.total_pages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
