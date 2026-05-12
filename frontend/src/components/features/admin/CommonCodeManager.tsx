'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/Modal'
import type { CommonCode, CommonCodeGroup } from '@/types/equipment_ext'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

// 공통코드 등록/수정 폼
interface CodeFormProps {
  code?: CommonCode
  groupCode: string
  onSuccess: () => void
  onCancel: () => void
}

function CodeForm({ code, groupCode, onSuccess, onCancel }: CodeFormProps) {
  const isEdit = !!code
  const [form, setForm] = useState({
    group_code: code?.group_code ?? groupCode,
    group_name: code?.group_name ?? '',
    code: code?.code ?? '',
    name: code?.name ?? '',
    sort_order: code?.sort_order ?? 0,
    description: code?.description ?? '',
    is_active: code?.is_active ?? true,
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit ? adminApi.updateCommonCode(code!.id, data) : adminApi.createCommonCode(data),
    onSuccess,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ ...form, sort_order: Number(form.sort_order) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            그룹 코드 <span className="text-danger">*</span>
          </label>
          <Input
            value={form.group_code}
            onChange={(e) => setForm((prev) => ({ ...prev, group_code: e.target.value }))}
            placeholder="PRODUCT_TYPE"
            disabled={isEdit}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">그룹명</label>
          <Input
            value={form.group_name}
            onChange={(e) => setForm((prev) => ({ ...prev, group_name: e.target.value }))}
            placeholder="제품유형"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            코드 <span className="text-danger">*</span>
          </label>
          <Input
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            placeholder="KIMCHI_BAECHU"
            disabled={isEdit}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            코드명 <span className="text-danger">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="배추김치"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">정렬순서</label>
          <Input
            type="number"
            min="0"
            value={form.sort_order}
            onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
          />
        </div>
        <div className="flex items-end pb-0.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="accent-primary"
            />
            사용 여부
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">설명</label>
        <Input
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="코드에 대한 설명"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? '저장' : '등록'}
        </Button>
      </div>
    </form>
  )
}

export default function CommonCodeManager() {
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingCode, setEditingCode] = useState<CommonCode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CommonCode | null>(null)
  // 인라인 편집: 행 클릭으로 편집 모드
  const [inlineEditId, setInlineEditId] = useState<number | null>(null)

  const { data: groups } = useQuery({
    queryKey: ['code-groups'],
    queryFn: async () => {
      const res = await adminApi.getCodeGroups()
      return (res.data as CommonCodeGroup[]) ?? []
    },
  })

  const { data: codes, isLoading } = useQuery({
    queryKey: ['common-codes', selectedGroup],
    queryFn: async () => {
      const res = await adminApi.getCommonCodes(
        selectedGroup ? { group_code: selectedGroup } : undefined
      )
      return (res.data as CommonCode[]) ?? []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCommonCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['common-codes'] })
      queryClient.invalidateQueries({ queryKey: ['code-groups'] })
      setDeleteTarget(null)
    },
  })

  const handleCodeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['common-codes'] })
    queryClient.invalidateQueries({ queryKey: ['code-groups'] })
    setShowForm(false)
    setEditingCode(null)
  }

  return (
    <div className="flex gap-6">
      {/* 좌측: 코드 그룹 목록 */}
      <div className="w-60 flex-shrink-0">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">코드 그룹</h3>
          </div>
          <nav className="py-2">
            <button
              onClick={() => setSelectedGroup('')}
              className={cn(
                'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                selectedGroup === ''
                  ? 'bg-primary-50 font-semibold text-primary'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              전체
            </button>
            {(groups ?? []).map((group) => (
              <button
                key={group.group_code}
                onClick={() => setSelectedGroup(group.group_code)}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                  selectedGroup === group.group_code
                    ? 'bg-primary-50 font-semibold text-primary'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <span className="truncate">{group.group_name || group.group_code}</span>
                <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {group.count}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 우측: 코드 목록 */}
      <div className="flex-1">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* 툴바 */}
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <p className="text-sm text-gray-500">
              {selectedGroup ? `[${selectedGroup}]` : '전체'} — {codes?.length ?? 0}건
            </p>
            <Button
              icon={<PlusIcon className="h-4 w-4" />}
              onClick={() => { setEditingCode(null); setShowForm(true) }}
            >
              코드 등록
            </Button>
          </div>

          {/* 테이블 */}
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-gray-500">
              불러오는 중...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">그룹코드</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">코드</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">코드명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">순서</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">설명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(codes ?? []).map((code) => (
                    <tr
                      key={code.id}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50',
                        inlineEditId === code.id && 'bg-primary-50'
                      )}
                      onClick={() => setInlineEditId(inlineEditId === code.id ? null : code.id)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{code.group_code}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{code.code}</td>
                      <td className="px-4 py-3 text-gray-900">{code.name}</td>
                      <td className="px-4 py-3 text-gray-500">{code.sort_order}</td>
                      <td className="px-4 py-3">
                        <Badge variant={code.is_active ? 'success' : 'gray'} dot>
                          {code.is_active ? '사용' : '미사용'}
                        </Badge>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-gray-500">
                        <p className="truncate">{code.description ?? '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary"
                            onClick={() => { setEditingCode(code); setShowForm(true) }}
                            title="수정"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-gray-400 hover:bg-danger-50 hover:text-danger"
                            onClick={() => setDeleteTarget(code)}
                            title="삭제"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(codes ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                        등록된 코드가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 코드 등록/수정 모달 */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingCode(null) }}
          title={editingCode ? '공통코드 수정' : '공통코드 등록'}
          size="lg"
        >
          <CodeForm
            code={editingCode ?? undefined}
            groupCode={selectedGroup}
            onSuccess={handleCodeSuccess}
            onCancel={() => { setShowForm(false); setEditingCode(null) }}
          />
        </Modal>
      )}

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="공통코드 삭제"
        message={`[${deleteTarget?.code}] ${deleteTarget?.name} 코드를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmText="삭제"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
