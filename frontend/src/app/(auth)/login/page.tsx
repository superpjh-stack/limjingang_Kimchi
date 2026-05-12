'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline'
import { authApi } from '@/lib/api'
import { setToken, setUser } from '@/lib/auth'
import type { LoginResponse } from '@/types/auth'

const loginSchema = z.object({
  username: z.string().min(1, '아이디를 입력하세요'),
  password: z.string().min(1, '비밀번호를 입력하세요').min(4, '비밀번호는 4자 이상이어야 합니다'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await authApi.login(data)
      const result = res.data as LoginResponse

      setToken(result.access_token)
      if (result.user) {
        setUser(result.user)
      }

      toast.success('로그인되었습니다.')
      router.push('/dashboard')
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast.error('아이디 또는 비밀번호가 올바르지 않습니다.')
      } else {
        toast.error('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sidebar-bg to-primary-700 p-4">
      <div className="w-full max-w-sm">
        {/* 로고 카드 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
            <span className="text-3xl font-black text-white">K</span>
          </div>
          <h1 className="text-2xl font-bold text-white">임진강김치</h1>
          <p className="mt-1 text-sm text-white/70">Manufacturing Execution System</p>
        </div>

        {/* 로그인 폼 */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-center text-lg font-semibold text-gray-800">로그인</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* 아이디 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                아이디
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="아이디를 입력하세요"
                  className={`block w-full rounded-lg border px-3 py-2.5 pl-9 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 transition-colors
                    ${errors.username
                      ? 'border-danger focus:border-danger focus:ring-danger/20'
                      : 'border-gray-300 focus:border-primary focus:ring-primary-200'
                    }`}
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-xs text-danger">{errors.username.message}</p>
              )}
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <LockClosedIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="비밀번호를 입력하세요"
                  className={`block w-full rounded-lg border px-3 py-2.5 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 transition-colors
                    ${errors.password
                      ? 'border-danger focus:border-danger focus:ring-danger/20'
                      : 'border-gray-300 focus:border-primary focus:ring-primary-200'
                    }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-danger">{errors.password.message}</p>
              )}
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white
                hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-1
                disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          &copy; {new Date().getFullYear()} 임진강김치(주). All rights reserved.
        </p>
      </div>
    </div>
  )
}
