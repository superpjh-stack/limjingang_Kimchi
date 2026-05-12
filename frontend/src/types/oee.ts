export interface OeeRecord {
  id: number
  equipment_id: number
  equipment_name?: string
  record_date: string
  planned_time: number
  downtime: number
  actual_time: number
  total_count: number
  good_count: number
  defect_count: number
  availability?: number
  performance?: number
  quality?: number
  oee?: number
  notes?: string
}

export interface OeeDashboard {
  summary: {
    avg_oee: number
    equipment_count: number
    target_oee: number  // 85.0
    above_target_count: number
  }
  equipment_oee: Array<{
    equipment_id: number
    equipment_name: string
    oee: number
    availability: number
    performance: number
    quality: number
    record_date: string
  }>
  trend: Array<{
    date: string
    avg_oee: number
  }>
}
