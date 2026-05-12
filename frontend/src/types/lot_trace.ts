export type TraceType = 'RECEIVE' | 'PRODUCTION' | 'PROCESS' | 'SHIPMENT' | 'QC'

export interface LotTrace {
  id: number
  lot_no: string
  trace_type: TraceType
  trace_date: string
  ref_table?: string
  ref_id?: number
  product_id?: number
  raw_material_id?: number
  work_order_id?: number
  quantity?: number
  unit?: string
  warehouse_id?: number
  process_name?: string
  description?: string
  operator?: string
  created_at: string
}

export interface LotTimeline {
  lot_no: string
  timeline: LotTrace[]
  summary: {
    total_events: number
    first_event?: string
    last_event?: string
    trace_types: TraceType[]
  }
}

export interface LotTraceListParams {
  lot_no?: string
  trace_type?: TraceType
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}
