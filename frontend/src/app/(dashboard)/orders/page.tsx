'use client'

import React, { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import OrderList from '@/components/features/orders/OrderList'
import OrderForm from '@/components/features/orders/OrderForm'
import OrderDetailModal from '@/components/features/orders/OrderDetailModal'
import Modal from '@/components/ui/Modal'
import type { Order } from '@/types/order'

export default function OrdersPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  return (
    <div className="p-6">
      <PageHeader
        title="수주관리"
        subtitle="고객 수주를 등록하고 진행 상태를 관리합니다."
        breadcrumbs={[{ label: '홈', href: '/dashboard' }, { label: '수주관리' }]}
      />

      <OrderList
        onClickNew={() => setIsNewModalOpen(true)}
        onClickDetail={(order) => setSelectedOrder(order)}
      />

      {/* 신규 수주 등록 모달 */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="신규 수주 등록"
        size="xl"
      >
        <OrderForm
          onSuccess={() => setIsNewModalOpen(false)}
          onCancel={() => setIsNewModalOpen(false)}
        />
      </Modal>

      {/* 수주 상세 모달 */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  )
}
