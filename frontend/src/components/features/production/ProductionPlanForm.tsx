'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productionPlanApi, productApi, orderApi, bomApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import type { ProductionPlanCreateRequest } from '@/types/production'

const planFormSchema = z.object({
  plan_date: z.string().min(1, '계획일을 선택하세요'),
  order_id: z.number().optional(),
  product_id: z.number({ required_error: '제품을 선택하세요' }).min(1, '제품을 선택하세요'),
  bom_id: z.number().optional(),
  planned_qty: z.number({ required_error: '계획수량을 입력하세요' }).min(1, '1 이상 입력하세요'),
  plan_type: z.enum(['DAILY', 'WEEKLY']),
  start_datetime: z.string().optional(),
  end_datetime: z.string().optional(),
  remark: z.string().optional(),
})

type PlanFormValues = z.infer<typeof planFormSchema>

const PLAN_TYPE_OPTIONS = [
  { label: '일별', value: 'DAILY' },
  { label: '주별', value: 'WEEKLY' },
]

interface ProductionPlanFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function ProductionPlanForm({ onSuccess, onCancel }: ProductionPlanFormProps) {
  const queryClient = useQueryClient()

  const { data: ordersData } = useQuery({
    queryKey: ['orders', { status: 'CONFIRMED', limit: 200 }],
    queryFn: () => orderApi.getList({ status: 'CONFIRMED', limit: 200 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 500 }],
    queryFn: () => productApi.getList({ limit: 500 }),
  })

  const { data: bomsData } = useQuery({
    queryKey: ['bom', { limit: 500 }],
    queryFn: () => bomApi.getList({ limit: 500 }),
  })

  const orders = (ordersData as { data?: { data?: { id: number; order_no: string; customer_name: string }[] } })?.data?.data ?? []
  const products = (productsData as { data?: { data?: { id: number; product_name: string }[] } })?.data?.data ?? []
  const boms = (bomsData as { data?: { data?: { id: number; bom_name?: string; product_id: number }[] } })?.data?.data ?? []

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      plan_type: 'DAILY',
      planned_qty: 0,
    },
  })

  const watchedProductId = watch('product_id')

  const orderOptions = [
    { label: '연계 수주 없음', value: '' },
    ...orders.map((o: { id: number; order_no: string; customer_name: string }) => ({
      label: `${o.order_no} (${o.customer_name})`,
      value: String(o.id),
    })),
  ]

  const productOptions = [
    { label: '제품 선택', value: '' },
    ...products.map((p: { id: number; product_name: string }) => ({
      label: p.product_name,
      value: String(p.id),
    })),
  ]

  // 선택된 제품에 해당하는 BOM 필터
  const filteredBoms = watchedProductId
    ? boms.filter((b: { product_id: number }) => b.product_id === watchedProductId)
    : boms

  const bomOptions = [
    { label: 'BOM 선택 (선택사항)', value: '' },
    ...filteredBoms.map((b: { id: number; bom_name?: string }) => ({
      label: b.bom_name ?? `BOM #${b.id}`,
      value: String(b.id),
    })),
  ]

  const createMutation = useMutation({
    mutationFn: (data: ProductionPlanCreateRequest) => productionPlanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-plans'] })
      onSuccess()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const onSubmit = (values: PlanFormValues) => {
    const payload: ProductionPlanCreateRequest = {
      plan_date: values.plan_date,
      order_id: values.order_id,
      product_id: values.product_id,
      bom_id: values.bom_id,
      planned_qty: values.planned_qty,
      plan_type: values.plan_type,
      start_datetime: values.start_datetime || undefined,
      end_datetime: values.end_datetime || undefined,
      remark: values.remark,
    }
    createMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="계획일"
            type="date"
            required
            {...register('plan_date')}
            error={errors.plan_date?.message}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">계획유형</label>
          <Controller
            control={control}
            name="plan_type"
            render={({ field }) => (
              <Select
                options={PLAN_TYPE_OPTIONS}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </div>

        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">연계 수주 (선택)</label>
          <Controller
            control={control}
            name="order_id"
            render={({ field }) => (
              <select
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
              >
                {orderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            제품 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="product_id"
            render={({ field }) => (
              <select
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
              >
                {productOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.product_id && (
            <p className="mt-1 text-xs text-danger">{errors.product_id.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">BOM (선택)</label>
          <Controller
            control={control}
            name="bom_id"
            render={({ field }) => (
              <select
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-gray-50 disabled:text-gray-400"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                disabled={!watchedProductId}
              >
                {bomOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        <div>
          <Input
            label="계획수량"
            type="number"
            min={1}
            required
            {...register('planned_qty', { valueAsNumber: true })}
            error={errors.planned_qty?.message}
          />
        </div>

        <div>
          {/* placeholder column */}
        </div>

        <div>
          <Input
            label="시작일시"
            type="datetime-local"
            {...register('start_datetime')}
          />
        </div>
        <div>
          <Input
            label="종료일시"
            type="datetime-local"
            {...register('end_datetime')}
          />
        </div>

        <div className="col-span-2">
          <Input
            label="비고"
            placeholder="비고사항을 입력하세요"
            {...register('remark')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" loading={createMutation.isPending}>
          등록
        </Button>
      </div>
    </form>
  )
}
