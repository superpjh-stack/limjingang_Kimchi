export type TransType = 'IN' | 'OUT' | 'ADJUST' | 'RETURN'
export type QcStatus = 'PENDING' | 'PASS' | 'FAIL' | 'SKIP'
export type ShipmentStatus = 'READY' | 'SHIPPED' | 'DELIVERED' | 'RETURNED'

export interface MaterialStock {
  id: number
  raw_material_id: number
  raw_material_name: string
  raw_material_code: string
  warehouse_id: number
  warehouse_name: string
  lot_no?: string
  current_qty: number
  unit: string
  unit_price?: number
  receive_date?: string
  expiry_date?: string
  supplier?: string
}

export interface MaterialStockSummary {
  raw_material_id: number
  raw_material_name: string
  raw_material_code: string
  total_qty: number
  unit: string
  warehouse_breakdown: { warehouse_name: string; qty: number }[]
  low_stock: boolean
  expiry_warning: boolean
}

export interface MaterialReceive {
  id: number
  receive_no: string
  raw_material_id: number
  raw_material_name: string
  warehouse_id: number
  warehouse_name: string
  receive_date: string
  receive_qty: number
  unit_price?: number
  amount?: number
  lot_no?: string
  supplier?: string
  expiry_date?: string
  qc_status: QcStatus
  qc_notes?: string
  created_at: string
}

export interface MaterialReceiveCreate {
  raw_material_id: number
  warehouse_id: number
  receive_date: string
  receive_qty: number
  unit_price?: number
  lot_no?: string
  supplier?: string
  expiry_date?: string
  notes?: string
}

export interface MaterialTransaction {
  id: number
  raw_material_id: number
  raw_material_name: string
  warehouse_name: string
  trans_type: TransType
  trans_date: string
  trans_qty: number
  before_qty: number
  after_qty: number
  lot_no?: string
  reason?: string
  created_at: string
}

export interface ProductStock {
  id: number
  product_id: number
  product_name: string
  product_code: string
  warehouse_id: number
  warehouse_name: string
  lot_no?: string
  current_qty: number
  production_date?: string
  expiry_date?: string
}

export interface ShipmentDetail {
  product_id: number
  product_name?: string
  lot_no?: string
  ship_qty: number
  unit_price?: number
  amount?: number
  expiry_date?: string
}

export interface Shipment {
  id: number
  shipment_no: string
  order_id?: number
  order_no?: string
  customer_id: number
  customer_name: string
  shipment_date: string
  status: ShipmentStatus
  delivery_address?: string
  driver_name?: string
  vehicle_no?: string
  total_qty?: number
  total_amount?: number
  shipped_at?: string
  delivered_at?: string
  details: ShipmentDetail[]
}

export interface Warehouse {
  id: number
  name: string
  code?: string
  location?: string
}

export interface RawMaterial {
  id: number
  name: string
  code: string
  unit: string
}
