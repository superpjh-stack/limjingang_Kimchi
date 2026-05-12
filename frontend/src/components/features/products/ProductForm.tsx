'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import Input, { Select } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { productApi } from '@/lib/api'
import type { Product, ProductCreateRequest } from '@/types/product'

const productSchema = z.object({
  product_code: z.string().min(1, '제품코드를 입력하세요').max(20, '최대 20자까지 입력 가능합니다'),
  product_name: z.string().min(1, '제품명을 입력하세요').max(100, '최대 100자까지 입력 가능합니다'),
  product_type: z.enum(['kimchi', 'side_dish', 'sauce', 'other'], {
    required_error: '유형을 선택하세요',
  }),
  capacity_g: z.coerce
    .number({ invalid_type_error: '숫자를 입력하세요' })
    .positive('0보다 큰 값을 입력하세요'),
  packaging_unit: z.string().min(1, '포장단위를 입력하세요'),
  sales_channel: z.enum(['retail', 'wholesale', 'online', 'export'], {
    required_error: '채널을 선택하세요',
  }),
  unit_price: z.coerce
    .number({ invalid_type_error: '숫자를 입력하세요' })
    .nonnegative('0 이상의 값을 입력하세요'),
  status: z.enum(['active', 'inactive', 'discontinued']),
  description: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product | null
  onSuccess: () => void
  onCancel: () => void
}

const productTypeOptions = [
  { label: '김치', value: 'kimchi' },
  { label: '반찬', value: 'side_dish' },
  { label: '양념', value: 'sauce' },
  { label: '기타', value: 'other' },
]

const salesChannelOptions = [
  { label: '소매', value: 'retail' },
  { label: '도매', value: 'wholesale' },
  { label: '온라인', value: 'online' },
  { label: '수출', value: 'export' },
]

const statusOptions = [
  { label: '판매중', value: 'active' },
  { label: '판매중지', value: 'inactive' },
  { label: '단종', value: 'discontinued' },
]

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          product_code: product.product_code,
          product_name: product.product_name,
          product_type: product.product_type,
          capacity_g: product.capacity_g,
          packaging_unit: product.packaging_unit,
          sales_channel: product.sales_channel,
          unit_price: product.unit_price,
          status: product.status,
          description: product.description ?? '',
        }
      : {
          status: 'active',
          product_type: 'kimchi',
          sales_channel: 'retail',
        },
  })

  const onSubmit = async (data: ProductFormData) => {
    try {
      const payload: ProductCreateRequest = {
        product_code: data.product_code,
        product_name: data.product_name,
        product_type: data.product_type,
        capacity_g: data.capacity_g,
        packaging_unit: data.packaging_unit,
        sales_channel: data.sales_channel,
        unit_price: data.unit_price,
        status: data.status,
        description: data.description,
      }

      if (isEdit && product) {
        await productApi.update(product.id, payload)
        toast.success('제품정보가 수정되었습니다.')
      } else {
        await productApi.create(payload)
        toast.success('제품이 등록되었습니다.')
      }
      onSuccess()
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '저장 중 오류가 발생했습니다.'
      toast.error(msg)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="제품코드"
          required
          placeholder="예: KMC-001"
          error={errors.product_code?.message}
          {...register('product_code')}
          disabled={isEdit}
        />
        <Input
          label="제품명"
          required
          placeholder="예: 배추김치 500g"
          error={errors.product_name?.message}
          {...register('product_name')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="제품유형"
          required
          options={productTypeOptions}
          error={errors.product_type?.message}
          {...register('product_type')}
        />
        <Select
          label="판매채널"
          required
          options={salesChannelOptions}
          error={errors.sales_channel?.message}
          {...register('sales_channel')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="용량 (g)"
          required
          type="number"
          placeholder="500"
          error={errors.capacity_g?.message}
          {...register('capacity_g')}
        />
        <Input
          label="포장단위"
          required
          placeholder="예: 1팩, 1BOX(10개)"
          error={errors.packaging_unit?.message}
          {...register('packaging_unit')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="단가 (원)"
          required
          type="number"
          placeholder="5000"
          error={errors.unit_price?.message}
          {...register('unit_price')}
        />
        <Select
          label="상태"
          options={statusOptions}
          error={errors.status?.message}
          {...register('status')}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">비고</label>
        <textarea
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-200"
          rows={3}
          placeholder="추가 설명 (선택)"
          {...register('description')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? '수정하기' : '등록하기'}
        </Button>
      </div>
    </form>
  )
}
