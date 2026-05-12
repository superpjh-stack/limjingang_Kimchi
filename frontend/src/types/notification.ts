export type NotificationType = 'STOCK_LOW' | 'CCP_VIOLATION' | 'EQUIPMENT_FAILURE' | 'DELIVERY_RISK' | 'SYSTEM'
export type NotificationSeverity = 'INFO' | 'WARNING' | 'DANGER'

export interface Notification {
  id: number
  notification_type: NotificationType
  severity: NotificationSeverity
  title: string
  message?: string
  ref_table?: string
  ref_id?: number
  is_read: boolean
  read_at?: string
  created_at: string
}

export interface NotificationCount {
  unread_count: number
  total_count: number
  danger_count: number
  warning_count: number
}
