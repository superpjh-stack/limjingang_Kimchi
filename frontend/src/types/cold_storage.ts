// 냉장창고 모니터링 타입 정의 — Sprint 4 숙성냉장관리

export type AlarmLevel = 'NORMAL' | 'WARNING' | 'DANGER'
export type WarehouseType = 'COLD' | 'FREEZE'

export interface WarehouseStatus {
  warehouse_code: string
  warehouse_name: string
  warehouse_type: WarehouseType
  current_temperature: number | null
  current_humidity: number | null
  last_updated: string | null
  alarm_level: AlarmLevel | null
  threshold_min: number
  threshold_max: number
  is_normal: boolean
}

export interface TrendPoint {
  time: string
  temperature: number | null
  humidity: number | null
}

export interface TrendResponse {
  warehouse_code: string
  period: string
  data: TrendPoint[]
}

export interface AlarmRecord {
  warehouse_code: string
  alarm_level: AlarmLevel
  value: number
  threshold_min: number
  threshold_max: number
  message: string
  occurred_at: string
}

export type TrendPeriod = '1h' | '6h' | '24h' | '7d'

export const PERIOD_LABELS: Record<TrendPeriod, string> = {
  '1h': '1시간',
  '6h': '6시간',
  '24h': '24시간',
  '7d': '7일',
}

export const ALARM_LEVEL_LABELS: Record<string, string> = {
  WARNING: '경고',
  DANGER: '위험',
}
