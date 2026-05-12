'use client'

import React, { useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import PageHeader from '@/components/layout/PageHeader'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Column } from '@/types/common'

interface BomItem {
  id: number
  product_code: string
  product_name: string
  material_code: string
  material_name: string
  quantity: number
  unit: string
  loss_rate: number
  is_active: boolean
}

// 더미 데이터 (API 연결 전)
const DUMMY_BOM: BomItem[] = [
  { id: 1, product_code: 'KMC-001', product_name: '배추김치 500g', material_code: 'MTL-001', material_name: '절임배추', quantity: 0.65, unit: 'kg', loss_rate: 5, is_active: true },
  { id: 2, product_code: 'KMC-001', product_name: '배추김치 500g', material_code: 'MTL-002', material_name: '고춧가루', quantity: 0.05, unit: 'kg', loss_rate: 2, is_active: true },
  { id: 3, product_code: 'KMC-001', product_name: '배추김치 500g', material_code: 'MTL-003', material_name: '마늘', quantity: 0.03, unit: 'kg', loss_rate: 3, is_active: true },
  { id: 4, product_code: 'KMC-002', product_name: '열무김치 300g', material_code: 'MTL-004', material_name: '열무', quantity: 0.40, unit: 'kg', loss_rate: 8, is_active: true },
  { id: 5, product_code: 'KMC-002', product_name: '열무김치 300g', material_code: 'MTL-002', material_name: '고춧가루', quantity: 0.03, unit: 'kg', loss_rate: 2, is_active: true },
]

const columns: Column<BomItem>[] = [
  { key: 'product_code', title: '제품코드', width: '110px' },
  { key: 'product_name', title: '제품명', width: '160px' },
  { key: 'material_code', title: '자재코드', width: '110px' },
  { key: 'material_name', title: '자재명' },
  { key: 'quantity', title: '소요량', width: '90px', align: 'right', render: (v) => `${v}` },
  { key: 'unit', title: '단위', width: '60px', align: 'center' },
  { key: 'loss_rate', title: '손실율(%)', width: '90px', align: 'right', render: (v) => `${v}%` },
  {
    key: 'is_active',
    title: '상태',
    width: '80px',
    align: 'center',
    render: (v) => (
      <Badge variant={v ? 'success' : 'gray'} dot>
        {v ? '사용' : '미사용'}
      </Badge>
    ),
  },
  {
    key: 'actions',
    title: '작업',
    width: '100px',
    align: 'center',
    render: () => (
      <div className="flex items-center justify-center gap-2">
        <button className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50 transition-colors">수정</button>
        <button className="rounded px-2 py-1 text-xs font-medium text-danger hover:bg-danger-50 transition-colors">삭제</button>
      </div>
    ),
  },
]

export default function BomPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  return (
    <div>
      <PageHeader
        title="BOM 관리"
        subtitle="제품별 자재 소요량(BOM)을 등록하고 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '기준정보관리' },
          { label: 'BOM관리' },
        ]}
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex w-64 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="제품명, 자재명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>
        <Button size="sm" icon={<PlusIcon className="h-4 w-4" />}>
          BOM 등록
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table<BomItem>
          columns={columns}
          data={DUMMY_BOM.filter(
            (item) =>
              !search ||
              item.product_name.includes(search) ||
              item.material_name.includes(search)
          )}
          rowKey="id"
          emptyText="등록된 BOM이 없습니다."
        />
      </div>
    </div>
  )
}
