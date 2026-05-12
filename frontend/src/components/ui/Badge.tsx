import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-primary-50 text-primary-700 ring-primary-200',
  success: 'bg-success-50 text-success-700 ring-success-200',
  danger: 'bg-danger-50 text-danger-700 ring-danger-200',
  warning: 'bg-warning-50 text-yellow-800 ring-warning-200',
  secondary: 'bg-blue-50 text-blue-700 ring-blue-200',
  gray: 'bg-gray-100 text-gray-700 ring-gray-200',
}

const dotClasses: Record<BadgeVariant, string> = {
  primary: 'fill-primary',
  success: 'fill-success',
  danger: 'fill-danger',
  warning: 'fill-warning',
  secondary: 'fill-blue-500',
  gray: 'fill-gray-500',
}

export default function Badge({ variant = 'gray', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <svg className={cn('h-1.5 w-1.5', dotClasses[variant])} viewBox="0 0 6 6" aria-hidden="true">
          <circle cx="3" cy="3" r="3" />
        </svg>
      )}
      {children}
    </span>
  )
}
