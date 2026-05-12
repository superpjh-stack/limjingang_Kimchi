'use client'

import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { AdminUser, Role } from '@/types/equipment_ext'

interface UserFormProps {
  user?: AdminUser
  roles: Role[]
  onSuccess: () => void
  onCancel: () => void
}

export default function UserForm({ user, roles, onSuccess, onCancel }: UserFormProps) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    username: user?.username ?? '',
    password: '',
    role_ids: user?.roles ?? [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEdit ? adminApi.updateUser(user!.id, data) : adminApi.createUser(data),
    onSuccess,
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const msg = axiosErr?.response?.data?.message ?? '저장에 실패했습니다.'
      setErrors({ _global: msg })
    },
  })

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = '이름을 입력하세요.'
    if (!form.email.trim()) newErrors.email = '이메일을 입력하세요.'
    if (!form.username.trim()) newErrors.username = '사용자명을 입력하세요.'
    if (!isEdit && !form.password) newErrors.password = '임시 비밀번호를 입력하세요.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      username: form.username,
      role_ids: form.role_ids,
    }
    if (!isEdit && form.password) payload.password = form.password
    mutation.mutate(payload)
  }

  const toggleRole = (roleName: string) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleName)
        ? prev.role_ids.filter((r) => r !== roleName)
        : [...prev.role_ids, roleName],
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._global && (
        <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {errors._global}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          이름 <span className="text-danger">*</span>
        </label>
        <Input
          placeholder="홍길동"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          className={errors.name ? 'border-danger' : ''}
        />
        {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          이메일 <span className="text-danger">*</span>
        </label>
        <Input
          type="email"
          placeholder="user@imjingang.com"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className={errors.email ? 'border-danger' : ''}
        />
        {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          사용자명 <span className="text-danger">*</span>
        </label>
        <Input
          placeholder="hong_gd"
          value={form.username}
          onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          className={errors.username ? 'border-danger' : ''}
          disabled={isEdit}
        />
        {errors.username && <p className="mt-1 text-xs text-danger">{errors.username}</p>}
        {isEdit && (
          <p className="mt-1 text-xs text-gray-400">사용자명은 수정할 수 없습니다.</p>
        )}
      </div>

      {!isEdit && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            임시 비밀번호 <span className="text-danger">*</span>
          </label>
          <Input
            type="password"
            placeholder="8자 이상"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className={errors.password ? 'border-danger' : ''}
          />
          {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">역할 (다중 선택)</label>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={form.role_ids.includes(role.name)}
                onChange={() => toggleRole(role.name)}
                className="accent-primary"
              />
              <span>{role.name}</span>
              {role.description && (
                <span className="text-xs text-gray-400">— {role.description}</span>
              )}
            </label>
          ))}
          {roles.length === 0 && (
            <p className="text-sm text-gray-400">사용 가능한 역할이 없습니다.</p>
          )}
        </div>
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
