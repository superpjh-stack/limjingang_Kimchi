'use client'

import React, { useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orderApi, productApi, customerApi } from '@/lib/api'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input, { Select } from '@/components/ui/Input'
import type { OrderCreateRequest } from '@/types/order'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

const detailSchema = z.object({
  product_id: z.number({ required_error: '제품을 선택하세요' }).min(1, '제품을 선택하세요'),
  order_qty: z.number({ required_error: '수량을 입력하세요' }).min(1, '1 이상 입력하세요'),
  unit_price: z.number().min(0).optional(),
  delivery_date: z.string().optional(),
  notes: z.string().optional(),
})

const orderFormSchema = z.object({
  customer_id: z.number({ required_error: '거래처를 선택하세요' }).min(1, '거래처를 선택하세요'),
  order_date: z.string().min(1, '수주일을 선택하세요'),
  delivery_date: z.string().min(1, '납기일을 선택하세요'),
  order_type: z.enum(['HOMESHOPPING', 'GENERAL']),
  delivery_address: z.string().optional(),
  remark: z.string().optional(),
  details: z.array(detailSchema).min(1, '상세 라인을 1개 이상 추가하세요'),
})

type OrderFormValues = z.infer<typeof orderFormSchema>

interface OrderFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const ORDER_TYPE_OPTIONS = [
  { label: '일반', value: 'GENERAL' },
  { label: '홈쇼핑', value: 'HOMESHOPPING' },
]

export default function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const queryClient = useQueryClient()

  const { data: customersData } = useQuery({
    queryKey: ['customers', { limit: 200 }],
    queryFn: () => customerApi.getList({ limit: 200 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 500 }],
    queryFn: () => productApi.getList({ limit: 500 }),
  })

  const customers = (customersData as { data?: { data?: { id: number; name: string }[] } })?.data?.data ?? []
  const products = (productsData as { data?: { data?: { id: number; product_name: string; unit_price?: number }[] } })?.data?.data ?? []

  const customerOptions = customers.map((c: { id: number; name: string }) => ({
    label: c.name,
    value: String(c.id),
  }))

  const productOptions = products.map((p: { id: number; product_name: string }) => ({
    label: p.product_name,
    value: String(p.id),
  }))

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      order_type: 'GENERAL',
      details: [{ product_id: 0, order_qty: 0, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'details' })

  const watchedDetails = watch('details')

  const totalAmount = watchedDetails.reduce((sum, d) => {
    return sum + (d.order_qty ?? 0) * (d.unit_price ?? 0)
  }, 0)

  const totalQty = watchedDetails.reduce((sum, d) => sum + (d.order_qty ?? 0), 0)

  // 제품 선택 시 단가 자동 입력
  const handleProductChange = (index: number, productId: number) => {
    const product = products.find((p: { id: number; unit_price?: number }) => p.id === productId)
    if (product?.unit_price) {
      setValue(`details.${index}.unit_price`, product.unit_price)
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: OrderCreateRequest) => orderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onSuccess()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const onSubmit = (values: OrderFormValues) => {
    const payload: OrderCreateRequest = {
      customer_id: values.customer_id,
      order_date: values.order_date,
      delivery_date: values.delivery_date,
      order_type: values.order_type,
      delivery_address: values.delivery_address,
      remark: values.remark,
      details: values.details.map((d) => ({
        product_id: d.product_id,
        order_qty: d.order_qty,
        unit_price: d.unit_price,
        delivery_date: d.delivery_date,
        notes: d.notes,
      })),
    }
    createMutation.mutate(payload)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 헤더 정보 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            거래처 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="customer_id"
            render={({ field }) => (
              <select
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-gray-50"
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="">거래처 선택</option>
                {customerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.customer_id && (
            <p className="mt-1 text-xs text-danger">{errors.customer_id.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            수주유형 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="order_type"
            render={({ field }) => (
              <Select
                options={ORDER_TYPE_OPTIONS}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </div>
        <div>
          <Input
            label="수주일"
            type="date"
            required
            {...register('order_date')}
            error={errors.order_date?.message}
          />
        </div>
        <div>
          <Input
            label="납기일"
            type="date"
            required
            {...register('delivery_date')}
            error={errors.delivery_date?.message}
          />
        </div>
        <div className="col-span-2">
          <Input
            label="납품처 주소"
            placeholder="납품처 주소를 입력하세요"
            {...register('delivery_address')}
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

      {/* 상세 라인 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">수주 상세</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={() =>
              append({ product_id: 0, order_qty: 0, unit_price: 0, delivery_date: '', notes: '' })
            }
          >
            라인 추가
          </Button>
        </div>
        {errors.details?.root && (
          <p className="mb-2 text-xs text-danger">{errors.details.root.message}</p>
        )}

        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">제품</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">수주수량</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">단가</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">금액</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">납기일</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">비고</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {fields.map((field, index) => {
                const qty = watchedDetails[index]?.order_qty ?? 0
                const price = watchedDetails[index]?.unit_price ?? 0
                const amount = qty * price
                return (
                  <tr key={field.id}>
                    <td className="px-3 py-2">
                      <Controller
                        control={control}
                        name={`details.${index}.product_id`}
                        render={({ field: f }) => (
                          <select
                            className="block w-48 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                            value={f.value || ''}
                            onChange={(e) => {
                              const id = Number(e.target.value)
                              f.onChange(id)
                              handleProductChange(index, id)
                            }}
                          >
                            <option value="">제품 선택</option>
                            {productOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                      {errors.details?.[index]?.product_id && (
                        <p className="mt-0.5 text-xs text-danger">
                          {errors.details[index]?.product_id?.message}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        className="w-24 rounded border border-gray-300 px-2 py-1.5 text-right text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                        {...register(`details.${index}.order_qty`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-gray-300 px-2 py-1.5 text-right text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                        {...register(`details.${index}.unit_price`, { valueAsNumber: true })}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-gray-700">
                      {formatCurrency(amount)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className="rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                        {...register(`details.${index}.delivery_date`)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="비고"
                        className="w-32 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                        {...register(`details.${index}.notes`)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded p-1 text-gray-400 hover:bg-danger-50 hover:text-danger transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-3 py-2 text-xs font-semibold text-gray-700">합계</td>
                <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                  {totalQty.toLocaleString('ko-KR')}
                </td>
                <td className="px-3 py-2"></td>
                <td className="px-3 py-2 text-right text-xs font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 버튼 */}
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
