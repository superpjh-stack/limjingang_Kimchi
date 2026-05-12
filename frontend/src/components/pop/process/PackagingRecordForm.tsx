'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import NumericInput from '@/components/pop/NumericInput'
import { processRecordApi } from '@/lib/api'

type MetalDetectResult = 'PASS' | 'FAIL' | null
type SealingState = 'GOOD' | 'POOR' | 'FAIL' | null

interface PackagingFormValues {
  target_weight: number
  actual_avg_weight: number
  total_qty: number
  defect_qty: number
  metal_detect: MetalDetectResult
  sealing_state: SealingState
  label_attached: boolean
  expiry_date: string
  lot_no: string
}

interface PackagingRecordFormProps {
  workOrderId: number
  onSaved: () => void
}

export default function PackagingRecordForm({ workOrderId, onSaved }: PackagingRecordFormProps) {
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [showMetalFailOverlay, setShowMetalFailOverlay] = useState(false)

  const { control, handleSubmit, watch, setValue } = useForm<PackagingFormValues>({
    defaultValues: {
      target_weight: 500,
      actual_avg_weight: 0,
      total_qty: 0,
      defect_qty: 0,
      metal_detect: null,
      sealing_state: null,
      label_attached: false,
      expiry_date: '',
      lot_no: '',
    },
  })

  const targetWeight = watch('target_weight')
  const actualAvgWeight = watch('actual_avg_weight')
  const totalQty = watch('total_qty')
  const defectQty = watch('defect_qty')
  const metalDetect = watch('metal_detect')

  // 자동 계산
  const weightDeviation =
    targetWeight > 0 && actualAvgWeight > 0
      ? (((actualAvgWeight - targetWeight) / targetWeight) * 100).toFixed(1)
      : null
  const defectRate =
    totalQty > 0 ? ((defectQty / totalQty) * 100).toFixed(2) : null

  const metalFail = metalDetect === 'FAIL'

  const onSubmit = async (data: PackagingFormValues) => {
    if (metalFail) {
      setShowMetalFailOverlay(true)
      return
    }
    setSaving(true)
    try {
      await processRecordApi.createPackagingRecord({ ...data, work_order_id: workOrderId })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1000)
      onSaved()
    } catch {
      alert('포장 기록 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* 금속검출 FAIL 전체화면 오버레이 */}
      {showMetalFailOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 p-8">
          <p className="text-center text-6xl font-black text-white">즉시 라인 중단</p>
          <p className="mt-4 text-center text-2xl font-bold text-red-100">
            금속검출 FAIL — 해당 제품을 격리하고 책임자에게 보고하십시오
          </p>
          <button
            onClick={() => setShowMetalFailOverlay(false)}
            className="mt-10 rounded-2xl border-4 border-white bg-transparent px-10 py-4 text-xl font-bold text-white hover:bg-red-700"
          >
            확인 (라인 중단 조치 완료)
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 저장 완료 플래시 */}
        {savedFlash && (
          <div className="rounded-xl bg-green-500 px-5 py-3 text-center text-lg font-bold text-white">
            저장됨
          </div>
        )}

        {/* 목표/실측 중량 */}
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="target_weight"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="목표포장중량"
                value={field.value}
                onChange={field.onChange}
                unit="g"
                min={0}
                step={10}
              />
            )}
          />
          <Controller
            name="actual_avg_weight"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="실측평균중량"
                value={field.value}
                onChange={field.onChange}
                unit="g"
                min={0}
                step={1}
              />
            )}
          />
        </div>

        {/* 중량 편차 자동계산 */}
        {weightDeviation !== null && (
          <div
            className={`rounded-xl border-2 px-5 py-3 ${
              Math.abs(parseFloat(weightDeviation)) <= 3
                ? 'border-green-300 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}
          >
            <p className="text-sm font-semibold text-gray-600">중량 편차 (자동계산)</p>
            <p
              className={`text-2xl font-black ${
                Math.abs(parseFloat(weightDeviation)) <= 3 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {weightDeviation > '0' ? '+' : ''}
              {weightDeviation}%
            </p>
          </div>
        )}

        {/* 총 포장수량 / 불량수량 */}
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="total_qty"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="총 포장수량"
                value={field.value}
                onChange={field.onChange}
                unit="개"
                min={0}
                step={1}
              />
            )}
          />
          <Controller
            name="defect_qty"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="불량수량"
                value={field.value}
                onChange={field.onChange}
                unit="개"
                min={0}
                step={1}
              />
            )}
          />
        </div>

        {/* 불량률 자동계산 */}
        {defectRate !== null && totalQty > 0 && (
          <div
            className={`rounded-xl border-2 px-5 py-3 ${
              parseFloat(defectRate) <= 1.3
                ? 'border-green-300 bg-green-50'
                : 'border-red-300 bg-red-50'
            }`}
          >
            <p className="text-sm font-semibold text-gray-600">불량률 (자동계산)</p>
            <p
              className={`text-2xl font-black ${
                parseFloat(defectRate) <= 1.3 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              {defectRate}%
            </p>
          </div>
        )}

        {/* 금속검출 결과 — CCP 필수 */}
        <div>
          <p className="mb-2 text-sm font-bold text-gray-700">
            금속검출 결과 <span className="text-red-500">* (CCP 필수)</span>
          </p>
          <Controller
            name="metal_detect"
            control={control}
            rules={{ required: '금속검출 결과를 선택하세요' }}
            render={({ field, fieldState }) => (
              <>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange('PASS')}
                    className={`flex h-[70px] flex-1 items-center justify-center rounded-xl text-2xl font-black transition-colors ${
                      field.value === 'PASS'
                        ? 'bg-green-500 text-white'
                        : 'border-2 border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    PASS
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange('FAIL')}
                    className={`flex h-[70px] flex-1 items-center justify-center rounded-xl text-2xl font-black transition-colors ${
                      field.value === 'FAIL'
                        ? 'bg-red-600 text-white ring-4 ring-red-300'
                        : 'border-2 border-red-300 bg-white text-red-600'
                    }`}
                  >
                    FAIL
                  </button>
                </div>
                {fieldState.error && (
                  <p className="mt-1 text-sm text-red-500">{fieldState.error.message}</p>
                )}
                {field.value === 'FAIL' && (
                  <div className="mt-2 rounded-xl border-2 border-red-400 bg-red-50 p-3 text-center">
                    <p className="font-bold text-red-700">
                      금속검출 FAIL — 저장 불가. 즉시 라인 중단 및 책임자 보고 필요.
                    </p>
                  </div>
                )}
              </>
            )}
          />
        </div>

        {/* 실링상태 */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">실링상태</p>
          <Controller
            name="sealing_state"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-3 gap-2">
                {(['GOOD', 'POOR', 'FAIL'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => field.onChange(s)}
                    className={`flex h-[60px] items-center justify-center rounded-xl text-base font-bold transition-colors ${
                      field.value === s
                        ? s === 'GOOD'
                          ? 'bg-green-500 text-white'
                          : s === 'POOR'
                          ? 'bg-yellow-400 text-gray-900'
                          : 'bg-red-500 text-white'
                        : 'border-2 border-gray-300 bg-white text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* 라벨부착 */}
        <Controller
          name="label_attached"
          control={control}
          render={({ field }) => (
            <div className="flex items-center gap-4">
              <button
                type="button"
                role="checkbox"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={`flex h-[56px] w-[56px] flex-shrink-0 items-center justify-center rounded-xl border-2 text-2xl font-bold transition-colors ${
                  field.value
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {field.value ? '✓' : ''}
              </button>
              <span className="text-lg font-semibold text-gray-700">라벨 부착 완료</span>
            </div>
          )}
        />

        {/* 유통기한 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">유통기한</label>
          <Controller
            name="expiry_date"
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

        {/* LOT번호 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">LOT번호</label>
          <Controller
            name="lot_no"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                placeholder="LOT번호 입력"
                className="h-[52px] rounded-xl border-2 border-gray-300 px-4 text-base font-mono text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            )}
          />
        </div>

        {/* 저장 버튼 */}
        <button
          type="submit"
          disabled={saving || metalFail}
          className={`flex h-[60px] w-full items-center justify-center rounded-xl text-lg font-bold text-white transition-colors disabled:opacity-50 ${
            metalFail ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {metalFail ? '금속검출 FAIL — 저장 불가' : saving ? '저장 중...' : '포장 기록 저장'}
        </button>
      </form>
    </>
  )
}
