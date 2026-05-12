import Cookies from 'js-cookie'
import type { User } from '@/types/auth'

const TOKEN_KEY = 'access_token'
const USER_KEY = 'mes_user'

export const setToken = (token: string) => {
  Cookies.set(TOKEN_KEY, token, {
    expires: 1, // 1일
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  })
}

export const getToken = (): string | undefined => {
  return Cookies.get(TOKEN_KEY)
}

export const removeToken = () => {
  Cookies.remove(TOKEN_KEY)
}

export const setUser = (user: User) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null
  const userData = sessionStorage.getItem(USER_KEY)
  if (!userData) return null
  try {
    return JSON.parse(userData) as User
  } catch {
    return null
  }
}

export const removeUser = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_KEY)
  }
}

export const isAuthenticated = (): boolean => {
  return !!getToken()
}

export const logout = () => {
  removeToken()
  removeUser()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}
