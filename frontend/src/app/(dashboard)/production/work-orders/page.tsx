'use client'

import React from 'react'
import PageHeader from '@/components/layout/PageHeader'
import WorkOrderList from '@/components/features/production/WorkOrderList'

export default function WorkOrdersPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="작업지시"
        subtitle="생성된 작업지시 현황을 조회하고 진행상태를 확인합니다."
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '작업지시' },
        ]}
      />

      <WorkOrderList />
    </div>
  )
}
