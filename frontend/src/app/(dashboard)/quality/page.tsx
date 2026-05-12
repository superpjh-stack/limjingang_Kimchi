'use client'

import React, { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import QcRecordList from '@/components/features/quality/QcRecordList'
import MaterialQcApproval from '@/components/features/quality/MaterialQcApproval'

type Tab = 'qc-records' | 'receive-approval'

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('receive-approval')

  const tabs = [
    { key: 'receive-approval' as Tab, label: '입고검사 승인' },
    { key: 'qc-records' as Tab, label: '공정 QC 기록' },
  ]

  return (
    <div>
      <PageHeader
        title="품질검사 현황"
        subtitle="입고검사 승인 처리 및 공정별 품질 검사 기록을 관리합니다."
        breadcrumbs={[{ label: '품질관리' }]}
      />

      {/* 탭 */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'receive-approval' && <MaterialQcApproval />}
      {activeTab === 'qc-records' && <QcRecordList />}
    </div>
  )
}
