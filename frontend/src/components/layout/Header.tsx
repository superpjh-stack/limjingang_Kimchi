'use client'

import React from 'react'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* 검색 */}
      <div className="flex w-64 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <input
          type="text"
          placeholder="검색..."
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
        />
      </div>

      {/* 우측 액션 */}
      <div className="flex items-center gap-3">
        {/* 알림 */}
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
        </button>

        {/* 날짜 */}
        <div className="text-right">
          <p className="text-xs font-medium text-gray-700">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <p className="text-[10px] text-gray-400">
            {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}
          </p>
        </div>
      </div>
    </header>
  )
}
