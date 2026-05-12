export interface PaginationParams {
  page?: number
  page_size?: number
  search?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export type Status = 'active' | 'inactive'

export interface SelectOption {
  label: string
  value: string | number
}

export interface Column<T> {
  key: keyof T | string
  title: string
  render?: (value: unknown, record: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}
