'use client'

import React, { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import ShipmentList from '@/components/features/shipments/ShipmentList'
import ShipmentForm from '@/components/features/shipments/ShipmentForm'

export default function ShipmentsPage() {
  const [formModalOpen, setFormModalOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="출하관리"
        subtitle="출하 등록, 확정, 배달 완료 처리를 관리합니다."
        breadcrumbs={[{ label: '출하관리' }]}
        actions={
          <Button variant="primary" onClick={() => setFormModalOpen(true)}>
            출하 등록
          </Button>
        }
      />

      <ShipmentList />

      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title="출하 등록"
        size="xl"
      >
        <ShipmentForm
          onSuccess={() => setFormModalOpen(false)}
          onCancel={() => setFormModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
