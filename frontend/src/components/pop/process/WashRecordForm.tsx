'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import NumericInput from '@/components/pop/NumericInput'
import { processRecordApi } from '@/lib/api'

// CCP 기준값
const CCP = {
  tempMin: 1,
  tempMax: 15,
  phMin: 6.5,
  phMax: 8.5,
}

interface WashFormValues {
  water_temp: number
  ph: number
  pressure: number
  wash_time: number
  input_weight: number
  output_weight: number
  foreign_matter_found: boolean
  foreign_matter_detail: string
}

interface WashRecordFormProps {
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

export default function WashRecordForm({ workOrderId, onSaved }: WashRecordFormProps) {
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const { control, handleSubmit, watch } = useForm<WashFormValues>({
    defaultValues: {
      water_temp: 8,
      ph: 7.0,
      pressure: 3,
      wash_time: 10,
      input_weight: 0,
      output_weight: 0,
      foreign_matter_found: false,
      foreign_matter_detail: '',
    },
  })

  const waterTemp = watch('water_temp')
  const ph = watch('ph')
  const foreignMatter = watch('foreign_matter_found')

  const tempPass = waterTemp >= CCP.tempMin && waterTemp <= CCP.tempMax
  const phPass = ph >= CCP.phMin && ph <= CCP.phMax
  const allFilled =
    watch('input_weight') > 0 && watch('output_weight') > 0
  const ccpPass = tempPass && phPass

  const onSubmit = async (data: WashFormValues) => {
    setSaving(true)
    try {
      await processRecordApi.createWashRecord({ ...data, work_order_id: workOrderId })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1000)
      onSaved()
    } catch {
      alert('세척 기록 저장에 실패했습니다.')
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

      {/* CCP 실시간 합격 판정 */}
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

      {/* 세척수 온도 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">
            CCP 기준: {CCP.tempMin}~{CCP.tempMax}°C
          </span>
          <CcpBadge pass={tempPass} />
        </div>
        <Controller
          name="water_temp"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="세척수 온도"
              value={field.value}
              onChange={field.onChange}
              unit="°C"
              min={-5}
              max={30}
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

      {/* pH */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">
            CCP 기준: pH {CCP.phMin}~{CCP.phMax}
          </span>
          <CcpBadge pass={phPass} />
        </div>
        <Controller
          name="ph"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="pH"
              value={field.value}
              onChange={field.onChange}
              unit="pH"
              min={0}
              max={14}
              step={0.1}
              className={!phPass ? '[&_input]:border-red-500 [&_input]:bg-red-50' : ''}
            />
          )}
        />
        {!phPass && (
          <p className="mt-1 text-sm font-semibold text-red-600">
            pH 기준 이탈! ({CCP.phMin}~{CCP.phMax})
          </p>
        )}
      </div>

      {/* 세척 압력 */}
      <Controller
        name="pressure"
        control={control}
        render={({ field }) => (
          <NumericInput
            label="세척 압력"
            value={field.value}
            onChange={field.onChange}
            unit="bar"
            min={0}
            max={10}
            step={0.5}
          />
        )}
      />

      {/* 세척 시간 */}
      <Controller
        name="wash_time"
        control={control}
        render={({ field }) => (
          <NumericInput
            label="세척 시간"
            value={field.value}
            onChange={field.onChange}
            unit="분"
            min={0}
            max={120}
            step={1}
          />
        )}
      />

      {/* 투입중량 / 세척후중량 */}
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
              label="세척후중량"
              value={field.value}
              onChange={field.onChange}
              unit="kg"
              min={0}
              step={0.5}
            />
          )}
        />
      </div>

      {/* 이물질 발견 토글 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">이물질 발견</p>
        <div className="flex gap-3">
          <Controller
            name="foreign_matter_found"
            control={control}
            render={({ field }) => (
              <>
                <button
                  type="button"
                  onClick={() => field.onChange(false)}
                  className={`flex h-[60px] flex-1 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                    !field.value
                      ? 'bg-green-500 text-white'
                      : 'border-2 border-gray-300 bg-white text-gray-600'
                  }`}
                >
                  NO
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange(true)}
                  className={`flex h-[60px] flex-1 items-center justify-center rounded-xl text-lg font-bold transition-colors ${
                    field.value
                      ? 'bg-red-500 text-white'
                      : 'border-2 border-gray-300 bg-white text-gray-600'
                  }`}
                >
                  YES
                </button>
              </>
            )}
          />
        </div>
      </div>

      {/* 이물질 상세 */}
      {foreignMatter && (
        <Controller
          name="foreign_matter_detail"
          control={control}
          rules={{ required: '이물질 발견 시 상세 내용을 입력해주세요' }}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">
                이물질 상세 <span className="text-red-500">*</span>
              </label>
              <textarea
                {...field}
                rows={3}
                placeholder="발견된 이물질의 종류, 위치, 처리방법을 입력하세요"
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
        {saving ? '저장 중...' : '세척 기록 저장'}
      </button>
    </form>
  )
}
