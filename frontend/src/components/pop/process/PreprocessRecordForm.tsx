'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import NumericInput from '@/components/pop/NumericInput'
import { processRecordApi, inventoryApi } from '@/lib/api'

interface PreprocessFormValues {
  raw_material_id: number | ''
  receive_date: string
  input_weight: number
  reject_weight: number
  storage_temp: number
  foreign_matter_removed: boolean
  pre_washed: boolean
  reject_reason: string
}

interface PreprocessRecordFormProps {
  onSaved: () => void
}

export default function PreprocessRecordForm({ onSaved }: PreprocessRecordFormProps) {
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const { data: materialsData } = useQuery(
    ['raw-materials'],
    () => inventoryApi.getRawMaterials(),
    { staleTime: 60_000 }
  )
  const materials: Array<{ id: number; name: string }> =
    (materialsData?.data as Array<{ id: number; name: string }>) ?? []

  const { control, handleSubmit, watch } = useForm<PreprocessFormValues>({
    defaultValues: {
      raw_material_id: '',
      receive_date: today,
      input_weight: 0,
      reject_weight: 0,
      storage_temp: 5,
      foreign_matter_removed: false,
      pre_washed: false,
      reject_reason: '',
    },
  })

  const inputWeight = watch('input_weight')
  const rejectWeight = watch('reject_weight')
  const rejectWeightVal = watch('reject_weight')

  const passWeight =
    inputWeight > 0 && rejectWeight >= 0 ? Math.max(0, inputWeight - rejectWeight) : null

  const onSubmit = async (data: PreprocessFormValues) => {
    setSaving(true)
    try {
      await processRecordApi.createPreprocessRecord({
        ...data,
        pass_weight: passWeight,
      })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1000)
      onSaved()
    } catch {
      alert('입고전처리 기록 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 저장 완료 플래시 */}
      {savedFlash && (
        <div className="rounded-xl bg-green-500 px-5 py-3 text-center text-lg font-bold text-white">
          저장됨
        </div>
      )}

      {/* 원재료 선택 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">
          원재료 <span className="text-red-500">*</span>
        </label>
        <Controller
          name="raw_material_id"
          control={control}
          rules={{ required: '원재료를 선택해주세요' }}
          render={({ field, fieldState }) => (
            <>
              <select
                {...field}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-[56px] rounded-xl border-2 border-gray-300 px-4 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                <option value="">원재료 선택...</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {fieldState.error && (
                <p className="text-sm text-red-500">{fieldState.error.message}</p>
              )}
            </>
          )}
        />
      </div>

      {/* 입고일 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">입고일</label>
        <Controller
          name="receive_date"
          control={control}
          render={({ field }) => (
            <input
              type="date"
              {...field}
              className="h-[56px] rounded-xl border-2 border-gray-300 px-4 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          )}
        />
      </div>

      {/* 투입중량 / 불합격중량 */}
      <div className="grid grid-cols-2 gap-4">
        <Controller
          name="input_weight"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="투입중량"
              value={field.value}
              onChange={field.onChange}
              unit="kg"
              min={0}
              step={0.5}
            />
          )}
        />
        <Controller
          name="reject_weight"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="불합격중량"
              value={field.value}
              onChange={field.onChange}
              unit="kg"
              min={0}
              step={0.5}
            />
          )}
        />
      </div>

      {/* 합격중량 자동계산 */}
      {passWeight !== null && (
        <div className="rounded-xl border-2 border-green-300 bg-green-50 px-5 py-3">
          <p className="text-sm font-semibold text-gray-600">합격중량 (자동계산)</p>
          <p className="text-2xl font-black text-green-700">{passWeight.toFixed(1)} kg</p>
        </div>
      )}

      {/* 보관온도 */}
      <Controller
        name="storage_temp"
        control={control}
        render={({ field }) => (
          <NumericInput
            label="보관온도"
            value={field.value}
            onChange={field.onChange}
            unit="°C"
            min={-10}
            max={30}
            step={0.5}
          />
        )}
      />

      {/* 이물질 제거 토글 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">이물질 제거</p>
        <Controller
          name="foreign_matter_removed"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => field.onChange(false)}
                className={`flex h-[60px] flex-1 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                  !field.value
                    ? 'bg-gray-400 text-white'
                    : 'border-2 border-gray-300 bg-white text-gray-600'
                }`}
              >
                미실시
              </button>
              <button
                type="button"
                onClick={() => field.onChange(true)}
                className={`flex h-[60px] flex-1 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                  field.value
                    ? 'bg-green-500 text-white'
                    : 'border-2 border-gray-300 bg-white text-gray-600'
                }`}
              >
                완료
              </button>
            </div>
          )}
        />
      </div>

      {/* 사전세척 토글 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">사전세척</p>
        <Controller
          name="pre_washed"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => field.onChange(false)}
                className={`flex h-[60px] flex-1 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                  !field.value
                    ? 'bg-gray-400 text-white'
                    : 'border-2 border-gray-300 bg-white text-gray-600'
                }`}
              >
                미실시
              </button>
              <button
                type="button"
                onClick={() => field.onChange(true)}
                className={`flex h-[60px] flex-1 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                  field.value
                    ? 'bg-green-500 text-white'
                    : 'border-2 border-gray-300 bg-white text-gray-600'
                }`}
              >
                완료
              </button>
            </div>
          )}
        />
      </div>

      {/* 불합격 사유 — 불합격중량 > 0 시 */}
      {rejectWeightVal > 0 && (
        <Controller
          name="reject_reason"
          control={control}
          rules={{ required: '불합격 중량이 있는 경우 사유를 입력해주세요' }}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                불합격 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                {...field}
                rows={3}
                placeholder="불합격 원인 및 처리방법을 입력하세요"
                className="w-full rounded-xl border-2 border-red-300 p-3 text-base text-gray-900 focus:border-red-500 focus:outline-none"
              />
              {fieldState.error && (
                <p className="text-sm text-red-500">{fieldState.error.message}</p>
              )}
            </div>
          )}
        />
      )}

      {/* 저장 버튼 */}
      <button
        type="submit"
        disabled={saving}
        className="flex h-[60px] w-full items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '입고전처리 기록 저장'}
      </button>
    </form>
  )
}
