'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import NumericInput from '@/components/pop/NumericInput'
import { processRecordApi } from '@/lib/api'

// CCP 기준값
const CCP = {
  tempMin: -2,
  tempMax: 10,
}

interface SeasoningFormValues {
  seasoning_ratio: number
  mix_temp: number
  mix_time: number
  garlic_content: number
  chili_content: number
  ginger_content: number
  input_weight: number
  output_weight: number
  lot_no: string
}

interface SeasoningRecordFormProps {
  workOrderId: number
  onSaved: () => void
}

function CcpBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${
        pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {pass ? 'PASS' : 'FAIL'}
    </span>
  )
}

function generateLotNo(workOrderId: number): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `WO${workOrderId}-${dateStr}`
}

export default function SeasoningRecordForm({ workOrderId, onSaved }: SeasoningRecordFormProps) {
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const { control, handleSubmit, watch, setValue } = useForm<SeasoningFormValues>({
    defaultValues: {
      seasoning_ratio: 30,
      mix_temp: 4,
      mix_time: 20,
      garlic_content: 30,
      chili_content: 50,
      ginger_content: 10,
      input_weight: 0,
      output_weight: 0,
      lot_no: generateLotNo(workOrderId),
    },
  })

  const mixTemp = watch('mix_temp')
  const allFilled = watch('input_weight') > 0 && watch('output_weight') > 0

  const tempPass = mixTemp >= CCP.tempMin && mixTemp <= CCP.tempMax
  const ccpPass = tempPass

  const onSubmit = async (data: SeasoningFormValues) => {
    setSaving(true)
    try {
      await processRecordApi.createSeasoningRecord({ ...data, work_order_id: workOrderId })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1000)
      onSaved()
    } catch {
      alert('양념버무림 기록 저장에 실패했습니다.')
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

      {/* CCP 실시간 판정 */}
      {allFilled && (
        <div
          className={`rounded-2xl border-2 p-4 text-center ${
            ccpPass ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
          }`}
        >
          <p className="text-sm font-semibold text-gray-600">HACCP CCP 판정</p>
          <p className={`mt-1 text-3xl font-black ${ccpPass ? 'text-green-700' : 'text-red-700'}`}>
            {ccpPass ? 'CCP PASS' : 'CCP FAIL — 즉시 조치 필요'}
          </p>
        </div>
      )}

      {/* 양념배합비 */}
      <Controller
        name="seasoning_ratio"
        control={control}
        render={({ field }) => (
          <NumericInput
            label="양념배합비"
            value={field.value}
            onChange={field.onChange}
            unit="%"
            min={0}
            max={100}
            step={0.5}
          />
        )}
      />

      {/* 혼합온도 — CCP */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">
            CCP 기준: {CCP.tempMin}~{CCP.tempMax}°C
          </span>
          <CcpBadge pass={tempPass} />
        </div>
        <Controller
          name="mix_temp"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="혼합온도"
              value={field.value}
              onChange={field.onChange}
              unit="°C"
              min={-10}
              max={20}
              step={0.5}
              className={!tempPass ? '[&_input]:border-red-500 [&_input]:bg-red-50' : ''}
            />
          )}
        />
        {!tempPass && (
          <p className="mt-1 text-sm font-semibold text-red-600">
            온도 기준 이탈! ({CCP.tempMin}~{CCP.tempMax}°C)
          </p>
        )}
      </div>

      {/* 혼합시간 */}
      <Controller
        name="mix_time"
        control={control}
        render={({ field }) => (
          <NumericInput
            label="혼합시간"
            value={field.value}
            onChange={field.onChange}
            unit="분"
            min={0}
            max={120}
            step={1}
          />
        )}
      />

      {/* 원재료 함량 */}
      <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-bold text-gray-700">원재료 함량 (g/kg)</p>
        <div className="grid grid-cols-3 gap-3">
          <Controller
            name="garlic_content"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="마늘"
                value={field.value}
                onChange={field.onChange}
                unit="g/kg"
                min={0}
                max={200}
                step={1}
              />
            )}
          />
          <Controller
            name="chili_content"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="고추가루"
                value={field.value}
                onChange={field.onChange}
                unit="g/kg"
                min={0}
                max={200}
                step={1}
              />
            )}
          />
          <Controller
            name="ginger_content"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="생강"
                value={field.value}
                onChange={field.onChange}
                unit="g/kg"
                min={0}
                max={100}
                step={1}
              />
            )}
          />
        </div>
      </div>

      {/* 투입중량 / 버무림후중량 */}
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
          name="output_weight"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="버무림후중량"
              value={field.value}
              onChange={field.onChange}
              unit="kg"
              min={0}
              step={0.5}
            />
          )}
        />
      </div>

      {/* LOT번호 */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">LOT번호</label>
        <div className="flex gap-2">
          <Controller
            name="lot_no"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                placeholder="LOT번호 입력 또는 자동생성"
                className="h-[52px] flex-1 rounded-xl border-2 border-gray-300 px-4 text-base font-mono text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            )}
          />
          <button
            type="button"
            onClick={() => setValue('lot_no', generateLotNo(workOrderId))}
            className="h-[52px] rounded-xl border-2 border-blue-300 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            자동생성
          </button>
        </div>
      </div>

      {/* 저장 버튼 */}
      <button
        type="submit"
        disabled={saving}
        className="flex h-[60px] w-full items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '버무림 기록 저장'}
      </button>
    </form>
  )
}
