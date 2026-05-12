'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { Warehouse, RawMaterial } from '@/types/inventory'

interface MaterialIssueFormProps {
  defaultMaterialId?: number
  defaultMaterialName?: string
  onSuccess: () => void
  onCancel: () => void
}

type FormValues = {
  raw_material_id: number
  warehouse_id: number
  issue_qty: number
  work_order_id: string
  reason: string
}

const ISSUE_REASONS = [
  { label: '생산투입', value: '생산투입' },
  { label: '시험검사', value: '시험검사' },
  { label: '폐기', value: '폐기' },
  { label: '반품', value: '반품' },
  { label: '조정', value: '조정' },
  { label: '기타', value: '기타' },
]

export default function MaterialIssueForm({
  defaultMaterialId,
  defaultMaterialName,
  onSuccess,
  onCancel,
}: MaterialIssueFormProps) {
  const queryClient = useQueryClient()

  const { data: warehousesData } = useQuery({
    queryKey: ['inventory', 'warehouses'],
    queryFn: () => inventoryApi.getWarehouses(),
  })

  const { data: materialsData } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: () => inventoryApi.getRawMaterials(),
  })

  const warehouses: Warehouse[] =
    (warehousesData as { data?: { data?: Warehouse[] } })?.data?.data ?? []
  const materials: RawMaterial[] =
    (materialsData as { data?: { data?: RawMaterial[] } })?.data?.data ?? []

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      raw_material_id: defaultMaterialId,
      issue_qty: 0,
      reason: '생산투입',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => inventoryApi.issueMaterial(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onSuccess()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      raw_material_id: Number(values.raw_material_id),
      warehouse_id: Number(values.warehouse_id),
      issue_qty: Number(values.issue_qty),
      work_order_id: values.work_order_id ? Number(values.work_order_id) : undefined,
      reason: values.reason,
    })
  }

  const selectClass =
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            자재 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="raw_material_id"
            rules={{ required: '자재를 선택하세요' }}
            render={({ field }) => (
              <select
                className={selectClass}
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="">자재 선택</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.code}] {m.name} ({m.unit})
                  </option>
                ))}
              </select>
            )}
          />
          {errors.raw_material_id && (
            <p className="mt-1 text-xs text-danger">{errors.raw_material_id.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            창고 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="warehouse_id"
            rules={{ required: '창고를 선택하세요' }}
            render={({ field }) => (
              <select
                className={selectClass}
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="">창고 선택</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.warehouse_id && (
            <p className="mt-1 text-xs text-danger">{errors.warehouse_id.message}</p>
          )}
        </div>

        <div>
          <Input
            label="출고 수량"
            type="number"
            step="0.001"
            min="0"
            required
            placeholder="0"
            {...register('issue_qty', {
              required: '수량을 입력하세요',
              min: { value: 0.001, message: '0보다 큰 수량을 입력하세요' },
              valueAsNumber: true,
            })}
            error={errors.issue_qty?.message}
          />
        </div>

        <div>
          <Input
            label="작업지시번호 (선택)"
            type="number"
            placeholder="작업지시 ID 입력"
            {...register('work_order_id')}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            출고 사유 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="reason"
            rules={{ required: '출고 사유를 선택하세요' }}
            render={({ field }) => (
              <select className={selectClass} {...field}>
                {ISSUE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="danger" loading={mutation.isPending}>
          출고 처리
        </Button>
      </div>
    </form>
  )
}
