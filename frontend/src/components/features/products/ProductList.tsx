'use client'

import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PlusIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Table, { Pagination } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import { productApi } from '@/lib/api'
import { formatCurrency, downloadBlob } from '@/lib/utils'
import ProductForm from './ProductForm'
import type { Product, ProductListParams } from '@/types/product'
import type { Column } from '@/types/common'
import {
  PRODUCT_TYPE_LABELS,
  SALES_CHANNEL_LABELS,
  PRODUCT_STATUS_LABELS,
} from '@/types/product'

const STATUS_BADGE: Record<string, 'success' | 'danger' | 'gray'> = {
  active: 'success',
  inactive: 'danger',
  discontinued: 'gray',
}

export default function ProductList() {
  const queryClient = useQueryClient()

  // 필터/페이징 상태
  const [params, setParams] = useState<ProductListParams>({
    page: 1,
    page_size: 20,
    search: '',
  })
  const [searchInput, setSearchInput] = useState('')

  // 모달 상태
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)

  // 목록 조회
  const { data, isLoading } = useQuery(
    ['products', params],
    () => productApi.getList(params).then((r) => r.data),
    { keepPreviousData: true }
  )

  // 삭제 뮤테이션
  const deleteMutation = useMutation(
    (id: number) => productApi.delete(id),
    {
      onSuccess: () => {
        toast.success('제품이 삭제되었습니다.')
        queryClient.invalidateQueries(['products'])
        setDeleteProduct(null)
      },
      onError: () => {
        toast.error('삭제 중 오류가 발생했습니다.')
      },
    }
  )

  // 검색 실행
  const handleSearch = useCallback(() => {
    setParams((prev) => ({ ...prev, page: 1, search: searchInput }))
  }, [searchInput])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // 엑셀 다운로드
  const handleExcelDownload = async () => {
    try {
      const res = await productApi.exportExcel(params)
      downloadBlob(
        new Blob([res.data as BlobPart]),
        `제품목록_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
    } catch {
      toast.error('엑셀 다운로드에 실패했습니다.')
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries(['products'])
    setCreateModalOpen(false)
    setEditProduct(null)
  }

  // 컬럼 정의
  const columns: Column<Product>[] = [
    { key: 'product_code', title: '제품코드', width: '120px' },
    { key: 'product_name', title: '제품명' },
    {
      key: 'product_type',
      title: '유형',
      width: '80px',
      align: 'center',
      render: (value) => (
        <Badge variant="secondary">{PRODUCT_TYPE_LABELS[value as keyof typeof PRODUCT_TYPE_LABELS] ?? String(value)}</Badge>
      ),
    },
    {
      key: 'capacity_g',
      title: '용량',
      width: '80px',
      align: 'right',
      render: (value) => `${value}g`,
    },
    { key: 'packaging_unit', title: '포장단위', width: '100px', align: 'center' },
    {
      key: 'sales_channel',
      title: '채널',
      width: '80px',
      align: 'center',
      render: (value) => SALES_CHANNEL_LABELS[value as keyof typeof SALES_CHANNEL_LABELS] ?? String(value),
    },
    {
      key: 'unit_price',
      title: '단가',
      width: '100px',
      align: 'right',
      render: (value) => formatCurrency(value as number),
    },
    {
      key: 'status',
      title: '상태',
      width: '80px',
      align: 'center',
      render: (value) => (
        <Badge variant={STATUS_BADGE[value as string] ?? 'gray'} dot>
          {PRODUCT_STATUS_LABELS[value as keyof typeof PRODUCT_STATUS_LABELS] ?? String(value)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: '작업',
      width: '100px',
      align: 'center',
      render: (_value, record) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditProduct(record)
            }}
            className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
          >
            수정
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setDeleteProduct(record)
            }}
            className="rounded px-2 py-1 text-xs font-medium text-danger hover:bg-danger-50 transition-colors"
          >
            삭제
          </button>
        </div>
      ),
    },
  ]

  const products: Product[] = data?.items ?? []
  const totalItems = data?.total ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <div>
      {/* 상단 필터 + 액션 */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          {/* 검색 */}
          <div className="flex w-64 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <input
              type="text"
              placeholder="제품명, 제품코드 검색"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          {/* 유형 필터 */}
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
            value={params.product_type ?? ''}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                page: 1,
                product_type: e.target.value as Product['product_type'] | undefined,
              }))
            }
          >
            <option value="">전체 유형</option>
            <option value="kimchi">김치</option>
            <option value="side_dish">반찬</option>
            <option value="sauce">양념</option>
            <option value="other">기타</option>
          </select>
          {/* 채널 필터 */}
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
            value={params.sales_channel ?? ''}
            onChange={(e) =>
              setParams((prev) => ({
                ...prev,
                page: 1,
                sales_channel: e.target.value as Product['sales_channel'] | undefined,
              }))
            }
          >
            <option value="">전체 채널</option>
            <option value="retail">소매</option>
            <option value="wholesale">도매</option>
            <option value="online">온라인</option>
            <option value="export">수출</option>
          </select>
          <Button variant="secondary" size="sm" onClick={handleSearch}>
            검색
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowDownTrayIcon className="h-4 w-4" />}
            onClick={handleExcelDownload}
          >
            엑셀다운로드
          </Button>
          <Button
            size="sm"
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setCreateModalOpen(true)}
          >
            등록
          </Button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table<Product>
          columns={columns}
          data={products}
          loading={isLoading}
          rowKey="id"
          emptyText="등록된 제품이 없습니다."
        />
        {!isLoading && products.length > 0 && (
          <div className="border-t border-gray-100">
            <Pagination
              currentPage={params.page ?? 1}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={params.page_size ?? 20}
              onPageChange={(page) => setParams((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </div>

      {/* 등록 모달 */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="제품 등록"
        size="lg"
      >
        <ProductForm
          onSuccess={handleFormSuccess}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      {/* 수정 모달 */}
      <Modal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="제품 수정"
        size="lg"
      >
        <ProductForm
          product={editProduct}
          onSuccess={handleFormSuccess}
          onCancel={() => setEditProduct(null)}
        />
      </Modal>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => deleteProduct && deleteMutation.mutate(deleteProduct.id)}
        title="제품 삭제"
        message={`"${deleteProduct?.product_name}" 제품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        loading={deleteMutation.isLoading}
      />
    </div>
  )
}
