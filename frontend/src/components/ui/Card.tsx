import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'primary' | 'success' | 'danger' | 'warning'
}

const colorClasses = {
  primary: 'bg-primary-50 text-primary',
  success: 'bg-success-50 text-success',
  danger: 'bg-danger-50 text-danger',
  warning: 'bg-warning-50 text-yellow-600',
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span
                className={cn(
                  'font-medium',
                  trend.value >= 0 ? 'text-success' : 'text-danger'
                )}
              >
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-lg p-2.5', colorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
