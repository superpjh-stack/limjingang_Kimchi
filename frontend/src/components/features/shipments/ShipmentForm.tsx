'use client'

import React from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { shipmentApi, customerApi, productApi } from '@/lib/api'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

interface ShipmentFormProps {
  onSuccess: () => void
  onCancel: () => void
}

type DetailFormValue = {
  product_id: number
  lot_no: string
  ship_qty: number
  unit_price: number
}

type FormValues = {
  customer_id: number
  order_id: string
  shipment_date: string
  delivery_address: string
  driver_name: string
  vehicle_no: string
  details: DetailFormValue[]
}

export default function ShipmentForm({ onSuccess, onCancel }: ShipmentFormProps) {
  const queryClient = useQueryClient()

  const { data: customersData } = useQuery({
    queryKey: ['customers', { limit: 200 }],
    queryFn: () => customerApi.getList({ limit: 200 }),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products', { limit: 500 }],
    queryFn: () => productApi.getList({ limit: 500 }),
  })

  const customers =
    (customersData as { data?: { data?: { id: number; name: string }[] } })?.data?.data ?? []
  const products =
    (productsData as {
      data?: { data?: { id: number; product_name: string; unit_price?: number }[] }
    })?.data?.data ?? []

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      shipment_date: new Date().toISOString().split('T')[0],
      details: [{ product_id: 0, lot_no: '', ship_qty: 0, unit_price: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'details' })
  const watchedDetails = watch('details')

  const totalQty = watchedDetails.reduce((sum, d) => sum + (d.ship_qty ?? 0), 0)
  const totalAmount = watchedDetails.reduce(
    (sum, d) => sum + (d.ship_qty ?? 0) * (d.unit_price ?? 0),
    0
  )

  const handleProductChange = (index: number, productId: number) => {
    const product = products.find((p) => p.id === productId)
    if (product?.unit_price) {
      setValue(`details.${index}.unit_price`, product.unit_price)
    }
  }

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => shipmentApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] })
      onSuccess()
    },
    onError: (err) => alert(getErrorMessage(err)),
  })

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      customer_id: Number(values.customer_id),
      order_id: values.order_id ? Number(values.order_id) : undefined,
      shipment_date: values.shipment_date,
      delivery_address: values.delivery_address || undefined,
      driver_name: values.driver_name || undefined,
      vehicle_no: values.vehicle_no || undefined,
      details: values.details.map((d) => ({
        product_id: Number(d.product_id),
        lot_no: d.lot_no || undefined,
        ship_qty: Number(d.ship_qty),
        unit_price: d.unit_price ? Number(d.unit_price) : undefined,
      })),
    })
  }

  const selectClass =
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 헤더 정보 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            거래처 <span className="text-danger">*</span>
          </label>
          <Controller
            control={control}
            name="customer_id"
            rules={{ required: '거래처를 선택하세요' }}
            render={({ field }) => (
              <select
                className={selectClass}
                value={field.value || ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                <option value="">거래처 선택</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
          <Input
            label="출하일"
            type="date"
            required
            {...register('shipment_date', { required: '출하일을 선택하세요' })}
            error={errors.shipment_date?.message}
          />
        </div>

        <div>
          <Input
            label="연계 수주 ID (선택)"
            type="number"
            placeholder="수주 ID 입력"
            {...register('order_id')}
          />
        </div>

        <div className="col-span-2">
          <Input
            label="납품처 주소"
            placeholder="납품처 주소 입력"
            {...register('delivery_address')}
          />
        </div>

        <div>
          <Input
            label="운전자명"
            placeholder="운전자 이름 입력"
            {...register('driver_name')}
          />
        </div>

        <div>
          <Input
            label="차량번호"
            placeholder="예: 12가3456"
            {...register('vehicle_no')}
          />
        </div>
      </div>

      {/* 출하 상세 라인 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">출하 상세</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={() =>
              append({ product_id: 0, lot_no: '', ship_qty: 0, unit_price: 0 })
            }
          >
            라인 추가
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">제품</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">LOT번호</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">출하수량</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">단가</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">금액</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {fields.map((field, index) => {
                const qty = watchedDetails[index]?.ship_qty ?? 0
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
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.product_name}
                              </option>
                            ))}
                          </select>
                        )}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        placeholder="LOT번호"
                        className="w-28 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                        {...register(`details.${index}.lot_no`)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        className="w-24 rounded border border-gray-300 px-2 py-1.5 text-right text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-200"
                        {...register(`details.${index}.ship_qty`, { valueAsNumber: true })}
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
                <td></td>
                <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700">
                  {totalQty.toLocaleString('ko-KR')}
                </td>
                <td></td>
                <td className="px-3 py-2 text-right text-xs font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>
          출하 등록
        </Button>
      </div>
    </form>
  )
}
