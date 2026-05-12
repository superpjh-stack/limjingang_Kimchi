export type ReportPeriod = 'daily' | 'weekly' | 'monthly'

export interface ProductionReportRow {
  product_name: string
  planned_qty: number
  actual_qty: number
  defect_qty: number
  achievement_rate: number
  defect_rate: number
}

export interface ProductionReport {
  period: string
  date_from: string
  date_to: string
  total_planned: number
  total_actual: number
  total_defect: number
  overall_achievement: number
  overall_defect_rate: number
  by_product: ProductionReportRow[]
  ccp_violations: number
  equipment_downtime_minutes: number
}
