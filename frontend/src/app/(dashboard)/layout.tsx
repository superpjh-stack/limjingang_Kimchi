'use client'

import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* 사이드바 */}
        <Sidebar />

        {/* 메인 콘텐츠 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </QueryClientProvider>
  )
}
