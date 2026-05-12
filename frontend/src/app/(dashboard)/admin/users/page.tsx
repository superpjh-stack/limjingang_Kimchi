'use client'

import React from 'react'
import PageHeader from '@/components/layout/PageHeader'
import UserList from '@/components/features/admin/UserList'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'

// TODO: 실제 인증 컨텍스트에서 currentUser.roles를 읽어 ADMIN 여부를 판단한다.
// 현재는 항상 관리자로 간주하여 화면을 표시한다.
const IS_ADMIN = true

export default function UsersPage() {
  if (!IS_ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldExclamationIcon className="mb-4 h-12 w-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700">접근 권한이 없습니다</h2>
        <p className="mt-2 text-sm text-gray-500">
          이 페이지는 시스템 관리자(ADMIN)만 접근할 수 있습니다.
        </p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="사용자 관리"
        subtitle="시스템 사용자 계정과 역할을 관리합니다."
        breadcrumbs={[{ label: 'MES' }, { label: '시스템관리' }, { label: '사용자관리' }]}
      />
      <UserList />
    </div>
  )
}
