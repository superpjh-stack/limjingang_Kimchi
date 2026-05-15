import React from 'react'
import Link from 'next/link'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
  className?: string
}

function ChevronRight() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6"/>
    </svg>
  )
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={`page-header${className ? ' ' + className : ''}`}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span style={{ color: 'var(--muted-2)' }}>
                    <ChevronRight />
                  </span>
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    style={{
                      fontSize: 11.5,
                      color: i === breadcrumbs.length - 1 ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                      textDecoration: 'none',
                    }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    style={{
                      fontSize: 11.5,
                      color: i === breadcrumbs.length - 1 ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                    }}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-desc">{subtitle}</p>}
      </div>
      {actions && (
        <div className="row" style={{ gap: 8 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
