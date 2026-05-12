'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentExtApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EquipmentDashboard from '@/components/features/equipment/EquipmentDashboard'
import InspectionList from '@/components/features/equipment/InspectionList'
import FailureList from '@/components/features/equipment/FailureList'
import Badge from '@/components/ui/Badge'
import type { EquipmentFailure } from '@/types/equipment_ext'
import {
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

type TabKey = 'dashboard' | 'inspection' | 'failure'

// Mock 설비 ID 목록 (실제로는 별도 equipment API에서 가져옴)
const EQUIPMENT_OPTIONS = [
  { id: 1, name: '세척기 #1', code: 'EQ-001' },
  { id: 2, name: '절임조 #1', code: 'EQ-002' },
  { id: 3, name: '양념 혼합기', code: 'EQ-003' },
  { id: 4, name: '포장기 #1', code: 'EQ-004' },
  { id: 5, name: '포장기 #2', code: 'EQ-005' },
  { id: 6, name: '냉장창고 컨베이어', code: 'EQ-006' },
]

// 점검 등록 모달
interface InspectionCreateModalProps {
  isOpen: boolean
  onClose: () => void
}

function InspectionCreateModal({ isOpen, onClose }: InspectionCreateModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    equipment_id: '',
    inspection_type: 'DAILY' as const,
    scheduled_date: new Date().toISOString().split('T')[0],
    inspector: '',
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      equipmentExtApi.createInspection(Number(form.equipment_id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      queryClient.invalidateQueries({ queryKey: ['upcoming-inspections'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.equipment_id) return
    mutation.mutate({
      inspection_type: form.inspection_type,
      scheduled_date: form.scheduled_date,
      inspector: form.inspector,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="점검 등록"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending} disabled={!form.equipment_id}>
            등록
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            설비 <span className="text-danger">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.equipment_id}
            onChange={(e) => setForm((prev) => ({ ...prev, equipment_id: e.target.value }))}
          >
            <option value="">설비 선택...</option>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <option key={eq.id} value={eq.id}>
                [{eq.code}] {eq.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">점검 유형</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={form.inspection_type}
            onChange={(e) => setForm((prev) => ({ ...prev, inspection_type: e.target.value as typeof form.inspection_type }))}
          >
            {[
              ['DAILY', '일상점검'],
              ['WEEKLY', '주간점검'],
              ['MONTHLY', '월간점검'],
              ['SPECIAL', '특별점검'],
              ['EMERGENCY', '긴급점검'],
            ].map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">예정일</label>
          <Input
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm((prev) => ({ ...prev, scheduled_date: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">담당 점검자</label>
          <Input
            placeholder="점검자 이름"
            value={form.inspector}
            onChange={(e) => setForm((prev) => ({ ...prev, inspector: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  )
}

export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number>(EQUIPMENT_OPTIONS[0].id)
  const [showCreateInspection, setShowCreateInspection] = useState(false)

  const { data: overdueData } = useQuery({
    queryKey: ['overdue-inspections'],
    queryFn: async () => {
      const res = await equipmentExtApi.getOverdueInspections()
      return (res.data ?? []) as { id: number }[]
    },
  })

  const { data: openFailures } = useQuery({
    queryKey: ['open-failures'],
    queryFn: async () => {
      const res = await equipmentExtApi.getOpenFailures()
      return (res.data ?? []) as EquipmentFailure[]
    },
  })

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'dashboard', label: '설비 현황' },
    { key: 'inspection', label: '점검 관리', badge: overdueData?.length },
    { key: 'failure', label: '고장 관리', badge: openFailures?.length },
  ]

  return (
    <div>
      <PageHeader
        title="설비관리"
        subtitle="설비 현황, 점검 이력, 고장 이력을 관리합니다."
        breadcrumbs={[{ label: 'MES' }, { label: '설비관리' }]}
        actions={
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setShowCreateInspection(true)}
          >
            점검 등록
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
              className={cn(
                'flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-xs font-semibold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'dashboard' && <EquipmentDashboard />}

      {activeTab === 'inspection' && (
        <div className="space-y-6">
          {/* 지연 점검 경고 배너 */}
          {overdueData && overdueData.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-5 py-4">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-danger" />
              <p className="text-sm font-medium text-danger-700">
                지연된 점검이 <strong>{overdueData.length}건</strong> 있습니다. 즉시 조치가 필요합니다.
              </p>
            </div>
          )}

          {/* 설비 선택 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">설비 선택</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(Number(e.target.value))}
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.code}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          {/* 점검 이력 테이블 */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {EQUIPMENT_OPTIONS.find((e) => e.id === selectedEquipmentId)?.name} 점검 이력
              </h3>
            </div>
            <InspectionList equipmentId={selectedEquipmentId} />
          </div>
        </div>
      )}

      {activeTab === 'failure' && (
        <div className="space-y-6">
          {/* 미해결 고장 요약 */}
          {openFailures && openFailures.length > 0 && (
            <div className="rounded-xl border border-danger-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-danger-700">
                <ExclamationTriangleIcon className="h-4 w-4" />
                미해결 고장 {openFailures.length}건
              </h3>
              <div className="flex flex-wrap gap-2">
                {openFailures.map((f) => (
                  <div key={f.id} className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs">
                    <p className="font-medium text-gray-900">{f.equipment_name}</p>
                    <p className="text-danger-600">{f.symptoms}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 설비 선택 + 고장 이력 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">설비 선택</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(Number(e.target.value))}
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  [{eq.code}] {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {EQUIPMENT_OPTIONS.find((e) => e.id === selectedEquipmentId)?.name} 고장 이력
              </h3>
            </div>
            <FailureList equipmentId={selectedEquipmentId} />
          </div>
        </div>
      )}

      {/* 점검 등록 모달 */}
      <InspectionCreateModal
        isOpen={showCreateInspection}
        onClose={() => setShowCreateInspection(false)}
      />
    </div>
  )
}
