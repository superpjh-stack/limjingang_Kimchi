export type ProductType = 'kimchi' | 'side_dish' | 'sauce' | 'other'
export type SalesChannel = 'retail' | 'wholesale' | 'online' | 'export'
export type ProductStatus = 'active' | 'inactive' | 'discontinued'

export interface Product {
  id: number
  product_code: string
  product_name: string
  product_type: ProductType
  capacity_g: number
  packaging_unit: string
  sales_channel: SalesChannel
  unit_price: number
  status: ProductStatus
  description?: string
  created_at: string
  updated_at: string
}

export interface ProductCreateRequest {
  product_code: string
  product_name: string
  product_type: ProductType
  capacity_g: number
  packaging_unit: string
  sales_channel: SalesChannel
  unit_price: number
  status: ProductStatus
  description?: string
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {}

export interface ProductListParams {
  page?: number
  page_size?: number
  search?: string
  product_type?: ProductType
  sales_channel?: SalesChannel
  status?: ProductStatus
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  kimchi: '김치',
  side_dish: '반찬',
  sauce: '양념',
  other: '기타',
}

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  retail: '소매',
  wholesale: '도매',
  online: '온라인',
  export: '수출',
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  active: '판매중',
  inactive: '판매중지',
  discontinued: '단종',
}
