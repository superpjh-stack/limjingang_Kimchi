export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PRODUCTION' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED'
export type OrderType = 'HOMESHOPPING' | 'GENERAL'

export interface OrderDetail {
  id: number
  order_id: number
  product_id: number
  product_name: string
  order_qty: number
  unit_price: number
  amount: number
  delivery_date: string
  status: string
  shipped_qty: number
  notes?: string
}

export interface Order {
  id: number
  order_no: string
  customer_id: number
  customer_name: string
  order_date: string
  delivery_date: string
  order_type: OrderType
  status: OrderStatus
  total_qty: number
  total_amount: number
  delivery_address?: string
  remark?: string
  confirmed_at?: string
  confirmed_by?: string
  details: OrderDetail[]
  created_at: string
}

export interface OrderCreateRequest {
  customer_id: number
  order_date: string
  delivery_date: string
  order_type: OrderType
  delivery_address?: string
  remark?: string
  details: {
    product_id: number
    order_qty: number
    unit_price?: number
    delivery_date?: string
    notes?: string
  }[]
}

export interface OrderUpdateRequest extends Partial<OrderCreateRequest> {}

export interface OrderHistoryEntry {
  id: number
  order_id: number
  action: string
  changed_by: string
  changed_at: string
  before_status?: OrderStatus
  after_status?: OrderStatus
  note?: string
}

export interface OrderListParams {
  status?: OrderStatus
  customer_name?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}
