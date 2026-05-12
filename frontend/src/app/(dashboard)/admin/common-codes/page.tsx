'use client'

import React from 'react'
import PageHeader from '@/components/layout/PageHeader'
import CommonCodeManager from '@/components/features/admin/CommonCodeManager'

export default function CommonCodesPage() {
  return (
    <div>
      <PageHeader
        title="공통코드 관리"
        subtitle="시스템 전반에서 사용하는 공통 코드를 관리합니다."
        breadcrumbs={[{ label: 'MES' }, { label: '시스템관리' }, { label: '공통코드' }]}
      />
      <CommonCodeManager />
    </div>
  )
}
