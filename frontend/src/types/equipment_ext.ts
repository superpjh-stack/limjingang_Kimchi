export type InspectionType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL' | 'EMERGENCY'
export type InspectionStatus = 'SCHEDULED' | 'COMPLETED' | 'SKIPPED' | 'OVERDUE'
export type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL'
export type FailureStatus = 'OPEN' | 'IN_REPAIR' | 'RESOLVED' | 'DEFERRED'
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type EquipmentStatus = 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'BREAKDOWN'

export interface EquipmentInspection {
  id: number
  equipment_id: number
  equipment_name: string
  equipment_code: string
  inspection_type: InspectionType
  scheduled_date: string
  actual_date?: string
  inspector?: string
  status: InspectionStatus
  result?: InspectionResult
  findings?: string
  actions_taken?: string
  next_scheduled_date?: string
}

export interface EquipmentFailure {
  id: number
  equipment_id: number
  equipment_name: string
  failure_no: string
  failure_date: string
  failure_type?: string
  symptoms: string
  cause?: string
  impact_level: ImpactLevel
  status: FailureStatus
  resolved_date?: string
  repair_notes?: string
  downtime_hours?: number
  repaired_by?: string
}

export interface Equipment {
  id: number
  name: string
  code: string
  status: EquipmentStatus
  throughput_per_hour?: number
  next_inspection_date?: string
  open_failure_count: number
  location?: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  username: string
  roles: string[]
  is_active: boolean
  last_login?: string
  created_at: string
}

export interface Role {
  id: number
  name: string
  description?: string
}

export interface CommonCode {
  id: number
  group_code: string
  group_name: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  description?: string
}

export interface CommonCodeGroup {
  group_code: string
  group_name: string
  count: number
}
