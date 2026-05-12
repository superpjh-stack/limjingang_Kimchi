'use client'

import React from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ProductStockTable from '@/components/features/inventory/ProductStockTable'

export default function ProductStockPage() {
  return (
    <div>
      <PageHeader
        title="완제품 재고현황"
        subtitle="창고별 완제품 재고 현황 및 LOT별 상세를 조회합니다."
        breadcrumbs={[{ label: '자재/재고' }, { label: '완제품 재고' }]}
      />
      <ProductStockTable />
    </div>
  )
}
