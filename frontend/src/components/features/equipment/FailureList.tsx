'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentExtApi } from '@/lib/api'
import { formatDate, formatDateTime } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import FailureImpactBadge from './FailureImpactBadge'
import type { EquipmentFailure } from '@/types/equipment_ext'

const failureStatusConfig: Record<string, { label: string; variant: 'danger' | 'warning' | 'success' | 'gray' }> = {
  OPEN: { label: '미해결', variant: 'danger' },
  IN_REPAIR: { label: '수리중', variant: 'warning' },
  RESOLVED: { label: '복구완료', variant: 'success' },
  DEFERRED: { label: '이연', variant: 'gray' },
}

interface ResolveModalProps {
  failure: EquipmentFailure
  isOpen: boolean
  onClose: () => void
}

function ResolveModal({ failure, isOpen, onClose }: ResolveModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    resolved_date: new Date().toISOString().slice(0, 16),
    repair_notes: '',
    downtime_hours: '',
    repaired_by: '',
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      equipmentExtApi.resolveFailure(failure.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failures'] })
      queryClient.invalidateQueries({ queryKey: ['open-failures'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      downtime_hours: form.downtime_hours ? parseFloat(form.downtime_hours) : undefined,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="고장 복구 완료 처리"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            복구 완료 처리
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p className="font-medium text-gray-900">[{failure.failure_no}] {failure.equipment_name}</p>
          <p className="mt-0.5 text-gray-500">{failure.symptoms}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              복구 완료 일시 <span className="text-danger">*</span>
            </label>
            <Input
              type="datetime-local"
              value={form.resolved_date}
              onChange={(e) => setForm((prev) => ({ ...prev, resolved_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">가동 중지 시간(h)</label>
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="예: 2.5"
              value={form.downtime_hours}
              onChange={(e) => setForm((prev) => ({ ...prev, downtime_hours: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">수리 담당자</label>
          <Input
            placeholder="수리 담당자 이름"
            value={form.repaired_by}
            onChange={(e) => setForm((prev) => ({ ...prev, repaired_by: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            수리 내용 <span className="text-danger">*</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={4}
            placeholder="수행한 수리 내용을 상세히 입력하세요"
            value={form.repair_notes}
            onChange={(e) => setForm((prev) => ({ ...prev, repair_notes: e.target.value }))}
          />
        </div>
      </div>
    </Modal>
  )
}

interface FailureListProps {
  equipmentId: number
}

export default function FailureList({ equipmentId }: FailureListProps) {
  const [selectedFailure, setSelectedFailure] = useState<EquipmentFailure | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['failures', equipmentId],
    queryFn: async () => {
      const res = await equipmentExtApi.getFailures(equipmentId)
      return res.data as EquipmentFailure[]
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
        고장 이력이 없습니다.
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">고장번호</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">발생일시</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">유형</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">증상</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">영향도</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">상태</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">복구완료일</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((failure) => {
              const statusConfig = failureStatusConfig[failure.status]
              const canResolve = failure.status === 'OPEN' || failure.status === 'IN_REPAIR'
              return (
                <tr key={failure.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                    {failure.failure_no}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(failure.failure_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{failure.failure_type ?? '-'}</td>
                  <td className="max-w-xs px-4 py-3 text-gray-700">
                    <p className="truncate">{failure.symptoms}</p>
                  </td>
                  <td className="px-4 py-3">
                    <FailureImpactBadge level={failure.impact_level} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusConfig.variant} dot>
                      {statusConfig.label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {failure.resolved_date ? formatDate(failure.resolved_date) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {canResolve && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedFailure(failure)}
                      >
                        복구 완료
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedFailure && (
        <ResolveModal
          failure={selectedFailure}
          isOpen={!!selectedFailure}
          onClose={() => setSelectedFailure(null)}
        />
      )}
    </>
  )
}
