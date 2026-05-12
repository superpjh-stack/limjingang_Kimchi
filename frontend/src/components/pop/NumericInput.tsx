'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface NumericInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  unit?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export default function NumericInput({
  label,
  value,
  onChange,
  unit = 'kg',
  min = 0,
  max,
  step = 1,
  disabled = false,
  className,
}: NumericInputProps) {
  const clamp = (v: number) => {
    let result = v
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    return Math.round(result * 10) / 10
  }

  const handleDecrement = () => {
    onChange(clamp(value - step))
  }

  const handleIncrement = () => {
    onChange(clamp(value + step))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value)
    if (!isNaN(raw)) {
      onChange(clamp(raw))
    } else if (e.target.value === '') {
      onChange(min ?? 0)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex items-center gap-3">
        {/* 감소 버튼 */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= (min ?? 0)}
          className="flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-2xl font-bold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="감소"
        >
          −
        </button>

        {/* 숫자 입력 */}
        <div className="relative flex-1">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="w-full rounded-xl border-2 border-gray-300 bg-white py-3 pr-14 text-center font-mono text-4xl font-bold text-gray-900 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60"
            style={{ fontSize: '36px' }}
          />
          {unit && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-medium text-gray-400">
              {unit}
            </span>
          )}
        </div>

        {/* 증가 버튼 */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-2xl font-bold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="증가"
        >
          +
        </button>
      </div>
    </div>
  )
}
