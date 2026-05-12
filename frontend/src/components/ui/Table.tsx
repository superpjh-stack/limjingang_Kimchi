'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import type { Column } from '@/types/common'

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyText?: string
  onRowClick?: (record: T) => void
  rowKey?: keyof T | ((record: T) => string | number)
  className?: string
}

function Table<T extends object>({
  columns,
  data,
  loading = false,
  emptyText = '데이터가 없습니다.',
  onRowClick,
  rowKey = 'id' as keyof T,
  className,
}: TableProps<T>) {
  const getRowKey = (record: T, index: number): string | number => {
    if (typeof rowKey === 'function') return rowKey(record)
    return (record[rowKey] as string | number) ?? index
  }

  const getCellValue = (record: T, column: Column<T>): React.ReactNode => {
    if (column.render) {
      const value = typeof column.key === 'string' ? record[column.key as keyof T] : undefined
      return column.render(value, record)
    }
    const value = record[column.key as keyof T]
    if (value === null || value === undefined) return '-'
    return String(value)
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                scope="col"
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  (!col.align || col.align === 'left') && 'text-left'
                )}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-3 text-gray-500">
                  <svg
                    className="h-5 w-5 animate-spin text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm">데이터를 불러오는 중...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <svg
                    className="h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((record, index) => (
              <tr
                key={getRowKey(record, index)}
                className={cn(
                  'transition-colors hover:bg-gray-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(record)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-sm text-gray-700',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      (!col.align || col.align === 'left') && 'text-left'
                    )}
                  >
                    {getCellValue(record, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table

// Pagination 컴포넌트
interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(1, currentPage - 2)
    return start + i
  }).filter((p) => p <= totalPages)

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-sm text-gray-600">
        전체 <span className="font-medium">{totalItems}</span>건 중{' '}
        <span className="font-medium">{startItem}</span>-
        <span className="font-medium">{endItem}</span>번째
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &laquo;
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &lsaquo;
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'rounded px-3 py-1 text-sm font-medium transition-colors',
              page === currentPage
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &rsaquo;
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &raquo;
        </button>
      </div>
    </div>
  )
}
