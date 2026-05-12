'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentExtApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import InspectionStatusBadge from './InspectionStatusBadge'
import type { EquipmentInspection, InspectionResult } from '@/types/equipment_ext'

const inspectionTypeLabels: Record<string, string> = {
  DAILY: '일상점검',
  WEEKLY: '주간점검',
  MONTHLY: '월간점검',
  SPECIAL: '특별점검',
  EMERGENCY: '긴급점검',
}

const resultLabels: Record<string, string> = {
  PASS: '합격',
  FAIL: '불합격',
  CONDITIONAL: '조건부합격',
}

interface InspectionResultModalProps {
  inspection: EquipmentInspection
  isOpen: boolean
  onClose: () => void
}

function InspectionResultModal({ inspection, isOpen, onClose }: InspectionResultModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    result: '' as InspectionResult | '',
    actual_date: new Date().toISOString().split('T')[0],
    inspector: '',
    findings: '',
    actions_taken: '',
    next_scheduled_date: '',
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      equipmentExtApi.updateInspection(inspection.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspections'] })
      queryClient.invalidateQueries({ queryKey: ['overdue-inspections'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.result) return
    mutation.mutate({ ...form, status: 'COMPLETED' })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="점검 결과 입력"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            loading={mutation.isPending}
            disabled={!form.result}
          >
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p className="font-medium text-gray-900">{inspection.equipment_name}</p>
          <p className="text-gray-500">
            {inspectionTypeLabels[inspection.inspection_type]} · 예정일:{' '}
            {formatDate(inspection.scheduled_date)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            점검 결과 <span className="text-danger">*</span>
          </label>
          <div className="flex gap-3">
            {(['PASS', 'FAIL', 'CONDITIONAL'] as InspectionResult[]).map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="result"
                  value={r}
                  checked={form.result === r}
                  onChange={(e) => setForm((prev) => ({ ...prev, result: e.target.value as InspectionResult }))}
                  className="accent-primary"
                />
                {resultLabels[r]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">실제 점검일</label>
            <Input
              type="date"
              value={form.actual_date}
              onChange={(e) => setForm((prev) => ({ ...prev, actual_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">점검자</label>
            <Input
              placeholder="점검자 이름"
              value={form.inspector}
              onChange={(e) => setForm((prev) => ({ ...prev, inspector: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">발견사항</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder="점검 중 발견된 사항을 입력하세요"
            value={form.findings}
            onChange={(e) => setForm((prev) => ({ ...prev, findings: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">조치내용</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            placeholder="취한 조치 내용을 입력하세요"
            value={form.actions_taken}
            onChange={(e) => setForm((prev) => ({ ...prev, actions_taken: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">다음 점검 예정일</label>
          <Input
            type="date"
            value={form.next_scheduled_date}
            onChange={(e) => setForm((prev) => ({ ...prev, next_scheduled_date: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  )
}

interface InspectionListProps {
  equipmentId: number
}

export default function InspectionList({ equipmentId }: InspectionListProps) {
  const [selectedInspection, setSelectedInspection] = useState<EquipmentInspection | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['inspections', equipmentId],
    queryFn: async () => {
      const res = await equipmentExtApi.getInspections(equipmentId)
      return res.data as EquipmentInspection[]
    },
    enabled: !!equipmentId,
  })

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        불러오는 중...
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-gray-500">
        점검 이력이 없습니다.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">점검유형</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">예정일</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">실제점검일</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">점검자</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">상태</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">결과</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((inspection) => (
              <tr key={inspection.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {inspectionTypeLabels[inspection.inspection_type] ?? inspection.inspection_type}
                </td>
                <td className="px-4 py-3 text-gray-600">{formatDate(inspection.scheduled_date)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {inspection.actual_date ? formatDate(inspection.actual_date) : '-'}
                </td>
                <td className="px-4 py-3 text-gray-600">{inspection.inspector ?? '-'}</td>
                <td className="px-4 py-3">
                  <InspectionStatusBadge status={inspection.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {inspection.result ? resultLabels[inspection.result] : '-'}
                </td>
                <td className="px-4 py-3">
                  {inspection.status === 'SCHEDULED' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedInspection(inspection)}
                    >
                      결과 입력
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInspection && (
        <InspectionResultModal
          inspection={selectedInspection}
          isOpen={!!selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
    </>
  )
}
