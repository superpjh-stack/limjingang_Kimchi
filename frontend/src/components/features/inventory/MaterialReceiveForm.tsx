'use client'

import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/api'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { MaterialReceiveCreate, Warehouse, RawMaterial } from '@/types/inventory'

interface MaterialReceiveFormProps {
  onSuccess: () => void
  onCancel: () => void
}

type FormValues = {
  raw_material_id: number
  warehouse_id: number
  receive_date: string
  receive_qty: number
  unit_price: number
  lot_no: string
  supplier: string
  expiry_date: string
  notes: string
}

export default function MaterialReceiveForm({ onSuccess, onCancel }: MaterialReceiveFormProps) {
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
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      receive_date: new Date().toISOString().split('T')[0],
      receive_qty: 0,
      unit_price: 0,
    },
  })

  const watchQty = watch('receive_qty')
  const watchPrice = watch('unit_price')
  const amount = (watchQty || 0) * (watchPrice || 0)

  const mutation = useMutation({
    mutationFn: (data: MaterialReceiveCreate) =>
      inventoryApi.receiveMaterial(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onSuccess()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const onSubmit = (values: FormValues) => {
    const payload: MaterialReceiveCreate = {
      raw_material_id: Number(values.raw_material_id),
      warehouse_id: Number(values.warehouse_id),
      receive_date: values.receive_date,
      receive_qty: Number(values.receive_qty),
      unit_price: values.unit_price ? Number(values.unit_price) : undefined,
      lot_no: values.lot_no || undefined,
      supplier: values.supplier || undefined,
      expiry_date: values.expiry_date || undefined,
      notes: values.notes || undefined,
    }
    mutation.mutate(payload)
  }

  const selectClass =
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-gray-50'

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
            label="입고일"
            type="date"
            required
            {...register('receive_date', { required: '입고일을 선택하세요' })}
            error={errors.receive_date?.message}
          />
        </div>

        <div>
          <Input
            label="수량 (kg)"
            type="number"
            step="0.001"
            min="0"
            required
            placeholder="0"
            {...register('receive_qty', {
              required: '수량을 입력하세요',
              min: { value: 0.001, message: '0보다 큰 수량을 입력하세요' },
              valueAsNumber: true,
            })}
            error={errors.receive_qty?.message}
          />
        </div>

        <div>
          <Input
            label="단가 (원)"
            type="number"
            min="0"
            placeholder="0"
            {...register('unit_price', { valueAsNumber: true })}
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
            <span className="text-sm text-gray-600">금액 (자동계산)</span>
            <span className="text-base font-bold text-primary">{formatCurrency(amount)}</span>
          </div>
        </div>

        <div>
          <Input
            label="LOT번호"
            placeholder="LOT번호 입력"
            {...register('lot_no')}
          />
        </div>

        <div>
          <Input
            label="공급업체"
            placeholder="공급업체명 입력"
            {...register('supplier')}
          />
        </div>

        <div>
          <Input
            label="유통기한"
            type="date"
            {...register('expiry_date')}
          />
        </div>

        <div>
          <Input
            label="비고"
            placeholder="비고사항 입력"
            {...register('notes')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          입고 등록
        </Button>
      </div>
    </form>
  )
}
