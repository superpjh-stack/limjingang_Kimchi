'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import NumericInput from './NumericInput'
import type { ResultInput } from '@/types/production'

interface ResultFormProps {
  plannedQty: number
  defaultActualQty?: number
  defaultDefectQty?: number
  onSubmit: (data: ResultInput) => Promise<void>
  isSubmitting?: boolean
}

export default function ResultForm({
  plannedQty,
  defaultActualQty = 0,
  defaultDefectQty = 0,
  onSubmit,
  isSubmitting = false,
}: ResultFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResultInput>({
    defaultValues: {
      actual_qty: defaultActualQty,
      defect_qty: defaultDefectQty,
      defect_reason: '',
      notes: '',
    },
  })

  const defectQty = watch('defect_qty') ?? 0

  const onFormSubmit = async (data: ResultInput) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* 생산수량 */}
      <Controller
        name="actual_qty"
        control={control}
        rules={{ min: { value: 0, message: '0 이상이어야 합니다' } }}
        render={({ field }) => (
          <div>
            <NumericInput
              label="생산수량"
              value={field.value}
              onChange={field.onChange}
              unit="kg"
              min={0}
              max={plannedQty * 1.5}
            />
            {errors.actual_qty && (
              <p className="mt-1 text-sm text-red-500">{errors.actual_qty.message}</p>
            )}
          </div>
        )}
      />

      {/* 불량수량 */}
      <Controller
        name="defect_qty"
        control={control}
        rules={{ min: { value: 0, message: '0 이상이어야 합니다' } }}
        render={({ field }) => (
          <div>
            <NumericInput
              label="불량수량"
              value={field.value ?? 0}
              onChange={field.onChange}
              unit="kg"
              min={0}
            />
            {errors.defect_qty && (
              <p className="mt-1 text-sm text-red-500">{errors.defect_qty.message}</p>
            )}
          </div>
        )}
      />

      {/* 불량사유 — 불량수량 > 0 시에만 표시 */}
      {defectQty > 0 && (
        <Controller
          name="defect_reason"
          control={control}
          rules={{ required: '불량수량이 있는 경우 사유를 입력해주세요' }}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                불량사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                {...field}
                rows={3}
                placeholder="불량 발생 원인을 입력하세요"
                className="w-full rounded-xl border-2 border-gray-300 p-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
              />
              {errors.defect_reason && (
                <p className="text-sm text-red-500">{errors.defect_reason.message}</p>
              )}
            </div>
          )}
        />
      )}

      {/* 비고 */}
      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">비고 (선택)</label>
            <textarea
              {...field}
              rows={2}
              placeholder="특이사항을 입력하세요"
              className="w-full rounded-xl border-2 border-gray-300 p-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}
      />

      {/* 저장 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-[60px] w-full items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-5 w-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                fill="currentColor"
              />
            </svg>
            저장 중...
          </span>
        ) : (
          '실적 저장'
        )}
      </button>
    </form>
  )
}
