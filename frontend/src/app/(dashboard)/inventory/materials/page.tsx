'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'
import { formatDate, formatCurrency } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import MaterialStockTable from '@/components/features/inventory/MaterialStockTable'
import MaterialReceiveForm from '@/components/features/inventory/MaterialReceiveForm'
import MaterialIssueForm from '@/components/features/inventory/MaterialIssueForm'
import TransactionHistory from '@/components/features/inventory/TransactionHistory'
import MaterialQcApproval from '@/components/features/quality/MaterialQcApproval'
import QcStatusBadge from '@/components/features/quality/QcStatusBadge'
import type { MaterialReceive } from '@/types/inventory'

type Tab = 'stock' | 'receive' | 'transactions'

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stock')
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [issueModal, setIssueModal] = useState<{
    open: boolean
    materialId?: number
    materialName?: string
  }>({ open: false })

  const { data: receiveListData, isLoading: receiveLoading } = useQuery({
    queryKey: ['inventory', 'receive-list'],
    queryFn: () => inventoryApi.getReceiveList({ limit: 100 }),
    enabled: activeTab === 'receive',
  })

  const receiveList: MaterialReceive[] =
    (receiveListData as { data?: { data?: MaterialReceive[] } })?.data?.data ?? []

  const tabs = [
    { key: 'stock' as Tab, label: '재고현황' },
    { key: 'receive' as Tab, label: '입고내역' },
    { key: 'transactions' as Tab, label: '입출고이력' },
  ]

  return (
    <div>
      <PageHeader
        title="원자재 재고관리"
        subtitle="원자재 재고 현황, 입고·출고, 이력을 관리합니다."
        breadcrumbs={[{ label: '자재/재고' }, { label: '원자재 재고' }]}
        actions={
          <Button
            variant="primary"
            onClick={() => setReceiveModalOpen(true)}
          >
            입고 등록
          </Button>
        }
      />

      {/* 탭 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'stock' && (
        <MaterialStockTable
          onReceive={() => setReceiveModalOpen(true)}
          onIssue={(materialId, materialName) =>
            setIssueModal({ open: true, materialId, materialName })
          }
        />
      )}

      {activeTab === 'receive' && (
        <div className="space-y-8">
          {/* 검사 대기 승인 섹션 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">입고검사 승인 대기</h3>
            <MaterialQcApproval />
          </div>

          {/* 전체 입고 내역 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">전체 입고 내역</h3>
            {receiveLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="h-5 w-5 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="ml-2 text-sm text-gray-500">불러오는 중...</span>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">입고번호</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">자재명</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">창고</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">입고일</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">수량</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">금액</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">LOT번호</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">공급업체</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">QC상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {receiveList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-sm text-gray-500">
                          입고 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      receiveList.map((receive) => (
                        <tr key={receive.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                            {receive.receive_no}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{receive.raw_material_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{receive.warehouse_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(receive.receive_date)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {receive.receive_qty.toLocaleString('ko-KR')}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700">
                            {receive.amount ? formatCurrency(receive.amount) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">
                            {receive.lot_no || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{receive.supplier || '-'}</td>
                          <td className="px-4 py-3">
                            <QcStatusBadge status={receive.qc_status} dot />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'transactions' && <TransactionHistory />}

      {/* 입고 등록 모달 */}
      <Modal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        title="원자재 입고 등록"
        size="xl"
      >
        <MaterialReceiveForm
          onSuccess={() => setReceiveModalOpen(false)}
          onCancel={() => setReceiveModalOpen(false)}
        />
      </Modal>

      {/* 출고 모달 */}
      <Modal
        isOpen={issueModal.open}
        onClose={() => setIssueModal({ open: false })}
        title="원자재 출고"
        size="lg"
      >
        <MaterialIssueForm
          defaultMaterialId={issueModal.materialId}
          defaultMaterialName={issueModal.materialName}
          onSuccess={() => setIssueModal({ open: false })}
          onCancel={() => setIssueModal({ open: false })}
        />
      </Modal>
    </div>
  )
}
