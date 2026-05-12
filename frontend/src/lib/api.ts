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
