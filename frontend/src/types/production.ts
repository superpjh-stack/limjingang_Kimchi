export type PlanStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type WorkOrderStatus = 'ISSUED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type PlanType = 'DAILY' | 'WEEKLY'

export interface ProductionPlan {
  id: number
  plan_no: string
  plan_date: string
  order_id?: number
  order_no?: string
  product_id: number
  product_name: string
  bom_id?: number
  planned_qty: number
  actual_qty: number
  status: PlanStatus
  plan_type: PlanType
  start_datetime?: string
  end_datetime?: string
  remark?: string
  created_at: string
}

export interface ProductionPlanCreateRequest {
  plan_date: string
  order_id?: number
  product_id: number
  bom_id?: number
  planned_qty: number
  plan_type: PlanType
  start_datetime?: string
  end_datetime?: string
  remark?: string
}

export interface WorkOrder {
  id: number
  work_order_no: string
  production_plan_id: number
  product_id: number
  product_name: string
  process_id?: number
  process_name?: string
  equipment_id?: number
  equipment_name?: string
  assigned_user_id?: number
  assigned_user_name?: string
  work_date: string
  planned_qty: number
  actual_qty: number
  defect_qty: number
  status: WorkOrderStatus
  lot_no?: string
  start_datetime?: string
  end_datetime?: string
}

export interface ProductionPlanListParams {
  status?: PlanStatus
  date_from?: string
  date_to?: string
  product_id?: number
  page?: number
  limit?: number
}

export interface WorkOrderListParams {
  status?: WorkOrderStatus
  date_from?: string
  date_to?: string
  production_plan_id?: number
  page?: number
  limit?: number
}

// POP 실적 입력
export interface ResultInput {
  actual_qty: number
  defect_qty?: number
  defect_reason?: string
  notes?: string
}

// POP QC 기록
export interface QcInput {
  process_id: number
  lot_no: string
  measured_value: number
  unit: string
  is_pass: boolean
  action_taken?: string
}
