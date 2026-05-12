'use client'

import React, { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ProductionPlanList from '@/components/features/production/ProductionPlanList'
import ProductionPlanForm from '@/components/features/production/ProductionPlanForm'
import Modal from '@/components/ui/Modal'

export default function ProductionPlansPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)

  return (
    <div className="p-6">
      <PageHeader
        title="생산계획"
        subtitle="제품별 생산계획을 수립하고 작업지시를 생성합니다."
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '생산계획' },
        ]}
      />

      <ProductionPlanList onClickNew={() => setIsNewModalOpen(true)} />

      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="생산계획 등록"
        size="lg"
      >
        <ProductionPlanForm
          onSuccess={() => setIsNewModalOpen(false)}
          onCancel={() => setIsNewModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
