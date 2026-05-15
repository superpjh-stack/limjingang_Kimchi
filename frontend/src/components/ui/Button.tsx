'use client'

import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary:   'btn btn-brand',
  secondary: 'btn',
  danger:    'btn',
  ghost:     'btn',
  outline:   'btn',
}

const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary:   {},
  secondary: {},
  danger:    { background: 'var(--danger)', color: '#fff', borderColor: 'transparent' },
  ghost:     { background: 'transparent', borderColor: 'transparent', color: 'var(--muted)' },
  outline:   { background: 'var(--brand-50)', color: 'var(--brand)', borderColor: 'var(--brand-100)' },
}

const sizeStyle: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '4px 10px', fontSize: '11.5px' },
  md: {},
  lg: { padding: '9px 18px', fontSize: '14px' },
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${variantClass[variant]}${className ? ' ' + className : ''}`}
      style={{ ...variantStyle[variant], ...sizeStyle[size], ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>
        </svg>
      ) : (
        icon && <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      )}
      {children}
    </button>
  )
}
