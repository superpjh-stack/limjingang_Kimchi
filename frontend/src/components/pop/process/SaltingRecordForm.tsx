'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import NumericInput from '@/components/pop/NumericInput'
import { processRecordApi } from '@/lib/api'

// CCP 기준값
const CCP = {
  concentrationMin: 15,
  concentrationMax: 20,
  timeMinHours: 6,
  timeMaxHours: 18,
  salinityMin: 2.5,
  salinityMax: 3.0,
}

interface SaltingFormValues {
  brine_concentration: number
  start_time: string
  end_time: string
  input_weight: number
  output_weight: number
  salinity_after: number
  rinse_count: number
}

interface SaltingRecordFormProps {
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

function calcElapsedHours(start: string, end: string): number | null {
  if (!start || !end) return null
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (diff <= 0) return null
  return diff / 3600000
}

export default function SaltingRecordForm({ workOrderId, onSaved }: SaltingRecordFormProps) {
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const now = new Date().toISOString().slice(0, 16)

  const { control, handleSubmit, watch } = useForm<SaltingFormValues>({
    defaultValues: {
      brine_concentration: 17,
      start_time: now,
      end_time: '',
      input_weight: 0,
      output_weight: 0,
      salinity_after: 2.8,
      rinse_count: 3,
    },
  })

  const concentration = watch('brine_concentration')
  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const salinityAfter = watch('salinity_after')

  const elapsedHours = calcElapsedHours(startTime, endTime)

  const concentrationPass =
    concentration >= CCP.concentrationMin && concentration <= CCP.concentrationMax
  const timePass =
    elapsedHours !== null &&
    elapsedHours >= CCP.timeMinHours &&
    elapsedHours <= CCP.timeMaxHours
  const salinityPass = salinityAfter >= CCP.salinityMin && salinityAfter <= CCP.salinityMax
  const ccpPass = concentrationPass && (elapsedHours === null || timePass) && salinityPass
  const allFilled = watch('input_weight') > 0 && watch('output_weight') > 0 && !!endTime

  const onSubmit = async (data: SaltingFormValues) => {
    setSaving(true)
    try {
      await processRecordApi.createSaltingRecord({
        ...data,
        work_order_id: workOrderId,
        elapsed_hours: elapsedHours,
      })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1000)
      onSaved()
    } catch {
      alert('절임 기록 저장에 실패했습니다.')
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

      {/* 염수농도 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-500">
            CCP 기준: {CCP.concentrationMin}~{CCP.concentrationMax}%
          </span>
          <CcpBadge pass={concentrationPass} />
        </div>
        <Controller
          name="brine_concentration"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="염수농도"
              value={field.value}
              onChange={field.onChange}
              unit="%"
              min={0}
              max={30}
              step={0.5}
              className={!concentrationPass ? '[&_input]:border-red-500 [&_input]:bg-red-50' : ''}
            />
          )}
        />
        {!concentrationPass && (
          <p className="mt-1 text-sm font-semibold text-red-600">
            농도 기준 이탈! ({CCP.concentrationMin}~{CCP.concentrationMax}%)
          </p>
        )}
      </div>

      {/* 절임 시작/종료 시각 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="start_time"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">절임 시작시각</label>
              <input
                type="datetime-local"
                {...field}
                className="h-[56px] rounded-xl border-2 border-gray-300 px-4 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        />
        <Controller
          name="end_time"
          control={control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700">절임 종료시각</label>
              <input
                type="datetime-local"
                {...field}
                className="h-[56px] rounded-xl border-2 border-gray-300 px-4 text-base font-medium text-gray-900 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        />
      </div>

      {/* 절임 소요시간 자동계산 */}
      {elapsedHours !== null && (
        <div
          className={`rounded-xl border-2 px-5 py-3 ${
            timePass ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600">
              절임 소요시간 (자동계산) — CCP 기준: {CCP.timeMinHours}~{CCP.timeMaxHours}시간
            </span>
            <CcpBadge pass={timePass} />
          </div>
          <p className={`mt-1 text-2xl font-black ${timePass ? 'text-green-700' : 'text-red-700'}`}>
            {elapsedHours.toFixed(1)} 시간
          </p>
          {!timePass && (
            <p className="text-sm font-semibold text-red-600">
              절임 시간 기준 이탈! ({CCP.timeMinHours}~{CCP.timeMaxHours}시간)
            </p>
          )}
        </div>
      )}

      {/* 투입중량 / 절임후중량 */}
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
              label="절임후중량"
              value={field.value}
              onChange={field.onChange}
              unit="kg"
              min={0}
              step={0.5}
            />
          )}
        />
      </div>

      {/* 절임 후 염도 — CCP 중요 강조 */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-bold text-orange-600">
            [중요 CCP] 절임 후 염도 기준: {CCP.salinityMin}~{CCP.salinityMax}%
          </span>
          <CcpBadge pass={salinityPass} />
        </div>
        <Controller
          name="salinity_after"
          control={control}
          render={({ field }) => (
            <NumericInput
              label="절임 후 염도"
              value={field.value}
              onChange={field.onChange}
              unit="%"
              min={0}
              max={10}
              step={0.1}
              className={!salinityPass ? '[&_input]:border-red-500 [&_input]:bg-red-50' : ''}
            />
          )}
        />
        {!salinityPass && (
          <p className="mt-1 text-sm font-semibold text-red-600">
            염도 기준 이탈! ({CCP.salinityMin}~{CCP.salinityMax}%)
          </p>
        )}
      </div>

      {/* 탈수 세척 횟수 */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">탈수 세척 횟수</p>
        <Controller
          name="rinse_count"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => field.onChange(n)}
                  className={`flex h-[60px] items-center justify-center rounded-xl text-xl font-bold transition-colors ${
                    field.value === n
                      ? 'bg-blue-600 text-white'
                      : 'border-2 border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {n}회
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {/* 저장 버튼 */}
      <button
        type="submit"
        disabled={saving}
        className="flex h-[60px] w-full items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '절임 기록 저장'}
      </button>
    </form>
  )
}
