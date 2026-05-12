'use client'

import React, { useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import PageHeader from '@/components/layout/PageHeader'
import Table from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Column } from '@/types/common'

interface Customer {
  id: number
  customer_code: string
  customer_name: string
  customer_type: 'buyer' | 'supplier' | 'both'
  contact_person: string
  phone: string
  email: string
  address: string
  is_active: boolean
  created_at: string
}

const DUMMY_CUSTOMERS: Customer[] = [
  {
    id: 1, customer_code: 'CST-001', customer_name: '롯데마트(주)', customer_type: 'buyer',
    contact_person: '김구매', phone: '02-1234-5678', email: 'buy@lotte.com',
    address: '서울시 송파구 잠실동', is_active: true, created_at: '2024-01-15',
  },
  {
    id: 2, customer_code: 'CST-002', customer_name: '이마트(주)', customer_type: 'buyer',
    contact_person: '이담당', phone: '02-2345-6789', email: 'buy@emart.com',
    address: '서울시 중구 봉래동', is_active: true, created_at: '2024-01-20',
  },
  {
    id: 3, customer_code: 'CST-003', customer_name: 'GS리테일(주)', customer_type: 'buyer',
    contact_person: '박매입', phone: '02-3456-7890', email: 'buy@gs.com',
    address: '서울시 강남구 역삼동', is_active: true, created_at: '2024-02-01',
  },
  {
    id: 4, customer_code: 'SUP-001', customer_name: '파주농협', customer_type: 'supplier',
    contact_person: '최농협', phone: '031-111-2222', email: 'supply@paju.com',
    address: '경기도 파주시 조리읍', is_active: true, created_at: '2024-01-10',
  },
  {
    id: 5, customer_code: 'SUP-002', customer_name: '임진강채소농원', customer_type: 'supplier',
    contact_person: '정농원', phone: '031-222-3333', email: 'farm@imjin.com',
    address: '경기도 연천군 미산면', is_active: true, created_at: '2024-01-12',
  },
]

const TYPE_MAP: Record<string, { label: string; variant: 'primary' | 'success' | 'secondary' }> = {
  buyer: { label: '매출처', variant: 'primary' },
  supplier: { label: '매입처', variant: 'success' },
  both: { label: '겸용', variant: 'secondary' },
}

const columns: Column<Customer>[] = [
  { key: 'customer_code', title: '거래처코드', width: '110px' },
  { key: 'customer_name', title: '거래처명' },
  {
    key: 'customer_type',
    title: '구분',
    width: '80px',
    align: 'center',
    render: (v) => {
      const t = TYPE_MAP[v as string]
      return t ? <Badge variant={t.variant}>{t.label}</Badge> : String(v)
    },
  },
  { key: 'contact_person', title: '담당자', width: '90px' },
  { key: 'phone', title: '연락처', width: '130px' },
  { key: 'email', title: '이메일', width: '180px' },
  { key: 'address', title: '주소' },
  {
    key: 'is_active',
    title: '상태',
    width: '70px',
    align: 'center',
    render: (v) => <Badge variant={v ? 'success' : 'gray'} dot>{v ? '정상' : '중지'}</Badge>,
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

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const filtered = DUMMY_CUSTOMERS.filter((c) => {
    const matchSearch = !search || c.customer_name.includes(search) || c.customer_code.includes(search)
    const matchType = !typeFilter || c.customer_type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div>
      <PageHeader
        title="거래처 관리"
        subtitle="매출처 및 매입처 거래처 정보를 관리합니다."
        breadcrumbs={[
          { label: '홈', href: '/dashboard' },
          { label: '기준정보관리' },
          { label: '거래처' },
        ]}
      />

      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex w-64 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="거래처명, 코드 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">전체 구분</option>
            <option value="buyer">매출처</option>
            <option value="supplier">매입처</option>
            <option value="both">겸용</option>
          </select>
        </div>
        <Button size="sm" icon={<PlusIcon className="h-4 w-4" />}>
          거래처 등록
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table<Customer>
          columns={columns}
          data={filtered}
          rowKey="id"
          emptyText="등록된 거래처가 없습니다."
        />
      </div>
    </div>
  )
}
