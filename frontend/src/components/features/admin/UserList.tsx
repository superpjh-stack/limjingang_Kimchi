'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import UserForm from './UserForm'
import type { AdminUser, Role } from '@/types/equipment_ext'
import {
  PlusIcon,
  KeyIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

export default function UserList() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await adminApi.getUsers()
      return (res.data as AdminUser[]) ?? []
    },
  })

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await adminApi.getRoles()
      return (res.data as Role[]) ?? []
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => adminApi.resetPassword(id),
    onSuccess: () => alert('비밀번호가 초기화되었습니다.'),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminApi.toggleUserStatus(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      adminApi.assignRole(userId, { role_id: roleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setRoleModalUser(null)
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-500">
        불러오는 중...
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* 툴바 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <p className="text-sm text-gray-500">총 {users?.length ?? 0}명</p>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => { setEditingUser(null); setShowForm(true) }}
          >
            신규 사용자
          </Button>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">이름</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">이메일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">사용자명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">역할</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">마지막로그인</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(users ?? []).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{user.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-xs text-gray-400">미할당</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({ id: user.id, is_active: !user.is_active })
                      }
                      className="cursor-pointer"
                    >
                      <Badge variant={user.is_active ? 'success' : 'gray'} dot>
                        {user.is_active ? '활성' : '비활성'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.last_login ? formatDate(user.last_login) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingUser(user); setShowForm(true) }}
                      >
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<KeyIcon className="h-3.5 w-3.5" />}
                        onClick={() => resetPasswordMutation.mutate(user.id)}
                        loading={resetPasswordMutation.isPending}
                      >
                        PW초기화
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<ArrowPathIcon className="h-3.5 w-3.5" />}
                        onClick={() => { setSelectedRoleId(''); setRoleModalUser(user) }}
                      >
                        역할
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 사용자 등록/수정 모달 */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title={editingUser ? '사용자 수정' : '신규 사용자 등록'}
          size="lg"
        >
          <UserForm
            user={editingUser ?? undefined}
            roles={roles ?? []}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-users'] })
              setShowForm(false)
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {/* 역할 부여 모달 */}
      {roleModalUser && (
        <Modal
          isOpen={!!roleModalUser}
          onClose={() => setRoleModalUser(null)}
          title={`역할 부여 — ${roleModalUser.name}`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRoleModalUser(null)}>
                취소
              </Button>
              <Button
                disabled={selectedRoleId === ''}
                loading={assignRoleMutation.isPending}
                onClick={() => {
                  if (selectedRoleId !== '')
                    assignRoleMutation.mutate({ userId: roleModalUser.id, roleId: selectedRoleId })
                }}
              >
                역할 부여
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-500">현재 역할: {roleModalUser.roles.join(', ') || '없음'}</p>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">역할 선택...</option>
              {(roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.description ? `— ${r.description}` : ''}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}
    </>
  )
}
