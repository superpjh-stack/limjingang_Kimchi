# 포장 공정 관리자 대시보드 UI 설계서

**프로젝트:** 임진강김치(주) MES  
**문서 유형:** Phase 3 Mockup — UI 와이어프레임 및 컴포넌트 명세  
**작성일:** 2026-05-13  
**대상 화면:** `/dashboard/packaging` (포장 공정 관리자 대시보드)

---

## 1. POP 포장 화면 분석

### 1.1 파일 위치

`frontend/src/app/(pop)/pop/[id]/packaging/page.tsx`  
`frontend/src/components/pop/process/PackagingRecordForm.tsx`

### 1.2 구조 및 역할

POP 포장 화면은 **현장 작업자용 단일 작업지시 처리 인터페이스**다. 하나의 `work_order_id`에 귀속된 뷰로, 태블릿에서 터치 입력을 전제로 설계되어 있다.

**화면 구성 흐름:**
1. 작업지시 기본 정보 카드 (LOT번호, 제품명, 지시수량, 작업일)
2. `StatusDisplay` — 현재 상태 + 진행률 바
3. 탭 영역 — "작업실적" / "포장기록" 전환
4. 하단 고정 액션 버튼 — 작업 시작 / 작업 완료 / 목록으로

**PackagingRecordForm 주요 필드:**

| 필드 | 타입 | 특이사항 |
|------|------|----------|
| `target_weight` | number (g) | 목표포장중량 |
| `actual_avg_weight` | number (g) | 실측평균중량 |
| `total_qty` | number (개) | 총 포장수량 |
| `defect_qty` | number (개) | 불량수량 |
| `metal_detect` | PASS/FAIL | CCP 필수 항목 — FAIL 시 전화면 빨간 오버레이 |
| `sealing_state` | GOOD/POOR/FAIL | 실링상태 3단계 |
| `label_attached` | boolean | 라벨부착 완료 여부 |
| `expiry_date` | date | 유통기한 |
| `lot_no` | string | LOT번호 |

**자동 계산 항목:**
- 중량 편차(%) = `(actual_avg_weight - target_weight) / target_weight * 100` — ±3% 이내 초록, 초과 빨강
- 불량률(%) = `defect_qty / total_qty * 100` — 1.3% 이하 초록, 초과 빨강

**CCP 처리 로직:**
- `metal_detect === 'FAIL'` 시 저장 버튼 비활성화
- 폼 제출 시도 시 전화면 빨간 오버레이 + "즉시 라인 중단" 경고

---

## 2. POP vs Dashboard 비교표

| 항목 | POP 화면 | Dashboard 화면 |
|------|----------|----------------|
| 대상 사용자 | 현장 작업자 | 포장 공정 관리자/반장 |
| 입력 방식 | 터치 (태블릿) | 마우스/키보드 (PC 모니터) |
| 작업 단위 | 단일 작업지시 1건 | 당일 전체 배치 조망 |
| 데이터 방향 | 입력(쓰기) 중심 | 조회(읽기) + 상태 변경 |
| 레이아웃 | 세로 단일 컬럼, 버튼 크게 | 그리드 레이아웃, 정보 밀도 높음 |
| 불량 표시 | 실시간 자동계산 인라인 | 불량률 높은 배치 빨간 행 하이라이트 |
| 출하 연계 | 없음 (작업 완료 처리만) | 포장 완료 → 출하 준비 전환 버튼 |
| 새로고침 | 30초 자동 refetch | 수동 필터 + 날짜 범위 |
| 차트 | 없음 | 포장규격별 실적 + 시간대별 생산량 |
| CCP 경고 | 전화면 오버레이 | 배치 상태 배지 + 관리자 알림 |

---

## 3. ASCII 와이어프레임

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Sidebar]  포장 공정 관리  /  생산관리 > 포장 공정            [Header]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [PageHeader: 포장 공정 관리]                                            │
│  포장 배치 현황 및 규격별 실적을 관리합니다.        [출하 준비 전환] ▶  │
│                                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ 오늘 포장    │ │ 진행중 배치  │ │ 불량률       │ │ 시간당 포장  │   │
│  │ 완료량       │ │              │ │              │ │ 속도         │   │
│  │ [cyan border]│ │ [cyan border]│ │[red/green]   │ │ [amber]      │   │
│  │  4,820 kg    │ │    12 배치   │ │  1.1 %       │ │  680 kg/h    │   │
│  │  목표 5,000  │ │  완료 8건    │ │  목표 ≤1.3%  │ │  목표 700    │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  [날짜 필터: 2026-05-13 ~]  [포장규격 탭]  [상태 필터: 전체 ▼]   │ │
│  │                                                                    │ │
│  │  포장규격 탭: [ 전체 ] [ 봉지류 ] [ 용기류 ] [ 업소용 ]           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  포장 배치 테이블                                                  │ │
│  │  ──────────────────────────────────────────────────────────────── │ │
│  │  LOT번호    제품명          규격    목표  완료  불량  담당자  완료율  상태│ │
│  │  ──────────────────────────────────────────────────────────────── │ │
│  │  LOT-0501  배추김치 봉지   500g   2000  1850   12   김철수  [███░] RUNNING│ │
│  │  LOT-0502  총각김치 용기   2kg    500    500    3   이영희  [████] DONE  │ │
│  │  LOT-0503  깍두기 업소용   15kg   200    180    8   박민준  [███░] !! 불량│ │  <- 빨간 행
│  │  LOT-0504  열무김치 봉지   1kg    1000     0    0   김지수  [░░░░] ISSUED│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────┐ ┌──────────────────────────────────┐   │
│  │  포장규격별 실적 차트       │ │  시간대별 생산량 차트            │   │
│  │  (BarChart - recharts)      │ │  (LineChart - recharts)          │   │
│  │                             │ │                                  │   │
│  │  봉지250g ████ 320kg        │ │  08시 ─────                      │   │
│  │  봉지500g ████████ 920kg    │ │  09시 ──────────                 │   │
│  │  봉지1kg  ██████ 600kg      │ │  10시 ─────────────── (목표선)  │   │
│  │  봉지2kg  ████ 480kg        │ │  11시 ──────────                 │   │
│  │  용기2kg  ███ 340kg         │ │  12시 ─────                      │   │
│  │  용기5kg  ██ 250kg          │ │                                  │   │
│  │  ...                        │ │  --- 목표 700kg/h                │   │
│  └─────────────────────────────┘ └──────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  출하 준비 완료 목록                              [출하 등록 →]   │ │
│  │  ──────────────────────────────────────────────────────────────── │ │
│  │  LOT번호    제품명          규격    수량    완료시각    액션        │ │
│  │  ──────────────────────────────────────────────────────────────── │ │
│  │  LOT-0502  총각김치 용기   2kg     500개   11:23      [출하 준비] │ │
│  │  LOT-0499  배추김치 봉지   1kg    1200개   10:47      [출하 준비] │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 컴포넌트 명세

### 4a. 요약 카드 (SummaryCards)

4개 카드, 2×2 그리드 (md: 4열). 기존 KPI 대시보드의 `TodaySummaryCards` 패턴 동일하게 적용.

#### 카드 1 — 오늘 포장 완료량

```
상단 3px 강조선 색상: #0891B2 (파 블루시안)
아이콘: Package (Lucide) — cyan-600
제목: "오늘 포장 완료량"
주요 값: 4,820 kg
보조: 목표 5,000 kg / 달성률 96.4%
Progress bar: bg-cyan-200, fill bg-cyan-500
```

#### 카드 2 — 포장 배치 수

```
상단 강조선: #0891B2 (파)
아이콘: ClipboardList — cyan-600
제목: "포장 배치 수"
주요 값: 20 배치
보조: 진행중 12 / 완료 8
뱃지: "진행중 12" — cyan bg
```

#### 카드 3 — 불량률

```
상단 강조선: 조건부
  - 불량률 ≤ 1.3%: #16A34A (green-600)
  - 불량률 > 1.3%: #DC2626 (red-600)
아이콘: AlertTriangle — 조건부 색
제목: "불량률"
주요 값: 1.1 % (큰 글씨, 조건부 색)
보조: 목표 ≤ 1.3% / 오늘 총 불량 23개
트렌드 화살표: 전일 대비 ↑↓
```

#### 카드 4 — 시간당 포장량

```
상단 강조선: #D97706 (amber-600)
아이콘: Zap — amber-600
제목: "시간당 포장량"
주요 값: 680 kg/h
보조: 목표 700 kg/h
게이지 바: bg-amber-200, fill bg-amber-500
달성률 텍스트: "97.1%"
```

**Props 인터페이스:**

```typescript
interface PackagingSummaryData {
  completedKg: number
  targetKg: number
  totalBatches: number
  runningBatches: number
  doneBatches: number
  defectRate: number        // % 소수점 1자리
  defectCount: number
  defectRateYesterday: number
  kgPerHour: number
  kgPerHourTarget: number   // 700
}
```

---

### 4b. 포장 배치 테이블 (PackagingBatchTable)

#### 컬럼 정의

| # | 컬럼명 | 너비 | 정렬 | 비고 |
|---|--------|------|------|------|
| 1 | LOT번호 | 140px | 좌 | font-mono, 클릭 시 LOT 추적 페이지로 이동 |
| 2 | 제품명 | auto | 좌 | 최대 180px, 넘치면 ellipsis |
| 3 | 포장규격 | 90px | 중앙 | 배지 형태 (봉지/용기/업소용 색상) |
| 4 | 목표수량 | 80px | 우 | 단위 "개" |
| 5 | 완료수량 | 80px | 우 | 단위 "개" |
| 6 | 불량수량 | 80px | 우 | 단위 "개", 불량률 > 1.3% 시 빨강 |
| 7 | 담당자 | 80px | 중앙 | |
| 8 | 완료율 | 120px | - | Progress bar 인라인 + % 텍스트 |
| 9 | 상태 | 100px | 중앙 | StatusBadge |

#### 행 하이라이트 조건

```typescript
// 불량률 > 1.3%인 배치: 빨간 행
const isHighDefect = (batch: PackagingBatch) =>
  batch.total_qty > 0 && (batch.defect_qty / batch.total_qty) * 100 > 1.3

// 적용 클래스
const rowClass = isHighDefect(batch)
  ? 'bg-red-50 border-l-4 border-l-red-500'
  : 'hover:bg-gray-50'
```

#### Props 인터페이스

```typescript
interface PackagingBatch {
  id: number
  lot_no: string
  product_name: string
  package_spec: string      // '봉지250g' | '봉지500g' | '봉지1kg' | '봉지2kg' | '용기2kg' | '용기5kg' | '용기10kg' | '업소15kg' | '업소20kg'
  package_category: 'POUCH' | 'CONTAINER' | 'COMMERCIAL'
  target_qty: number
  completed_qty: number
  defect_qty: number
  operator_name: string
  status: 'ISSUED' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_TO_SHIP'
  started_at: string | null
  completed_at: string | null
}
```

---

### 4c. 포장규격 필터 탭 (PackageSpecFilterTab)

```
[ 전체 ]  [ 봉지류 ]  [ 용기류 ]  [ 업소용 ]
  ↑활성탭: border-b-2 border-primary bg-white text-primary font-bold
  비활성: text-gray-500 hover:text-gray-700
```

각 탭에 해당 규격의 배치 수 배지 표시:

```
[ 봉지류  12 ]  [ 용기류  5 ]  [ 업소용  3 ]
                  ↑ bg-cyan-100 text-cyan-700 rounded-full px-2 text-xs
```

**필터 매핑:**

| 탭 | `package_category` 값 | 규격 예시 |
|----|----------------------|-----------|
| 전체 | (전체) | - |
| 봉지류 | POUCH | 250g, 500g, 1kg, 2kg |
| 용기류 | CONTAINER | 2kg, 5kg, 10kg |
| 업소용 | COMMERCIAL | 15kg, 20kg |

---

### 4d. 불량률 높은 배치 하이라이트

```
조건: defect_qty / total_qty * 100 > 1.3

행 스타일:
  - 배경: bg-red-50
  - 좌측 4px 빨간 경계선: border-l-4 border-l-red-500
  - 불량수량 셀: text-red-700 font-bold
  - 상태 배지: 별도 "불량 주의" 아이콘 (AlertTriangle 16px) 좌측 추가

헤더 상단 알림 배너 (불량 배치 존재 시):
┌──────────────────────────────────────────────────┐
│ ⚠  불량률 기준(1.3%) 초과 배치 2건이 있습니다.   │
│    즉시 원인 파악 및 조치가 필요합니다.          │
└──────────────────────────────────────────────────┘
  bg-red-50 border border-red-300 text-red-700 rounded-xl px-5 py-3
```

---

### 4e. 출하 준비 완료 섹션 (ShipReadySection)

포장 완료(`status === 'COMPLETED'`)된 배치 목록. 이 섹션에서 "출하 준비" 버튼 클릭 시 해당 LOT의 상태를 `READY_TO_SHIP`으로 전환하고, 출하 페이지(`/dashboard/shipments`)에서 `READY` 상태로 출하 등록 가능하게 연결.

**컬럼:** LOT번호 / 제품명 / 포장규격 / 완료수량 / 유통기한 / 완료시각 / [출하 준비] 버튼

```typescript
// 출하 준비 전환 mutation
const readyToShipMutation = useMutation({
  mutationFn: (batchId: number) =>
    packagingApi.markReadyToShip(batchId),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['packaging', 'batches'] })
    queryClient.invalidateQueries({ queryKey: ['shipments'] })
    // 출하 페이지에서도 바로 보이도록 shipments 캐시 무효화
  },
})
```

---

## 5. 상태 배지 색상 가이드

포장 공정 배치 상태는 `ShipmentStatusBadge` 패턴을 참고하여 동일한 컨벤션 유지.

| 상태 코드 | 한국어 표시 | 배지 색상 | 배경 | 텍스트 |
|-----------|------------|-----------|------|--------|
| `ISSUED` | 작업지시 | 회색 | bg-gray-100 | text-gray-600 |
| `IN_PROGRESS` | 진행중 | 파란색 | bg-blue-100 | text-blue-700 |
| `COMPLETED` | 완료 | 초록색 | bg-green-100 | text-green-700 |
| `READY_TO_SHIP` | 출하 준비 | 시안 | bg-cyan-100 | text-cyan-700 |
| `DEFECT_ALERT` | 불량 주의 | 빨강 | bg-red-100 | text-red-700 |

**배지 컴포넌트 구조 (shadcn Badge 기반):**

```tsx
// components/features/packaging/PackagingStatusBadge.tsx
interface PackagingStatusBadgeProps {
  status: PackagingBatch['status']
  dot?: boolean  // 왼쪽 점(•) 표시 여부
}
```

---

## 6. 인터랙션 설계

### 6.1 필터 동작

```
날짜 필터:
  - 기본값: 오늘 날짜 (당일 배치만 표시)
  - 날짜 범위 선택 시 해당 기간 배치 조회
  - "오늘" 빠른선택 버튼 제공

포장규격 탭:
  - 탭 전환 시 테이블 즉시 필터링 (클라이언트 사이드)
  - 탭에 해당 배치 수 배지 업데이트

상태 필터:
  - select 드롭다운: 전체 / 작업지시 / 진행중 / 완료 / 출하 준비
  - 복합 필터 가능 (규격 탭 + 상태 드롭다운 AND 조건)
```

### 6.2 테이블 행 상호작용

```
행 클릭:
  - LOT번호 클릭: /dashboard/lot-trace?lot={lot_no} 로 이동
  - 행 전체 클릭: 배치 상세 사이드 패널 Slide-over 오픈 (선택적 구현)

배치 상세 패널 내용 (Sheet 컴포넌트):
  - 기본 정보 + 포장 기록 상세 (PackagingRecordForm에서 기록한 값)
  - 금속검출 결과 / 실링상태 / 중량편차 / 불량률
  - POP 화면 링크 (해당 작업지시 POP 페이지)
```

### 6.3 자동 갱신

```typescript
// 30초 자동 refetch — POP과 동일한 주기
const { data } = useQuery({
  queryKey: ['packaging', 'batches', filters],
  queryFn: () => packagingApi.getBatches(filters),
  refetchInterval: 30_000,
  staleTime: 30_000,
})
```

### 6.4 차트 인터랙션

```
포장규격별 실적 바 차트:
  - 마우스 오버: Tooltip (규격명, 완료량 kg, 배치 수)
  - 바 클릭: 해당 규격 필터 탭 자동 전환

시간대별 생산량 라인 차트:
  - 목표선(700 kg/h) 점선으로 표시 — stroke="#D97706" strokeDasharray="5 5"
  - 실적선 — stroke="#0891B2"
  - X축: 08시 ~ 현재 시각
  - Tooltip: 해당 시간대 생산량
```

---

## 7. 출하 페이지 연계 UX

### 7.1 포장 완료 → 출하 준비 전환 흐름

```
[포장 배치 테이블]
  배치 상태: COMPLETED
  → "출하 준비" 버튼 클릭
    → Confirm 다이얼로그:
        "LOT-0502 총각김치 용기 2kg 500개를
         출하 준비 상태로 전환합니다."
        [취소] [확인]
    → packagingApi.markReadyToShip(batchId) 호출
    → 배치 상태 READY_TO_SHIP 으로 변경
    → shipments 쿼리 캐시 invalidate

[출하 관리 페이지 /dashboard/shipments]
  → ShipmentList에 해당 LOT이 status: 'READY'로 자동 표시
  → "출하 등록" 버튼 클릭으로 ShipmentForm 연결
```

### 7.2 페이지 헤더 액션 버튼

```
PageHeader 우측:
  [출하관리 바로가기 →]  variant="outline"
  → router.push('/dashboard/shipments')

설명 텍스트:
  "포장 완료 배치를 출하 준비로 전환하면 출하관리 페이지에서 즉시 처리 가능합니다."
```

### 7.3 출하 준비 완료 섹션 빈 상태

```
아직 출하 준비 완료된 배치가 없을 경우:

┌──────────────────────────────────────────┐
│              (Package 아이콘)             │
│  아직 출하 준비 완료된 배치가 없습니다.  │
│  포장 완료 배치에서 "출하 준비" 버튼을   │
│  눌러 출하를 준비하세요.                 │
└──────────────────────────────────────────┘
  text-gray-400, py-12 text-center
```

---

## 8. API 데이터 매핑

### 8.1 신규 API 엔드포인트 (packagingApi)

기존 `processRecordApi.createPackagingRecord()` (POP용 쓰기)와 분리하여 대시보드용 조회 API를 별도 정의한다.

```typescript
// frontend/src/lib/api.ts 에 추가

export const packagingApi = {
  // 배치 목록 조회 (대시보드용)
  getBatches: (params: PackagingBatchFilter) =>
    apiClient.get('/packaging/batches', params),
  // params: { date_from, date_to, package_category, status, page, limit }

  // 당일 요약 통계
  getDailySummary: (date: string) =>
    apiClient.get(`/packaging/summary/${date}`),

  // 시간대별 생산량
  getHourlyProduction: (date: string) =>
    apiClient.get(`/packaging/hourly/${date}`),

  // 규격별 실적
  getSpecBreakdown: (date: string) =>
    apiClient.get(`/packaging/spec-breakdown/${date}`),

  // 출하 준비 완료 목록
  getReadyToShipList: () =>
    apiClient.get('/packaging/ready-to-ship'),

  // 출하 준비 전환
  markReadyToShip: (batchId: number) =>
    apiClient.patch(`/packaging/batches/${batchId}/ready-to-ship`),
}
```

### 8.2 응답 타입 정의

```typescript
// frontend/src/types/production.ts 에 추가

export interface PackagingBatch {
  id: number
  lot_no: string
  work_order_id: number
  product_name: string
  package_spec: string
  package_category: 'POUCH' | 'CONTAINER' | 'COMMERCIAL'
  target_qty: number
  completed_qty: number
  defect_qty: number
  operator_name: string
  status: 'ISSUED' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_TO_SHIP'
  started_at: string | null
  completed_at: string | null
  // PackagingRecordForm에서 기록된 값
  metal_detect_result: 'PASS' | 'FAIL' | null
  sealing_state: 'GOOD' | 'POOR' | 'FAIL' | null
  defect_rate: number       // % 계산값 (백엔드 제공)
  weight_deviation: number  // % 계산값 (백엔드 제공)
  expiry_date: string | null
}

export interface PackagingDailySummary {
  date: string
  completed_kg: number
  target_kg: number
  total_batches: number
  running_batches: number
  done_batches: number
  defect_rate: number        // 전체 평균 불량률 %
  defect_count: number
  defect_rate_yesterday: number
  kg_per_hour: number
  kg_per_hour_target: number // 700
}

export interface PackagingHourlyData {
  hour: number               // 8 ~ 18
  production_kg: number
}

export interface PackagingSpecBreakdown {
  spec: string
  category: 'POUCH' | 'CONTAINER' | 'COMMERCIAL'
  completed_kg: number
  batch_count: number
  defect_rate: number
}
```

### 8.3 파일 생성 위치 (구현 시 참고)

| 파일 | 역할 |
|------|------|
| `frontend/src/app/(dashboard)/packaging/page.tsx` | 페이지 진입점 |
| `frontend/src/components/features/packaging/PackagingSummaryCards.tsx` | 요약 카드 4개 |
| `frontend/src/components/features/packaging/PackagingBatchTable.tsx` | 배치 테이블 |
| `frontend/src/components/features/packaging/PackageSpecFilterTab.tsx` | 규격 탭 필터 |
| `frontend/src/components/features/packaging/PackagingStatusBadge.tsx` | 상태 배지 |
| `frontend/src/components/features/packaging/PackagingSpecChart.tsx` | 규격별 실적 바 차트 |
| `frontend/src/components/features/packaging/HourlyProductionChart.tsx` | 시간대별 라인 차트 |
| `frontend/src/components/features/packaging/ShipReadySection.tsx` | 출하 준비 완료 목록 |
| `frontend/src/hooks/usePackagingBatches.ts` | TanStack Query 훅 |

### 8.4 Sidebar 메뉴 추가 위치

```
frontend/src/components/layout/Sidebar.tsx 에 생산관리 그룹에 추가:

생산관리
  ├── 생산계획    /dashboard/production
  ├── 작업지시    /dashboard/orders
  └── 포장 공정   /dashboard/packaging   ← 신규
```

---

## 9. 구현 우선순위

| 우선순위 | 컴포넌트 | 이유 |
|----------|----------|------|
| 1 | `PackagingBatchTable` | 핵심 조회 기능, 관리자가 가장 많이 사용 |
| 2 | `PackagingSummaryCards` | 빠른 현황 파악 — KPI 카드 패턴 재사용 |
| 3 | `ShipReadySection` | 출하 연계 UX — 업무 흐름에서 병목 해소 |
| 4 | `PackageSpecFilterTab` | UX 개선 — 클라이언트 사이드 필터 |
| 5 | 차트 (규격별 / 시간대별) | 분석 기능 — 운영 안정화 후 추가 |
