export interface DashboardSummary {
  today_work_orders: { total: number; in_progress: number; completed: number }
  this_month_orders: { count: number; amount: number }
  inventory_alerts: {
    count: number
    items: { material_name: string; current_qty: number; unit: string }[]
  }
  recent_defects: {
    lot_no: string
    process_name: string
    defect_qty: number
    recorded_at: string
  }[]
}

export interface ProductionKpi {
  total_planned: number
  total_actual: number
  total_defect: number
  achievement_rate: number
  defect_rate: number
  avg_hourly_production: number
  daily_trend: { date: string; planned: number; actual: number; defect: number }[]
}

export interface OrderKpi {
  total_orders: number
  total_amount: number
  by_status: Record<string, number>
  monthly_trend: { month: string; count: number; amount: number }[]
}

export interface InventoryKpi {
  material_stock_total: number
  product_stock_total: number
  low_stock_items: { material_name: string; current_qty: number; unit: string }[]
  expiry_warning_items: { material_name: string; expiry_date: string; qty: number }[]
}
