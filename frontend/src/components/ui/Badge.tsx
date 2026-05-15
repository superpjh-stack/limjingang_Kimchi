import React from 'react'

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'gray'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantMap: Record<BadgeVariant, string> = {
  primary:   'brand',
  success:   'ok',
  danger:    'danger',
  warning:   'warn',
  secondary: 'info',
  gray:      'muted',
}

export default function Badge({ variant = 'gray', children, className, dot }: BadgeProps) {
  return (
    <span className={`badge ${variantMap[variant]}${className ? ' ' + className : ''}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}
