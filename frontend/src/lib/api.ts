import axios from 'axios'
import Cookies from 'js-cookie'
import type { ProductCreateRequest, ProductUpdateRequest, ProductListParams } from '@/types/product'
import type { LoginRequest } from '@/types/auth'
import type { OrderCreateRequest, OrderUpdateRequest, OrderListParams } from '@/types/order'
import type {
  ProductionPlanCreateRequest,
  ProductionPlanListParams,
  WorkOrderListParams,
  ResultInput,
  QcInput,
} from '@/types/production'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: JWT 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 응답 인터셉터: 401 → 로그인 페이지
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('access_token')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api

// Auth API
export const authApi = {
  login: (data: LoginRequest) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

// Product API
export const productApi = {
  getList: (params?: ProductListParams) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: ProductCreateRequest) => api.post('/products', data),
  update: (id: number, data: ProductUpdateRequest) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  exportExcel: (params?: ProductListParams) =>
    api.get('/products/export', { params, responseType: 'blob' }),
}

// BOM API
export const bomApi = {
  getList: (params?: Record<string, unknown>) => api.get('/bom', { params }),
  getById: (id: number) => api.get(`/bom/${id}`),
  create: (data: Record<string, unknown>) => api.post('/bom', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/bom/${id}`, data),
  delete: (id: number) => api.delete(`/bom/${id}`),
}

// Customer API
export const customerApi = {
  getList: (params?: Record<string, unknown>) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
}

// Dashboard API
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getKpi: () => api.get('/dashboard/kpi'),
  getRecentOrders: () => api.get('/dashboard/recent-orders'),
  getProductionStatus: () => api.get('/dashboard/production-status'),
}

// Order API
export const orderApi = {
  getList: (params?: OrderListParams) => api.get('/orders', { params }),
  getById: (id: number) => api.get(`/orders/${id}`),
  create: (data: OrderCreateRequest) => api.post('/orders', data),
  update: (id: number, data: OrderUpdateRequest) => api.put(`/orders/${id}`, data),
  confirm: (id: number) => api.post(`/orders/${id}/confirm`),
  cancel: (id: number, reason?: string) => api.post(`/orders/${id}/cancel`, { reason }),
  getHistory: (id: number) => api.get(`/orders/${id}/history`),
}

// Production Plan API
export const productionPlanApi = {
  getList: (params?: ProductionPlanListParams) => api.get('/production-plans', { params }),
  getById: (id: number) => api.get(`/production-plans/${id}`),
  create: (data: ProductionPlanCreateRequest) => api.post('/production-plans', data),
  confirm: (id: number) => api.post(`/production-plans/${id}/confirm`),
  createWorkOrders: (id: number) => api.post(`/production-plans/${id}/work-orders`),
}

// Work Order API
export const workOrderApi = {
  getList: (params?: WorkOrderListParams) => api.get('/work-orders', { params }),
  getById: (id: number) => api.get(`/work-orders/${id}`),
}

// KPI API — Sprint 3 대시보드
export const kpiApi = {
  getDashboard: () => api.get('/kpi/dashboard'),
  getProduction: (params: { date_from: string; date_to: string }) =>
    api.get('/kpi/production', { params }),
  getOrders: (params: { date_from: string; date_to: string }) =>
    api.get('/kpi/orders', { params }),
  getInventory: () => api.get('/kpi/inventory'),
}

// POP API — 현장 작업자 태블릿 전용
export const popApi = {
  getTodayWorkOrders: () =>
    api.get('/work-orders', {
      params: {
        status: 'ISSUED',
        work_date: new Date().toISOString().split('T')[0],
      },
    }),
  getWorkOrder: (id: number) => api.get(`/work-orders/${id}`),
  startWork: (id: number) => api.post(`/work-orders/${id}/start`),
  completeWork: (id: number) => api.post(`/work-orders/${id}/complete`),
  recordResult: (id: number, data: ResultInput) =>
    api.post(`/work-orders/${id}/results`, data),
  recordQc: (id: number, data: QcInput) =>
    api.post(`/work-orders/${id}/qc`, data),
}

// Inventory API
export const inventoryApi = {
  getMaterialStock: (params?: Record<string, unknown>) =>
    api.get('/inventory/material-stock', { params }),
  getMaterialStockDetail: (params?: Record<string, unknown>) =>
    api.get('/inventory/material-stock/detail', { params }),
  receiveMaterial: (data: Record<string, unknown>) =>
    api.post('/inventory/material-receive', data),
  getReceiveList: (params?: Record<string, unknown>) =>
    api.get('/inventory/material-receive', { params }),
  updateQcStatus: (id: number, data: { qc_status: string; qc_notes?: string }) =>
    api.put(`/inventory/material-receive/${id}/qc`, data),
  issueMaterial: (data: Record<string, unknown>) =>
    api.post('/inventory/material-issue', data),
  getTransactions: (params?: Record<string, unknown>) =>
    api.get('/inventory/material-transactions', { params }),
  getProductStock: (params?: Record<string, unknown>) =>
    api.get('/inventory/product-stock', { params }),
  getWarehouses: () => api.get('/inventory/warehouses'),
  getRawMaterials: () => api.get('/raw-materials'),
}

// Shipment API
export const shipmentApi = {
  getList: (params?: Record<string, unknown>) => api.get('/shipments', { params }),
  getById: (id: number) => api.get(`/shipments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/shipments', data),
  ship: (id: number) => api.post(`/shipments/${id}/ship`),
  deliver: (id: number) => api.post(`/shipments/${id}/deliver`),
}

// Equipment Extended API — Sprint 4 점검/고장 관리
export const equipmentExtApi = {
  getInspections: (equipmentId: number, params?: Record<string, unknown>) =>
    api.get(`/equipment/${equipmentId}/inspections`, { params }),
  createInspection: (equipmentId: number, data: Record<string, unknown>) =>
    api.post(`/equipment/${equipmentId}/inspections`, data),
  updateInspection: (inspectionId: number, data: Record<string, unknown>) =>
    api.put(`/equipment/inspections/${inspectionId}`, data),
  getOverdueInspections: () => api.get('/equipment/inspections/overdue'),
  getUpcomingInspections: () => api.get('/equipment/inspections/upcoming'),
  getFailures: (equipmentId: number, params?: Record<string, unknown>) =>
    api.get(`/equipment/${equipmentId}/failures`, { params }),
  createFailure: (equipmentId: number, data: Record<string, unknown>) =>
    api.post(`/equipment/${equipmentId}/failures`, data),
  resolveFailure: (failureId: number, data: Record<string, unknown>) =>
    api.post(`/equipment/failures/${failureId}/resolve`, data),
  getOpenFailures: () => api.get('/equipment/failures/open'),
  updateStatus: (equipmentId: number, data: Record<string, unknown>) =>
    api.put(`/equipment/${equipmentId}/status`, data),
}

// Cold Storage API — Sprint 4 숙성냉장관리
export const coldStorageApi = {
  getStatus: () => api.get('/cold-storage/status'),
  getTrend: (warehouseCode: string, period = '24h') =>
    api.get(`/cold-storage/${warehouseCode}/trend`, { params: { period } }),
  getAlarms: (hours = 24, warehouseCode?: string) =>
    api.get('/cold-storage/alarms', {
      params: { hours, ...(warehouseCode ? { warehouse_code: warehouseCode } : {}) },
    }),
  writeSensorData: (data: {
    warehouse_code: string
    sensor_type: string
    value: number
    unit?: string
  }) => api.post('/cold-storage/sensor-data', data),
  simulate: () => api.post('/cold-storage/simulate'),
}

// Admin API — Sprint 4 시스템관리
export const adminApi = {
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  createUser: (data: Record<string, unknown>) => api.post('/admin/users', data),
  updateUser: (id: number, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  resetPassword: (id: number) => api.post(`/admin/users/${id}/reset-password`),
  toggleUserStatus: (id: number, data: Record<string, unknown>) =>
    api.put(`/admin/users/${id}/status`, data),
  getRoles: () => api.get('/admin/roles'),
  assignRole: (userId: number, data: Record<string, unknown>) =>
    api.post(`/admin/users/${userId}/roles`, data),
  getCommonCodes: (params?: Record<string, unknown>) =>
    api.get('/admin/common-codes', { params }),
  createCommonCode: (data: Record<string, unknown>) => api.post('/admin/common-codes', data),
  updateCommonCode: (id: number, data: Record<string, unknown>) =>
    api.put(`/admin/common-codes/${id}`, data),
  deleteCommonCode: (id: number) => api.delete(`/admin/common-codes/${id}`),
  getCodeGroups: () => api.get('/admin/common-codes/groups'),
}
