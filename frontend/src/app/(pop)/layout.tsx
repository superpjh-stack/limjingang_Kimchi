'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { QueryClient, QueryClientProvider } from 'react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

function PopHeader() {
  const [now, setNow] = useState<Date>(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <span className="text-sm font-black text-white">K</span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">임진강김치(주)</p>
          <p className="text-xs text-gray-500">POP 현장작업 시스템</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-xs text-gray-500">{formatDate(now)}</p>
          <p className="font-mono text-lg font-bold tabular-nums text-gray-900">
            {formatTime(now)}
          </p>
        </div>
        <Link
          href="/preprocess"
          className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100"
        >
          입고전처리
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          관리화면으로
        </Link>
      </div>
    </header>
  )
}

export default function PopLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <PopHeader />
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </div>
    </QueryClientProvider>
  )
}
