'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { coldStorageApi } from '@/lib/api'
import type { WarehouseStatus, AlarmRecord } from '@/types/cold_storage'
import WarehouseStatusCard from '@/components/features/cold-storage/WarehouseStatusCard'
import TemperatureChart from '@/components/features/cold-storage/TemperatureChart'
import AlarmHistoryTable from '@/components/features/cold-storage/AlarmHistoryTable'

export default function ColdStoragePage() {
  const queryClient = useQueryClient()
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('COLD_01')

  // 전체 창고 상태 조회 (30초 자동 갱신)
  const {
    data: statusList = [],
    isLoading: statusLoading,
  } = useQuery<WarehouseStatus[]>({
    queryKey: ['cold-storage-status'],
    queryFn: async () => {
      const res = await coldStorageApi.getStatus()
      return res.data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  // 알람 이력 조회 (30초 자동 갱신)
  const {
    data: alarmList = [],
    isLoading: alarmLoading,
  } = useQuery<AlarmRecord[]>({
    queryKey: ['cold-storage-alarms'],
    queryFn: async () => {
      const res = await coldStorageApi.getAlarms(24)
      return res.data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  // 더미 데이터 생성 mutation
  const simulateMutation = useMutation({
    mutationFn: () => coldStorageApi.simulate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cold-storage-status'] })
      queryClient.invalidateQueries({ queryKey: ['cold-storage-alarms'] })
      queryClient.invalidateQueries({ queryKey: ['cold-storage-trend'] })
    },
  })

  const selectedWarehouseData = statusList.find(
    (w) => w.warehouse_code === selectedWarehouse
  )

  return (
    <div className="space-y-6 p-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">숙성냉장관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            HACCP CCP 냉장창고 온도·습도 실시간 모니터링
          </p>
        </div>
        <button
          type="button"
          onClick={() => simulateMutation.mutate()}
          disabled={simulateMutation.isPending}
          className={[
            'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
            simulateMutation.isPending
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
          ].join(' ')}
        >
          {simulateMutation.isPending ? '생성 중...' : '더미 데이터 생성 (개발용)'}
        </button>
      </div>

      {/* 알람 배너 — DANGER 창고가 있을 때만 표시 */}
      {statusList.some((w) => w.alarm_level === 'DANGER') && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-300 px-4 py-3">
          <span className="text-red-500 font-bold text-lg" aria-hidden="true">!</span>
          <p className="text-sm font-medium text-red-700">
            위험 온도 이탈 창고가 있습니다. 즉시 확인하세요.
          </p>
        </div>
      )}

      {/* 창고 상태 카드 그리드 (2×2) */}
      {statusLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {statusList.map((warehouse) => (
            <WarehouseStatusCard
              key={warehouse.warehouse_code}
              warehouse={warehouse}
              selected={selectedWarehouse === warehouse.warehouse_code}
              onClick={() => setSelectedWarehouse(warehouse.warehouse_code)}
            />
          ))}
        </div>
      )}

      {/* 온도 추이 차트 */}
      {selectedWarehouseData && (
        <TemperatureChart
          warehouseCode={selectedWarehouse}
          thresholdMin={selectedWarehouseData.threshold_min}
          thresholdMax={selectedWarehouseData.threshold_max}
        />
      )}

      {/* 알람 이력 테이블 */}
      <AlarmHistoryTable alarms={alarmList} isLoading={alarmLoading} />
    </div>
  )
}
