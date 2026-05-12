export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface User {
  id: number
  username: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer'

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
