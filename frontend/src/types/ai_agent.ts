// Sprint 5 — AI Agent 대시보드 타입 정의

export interface ProductionForecast {
  tomorrow_forecast: number
  this_week_total: number
  confidence: 'HIGH' | 'LOW'
  basis_days: number
  daily_avg: number
  trend: 'UP' | 'DOWN' | 'STABLE'
}

export interface MaterialReorder {
  material_id: number
  material_name: string
  material_code: string
  current_stock: number
  required_qty: number
  shortage_qty: number
  unit: string
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  recommended_order_qty: number
  related_plans: { plan_no: string; planned_qty: number }[]
}

export interface EquipmentAlert {
  equipment_id: number
  equipment_name: string
  alert_type: 'MAINTENANCE_DUE' | 'REPEAT_FAILURE'
  alert_level: 'WARNING' | 'CRITICAL'
  days_until_maintenance?: number | null
  failure_count_30d?: number | null
  recommendation: string
}

export interface DefectTrend {
  current_defect_rate: number
  target_defect_rate: number
  status: 'GOOD' | 'WARNING' | 'DANGER'
  trend: 'IMPROVING' | 'WORSENING' | 'STABLE'
  daily_trend: { date: string; defect_rate: number }[]
  by_process: { process_name: string; defect_rate: number }[]
}

export interface DeliveryRisk {
  order_id: number
  order_no: string
  customer_name: string
  delivery_date: string
  days_remaining: number
  status: string
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  has_production_plan: boolean
  recommendation: string
}

export interface AIDashboard {
  production_forecast: ProductionForecast
  material_alerts: MaterialReorder[]
  equipment_alerts: EquipmentAlert[]
  defect_trend: DefectTrend
  delivery_risks: DeliveryRisk[]
  generated_at: string
  total_alert_count: number
}
