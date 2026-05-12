import React from 'react'
import PageHeader from '@/components/layout/PageHeader'
import ProductList from '@/components/features/products/ProductList'

export default function ProductsPage() {
  return (
    <div>
      <PageHeader
        title="제품품목기준 관리"
        subtitle="판매 제품의 기준정보를 등록하고 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '기준정보관리' },
          { label: '제품품목' },
        ]}
      />
      <ProductList />
    </div>
  )
}
