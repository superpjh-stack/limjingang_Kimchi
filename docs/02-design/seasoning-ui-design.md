# 양념(Seasoning) 공정 관리자 대시보드 UI 설계서

> 임진강김치(주) MES — Phase 3 Mockup  
> 작성일: 2026-05-13  
> 대상 화면: `/production/seasoning` (관리자 대시보드)

---

## 1. POP 버전 분석 요약

`frontend/src/app/(pop)/pop/[id]/seasoning/page.tsx` 및  
`frontend/src/components/pop/process/SeasoningRecordForm.tsx` 분석 결과

### 1.1 POP 현장 화면 핵심 기능

| 기능 | 설명 |
|------|------|
| 단일 작업지시 조회 | URL 파라미터 `id`로 1건의 WorkOrder를 30초 폴링 갱신 |
| 작업 시작 / 완료 버튼 | `ISSUED` → 시작 → `IN_PROGRESS` → 완료 → `COMPLETED` 상태 전이 |
| 작업실적 탭 | `ResultForm`: actual_qty, defect_qty, defect_reason 입력 |
| 버무림기록 탭 | `SeasoningRecordForm`: 아래 9개 필드 입력 |
| HACCP CCP 실시간 판정 | 혼합온도(-2~10°C) 기준 PASS/FAIL 뱃지 즉시 표시 |
| LOT 자동생성 | `WO{id}-{YYYYMMDD}` 형식 자동 부여, 수동 수정 가능 |
| 완료 확인 다이얼로그 | 모달로 이중 확인 후 상태 전이 |

### 1.2 SeasoningRecordForm 입력 필드

| 필드명 | 타입 | 단위 | CCP 여부 | 기본값 |
|--------|------|------|----------|--------|
| seasoning_ratio | 숫자 | % | - | 30 |
| mix_temp | 숫자 | °C | CCP (-2~10°C) | 4 |
| mix_time | 숫자 | 분 | - | 20 |
| garlic_content | 숫자 | g/kg | - | 30 |
| chili_content | 숫자 | g/kg | - | 50 |
| ginger_content | 숫자 | g/kg | - | 10 |
| input_weight | 숫자 | kg | - | 0 |
| output_weight | 숫자 | kg | - | 0 |
| lot_no | 문자 | - | - | 자동생성 |

### 1.3 API 연결 구조

- `popApi.getWorkOrder(id)` → WorkOrder 단건 조회
- `popApi.startWork(id)` / `popApi.completeWork(id)` → 상태 전이
- `popApi.recordResult(id, ResultInput)` → 실적 기록
- `processRecordApi.createSeasoningRecord(data)` → 버무림 공정 기록
- `processRecordApi.getSeasoningRecord(workOrderId)` → 기존 기록 조회

---

## 2. POP vs Dashboard 기능 비교표

| 구분 | POP (현장 작업자) | Dashboard (관리자) |
|------|------------------|-------------------|
| 대상 사용자 | 현장 작업자 | 생산 관리자, 품질 담당자 |
| 디바이스 | 태블릿 (터치 UI) | PC (마우스 UI) |
| 데이터 범위 | 특정 작업지시 1건 | 전체 양념 배치 집계 |
| 주요 목적 | 실시간 작업 수행 + 기록 | 배치 현황 모니터링 + 이상 감지 |
| 갱신 방식 | 30초 자동 폴링 | 수동 새로고침 + 날짜 필터 |
| 핵심 인터랙션 | 버튼 탭, 수치 입력 | 테이블 정렬/필터, 차트 조회 |
| 상태 전이 | 작업 시작/완료 직접 수행 | 상태 조회 전용 (읽기) |
| CCP 표시 | 입력값 즉시 판정 뱃지 | 배치별 CCP 결과 집계 |
| 레시피 정보 | 배합비 직접 입력 | 레시피 준수율 모니터링 |
| 이동 링크 | 없음 (현재 작업만) | 배치 클릭 → POP 화면 이동 |
| 라우팅 | `/pop/[id]/seasoning` | `/production/seasoning` |

---

## 3. ASCII 와이어프레임

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [PageHeader]                                                                   │
│   양념버무림 공정 관리              홈 > 생산관리 > 양념버무림                     │
│   레시피 준수율 및 배치 현황을 모니터링합니다.          [새로고침 버튼]            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │ 오늘 양념 배치  │  │   배치 완료율   │  │ 레시피 준수율   │  │ 재료 투입  │ │
│  │   12 건         │  │   75.0 %        │  │   92.3 %        │  │총량        │ │
│  │ 진행중 3건      │  │ 9/12 배치 완료  │  │ 이탈 1건 감지   │  │ 2,450 kg   │ │
│  │ 대기 0건        │  │ [====------] 75%│  │ [========--] 92%│  │ 목표 2,600 │ │
│  │ [파 강조선]     │  │ [초록 강조선]   │  │ [파 강조선]     │  │ [amber선]  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [필터 영역]                                                                    │
│  날짜: [2026-05-13 ▼]    제품: [전체 ▼]    상태: [전체 ▼]   [검색]           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [양념 배치 목록 테이블]                                                        │
│  ┌────────┬──────────┬────────────┬───────────┬──────────┬──────┬──────┬──────┐ │
│  │LOT번호 │제품명    │레시피명    │총투입량   │  진행률  │담당자│시작  │상태  │ │
│  ├────────┼──────────┼────────────┼───────────┼──────────┼──────┼──────┼──────┤ │
│  │WO12-.. │맛김치    │맛김치-A    │ 450 kg    │[■■■■□] │홍길동│09:00 │진행중│ │
│  │WO11-.. │포기김치  │포기-표준   │ 320 kg    │[■■■■■]│김철수│08:30 │완료  │ │
│  │WO10-.. │총각김치  │총각-매운   │ 280 kg    │[■■□□□]│이영희│10:15 │진행중│ │
│  │WO09-.. │깍두기    │깍두기-표준 │ 200 kg    │[□□□□□]│박민준│11:00 │대기  │ │
│  │WO08-.. │물김치    │물김치-기본 │ 180 kg    │[■■■■■]│홍길동│07:45 │완료  │ │
│  └────────┴──────────┴────────────┴───────────┴──────────┴──────┴──────┴──────┘ │
│                         [< 이전]  1 / 3  [다음 >]                              │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [하단 2열 레이아웃]                                                            │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│  │ 레시피 준수율 인디케이터      │  │ 재료별 사용 현황 (오늘)                 │ │
│  │ LOT: WO12-20260513            │  │                                         │ │
│  │                               │  │  고추가루  ████████████ 350kg / 380kg   │ │
│  │ 마늘     목표30 실제29 ▼1    │  │  마늘      ██████████░░ 290kg / 320kg   │ │
│  │          [=========░] 96.7%  │  │  파        ███████████░ 210kg / 220kg   │ │
│  │ 고추가루 목표50 실제52 ▲2    │  │  생강      █████████░░░ 180kg / 200kg   │ │
│  │          [==========] 104%   │  │  젓갈      ██████████░░ 120kg / 130kg   │ │
│  │ 생강     목표10 실제10 =     │  │  기타      ████████░░░░  50kg /  60kg   │ │
│  │          [==========] 100%   │  │                                         │ │
│  │                               │  │  [범례] ██ 실사용  ░░ 잔여목표         │ │
│  └───────────────────────────────┘  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 컴포넌트 명세

### 4.a 요약 카드 (SeasoningSummaryCards)

`components/features/production/seasoning/SeasoningSummaryCards.tsx`

TodaySummaryCards의 StatCard 패턴을 그대로 재사용한다.  
`borderTop: 3px solid {accentColor}`, `rounded-xl`, 흰색 배경, `boxShadow: 0 2px 8px rgba(0,0,0,0.06)`

| 카드 | 주요값 | sub1 | sub2 | accentColor | bgColor |
|------|--------|------|------|-------------|---------|
| 오늘 양념 배치 | `{total} 건` | `진행중 {in_progress}건` | `대기 {issued}건` | `#0891B2` (파) | `rgba(8,145,178,0.08)` |
| 배치 완료율 | `{rate} %` | `{completed}/{total} 배치 완료` | - | rate >= 80 → `#16A34A`, 미만 → `#DC2626` | 동적 |
| 레시피 준수율 | `{compliance_rate} %` | 이탈 건수 표시 | - | compliance >= 95 → `#0891B2`, 미만 → `#DC2626` | 동적 |
| 재료 투입 총량 | `{total_input_kg} kg` | `목표 {planned_kg} kg` | - | `#D97706` (amber) | `rgba(217,119,6,0.08)` |

모든 카드는 `progress` prop을 사용하여 하단 프로그레스바를 표시한다.

Props 인터페이스:

```typescript
interface SeasoningSummaryData {
  total_batches: number
  in_progress: number
  issued: number
  completed: number
  completion_rate: number
  recipe_compliance_rate: number
  recipe_deviation_count: number
  total_input_kg: number
  planned_input_kg: number
}

interface SeasoningSummaryCardsProps {
  data?: SeasoningSummaryData
  isLoading?: boolean
}
```

---

### 4.b 배치 테이블 (SeasoningBatchTable)

`components/features/production/seasoning/SeasoningBatchTable.tsx`

| 컬럼 | 필드 | 너비 | 정렬 | 비고 |
|------|------|------|------|------|
| LOT번호 | `lot_no` | 140px | 좌 | `font-mono`, 클릭 시 POP 이동 |
| 제품명 | `product_name` | 120px | 좌 | - |
| 레시피명 | `recipe_name` | 120px | 좌 | - |
| 총 투입량 | `total_input_kg` | 100px | 우 | `{value} kg` |
| 진행률 | `progress_pct` | 140px | 중 | 프로그레스바 + % 텍스트 |
| 담당자 | `assigned_user_name` | 80px | 중 | - |
| 시작시간 | `start_datetime` | 80px | 중 | `HH:mm` 형식 |
| 상태 | `status` | 90px | 중 | 상태 배지 컴포넌트 |

진행률 프로그레스바:

```typescript
// 너비: 100px, 높이: 6px, rounded-full
// 색상: status === 'COMPLETED' ? '#16A34A' : '#0891B2'
// 배경: '#F1F5F9'
// 우측에 '%' 텍스트 (text-xs font-bold)
```

Props 인터페이스:

```typescript
interface SeasoningBatch {
  id: number
  lot_no: string
  work_order_no: string
  product_name: string
  recipe_name: string
  total_input_kg: number
  planned_kg: number
  progress_pct: number
  assigned_user_name: string
  start_datetime: string | null
  status: SeasoningBatchStatus
  recipe_compliance_rate: number | null
}

interface SeasoningBatchTableProps {
  batches: SeasoningBatch[]
  isLoading?: boolean
  onBatchClick: (batch: SeasoningBatch) => void
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}
```

---

### 4.c 레시피 준수율 인디케이터 (RecipeComplianceIndicator)

`components/features/production/seasoning/RecipeComplianceIndicator.tsx`

선택된 배치 1건의 재료별 목표 대비 실제 투입 비율을 시각화한다.

각 재료 행 구조:

```
[재료명 4글자] [목표값 g/kg] [실제값 g/kg] [편차 ±N] [진행바] [%]
```

편차 표시 규칙:
- `|편차| <= 2` : `text-green-600`, 정상 범위
- `|편차| > 2` : `text-red-600 font-bold`, 이탈 표시

프로그레스바 색상:
- 95% ~ 105%: `#16A34A` (초록, 정상)
- 80% ~ 95% 또는 105% ~ 115%: `#D97706` (amber, 경고)
- 그 외: `#DC2626` (빨강, 이상)

Props 인터페이스:

```typescript
interface IngredientCompliance {
  ingredient_name: string   // 고추가루 | 마늘 | 파 | 생강 | 젓갈
  target_value: number      // g/kg
  actual_value: number      // g/kg
  deviation: number         // actual - target
  compliance_pct: number    // (actual / target) * 100
}

interface RecipeComplianceIndicatorProps {
  lotNo: string
  ingredients: IngredientCompliance[]
  isLoading?: boolean
}
```

---

### 4.d 재료별 사용 현황 (IngredientUsageChart)

`components/features/production/seasoning/IngredientUsageChart.tsx`

오늘 날짜 기준 전체 양념 배치의 재료별 실제 사용량 vs 계획 사용량을 수평 바 차트로 표시한다.

표시 재료 목록 (SeasoningRecordForm 필드 기반):
1. 고추가루 (`chili_content` 집계)
2. 마늘 (`garlic_content` 집계)
3. 파 (별도 관리)
4. 생강 (`ginger_content` 집계)
5. 젓갈 (별도 관리)
6. 기타 (나머지 합산)

차트 구현 선택지:
- **옵션 A**: Recharts `BarChart` (수평, horizontal layout) — 프로젝트에 이미 설치됨
- **옵션 B**: CSS 순수 구현 — 외부 의존성 없음

권장: 옵션 A (Recharts) — `frontend/src/app/(dashboard)/kpi/page.tsx`에서 이미 사용 중

Props 인터페이스:

```typescript
interface IngredientUsage {
  ingredient_name: string
  actual_kg: number
  planned_kg: number
  usage_rate: number   // actual / planned * 100
}

interface IngredientUsageChartProps {
  data: IngredientUsage[]
  isLoading?: boolean
}
```

---

## 5. 상태 배지 (SeasoningStatusBadge)

`components/features/production/seasoning/SeasoningStatusBadge.tsx`

WorkOrderStatus에 양념 공정 특화 상태를 추가한다.

| 상태값 | 표시 텍스트 | 배경색 | 텍스트색 | 설명 |
|--------|------------|--------|----------|------|
| `ISSUED` | 대기 | `#F1F5F9` | `#64748B` | 작업 시작 전 |
| `IN_PROGRESS` | 진행중 | `rgba(8,145,178,0.12)` | `#0891B2` | 현재 버무림 중 |
| `COMPLETED` | 완료 | `rgba(22,163,74,0.12)` | `#16A34A` | 정상 완료 |
| `RECIPE_DEVIATION` | 레시피이상 | `rgba(220,38,38,0.12)` | `#DC2626` | CCP/레시피 기준 이탈 |
| `PAUSED` | 일시정지 | `rgba(217,119,6,0.12)` | `#D97706` | 작업 중단 |
| `CANCELLED` | 취소 | `#F8FAFC` | `#94A3B8` | 취소 처리됨 |

스타일 패턴 (TodaySummaryCards StatCard와 동일한 시스템):

```typescript
// rounded-full, px-3, py-0.5, text-xs font-bold
// border: 1px solid {borderColor}
```

---

## 6. 인터랙션 명세

### 6.1 배치 클릭 → POP 페이지 이동

```typescript
// SeasoningBatchTable의 onBatchClick 핸들러
// 클릭 대상: 전체 행 (tr 요소, cursor-pointer)
// 이동 URL: /pop/{work_order_id}/seasoning
// 구현: Next.js useRouter().push() 또는 <Link href={...}>
// 새 탭 열기 옵션: Ctrl+클릭 지원을 위해 <Link> 사용 권장

const handleBatchClick = (batch: SeasoningBatch) => {
  router.push(`/pop/${batch.id}/seasoning`)
}
```

### 6.2 필터 동작

```typescript
interface SeasoningFilters {
  date: string           // YYYY-MM-DD, 기본값: 오늘
  product_id?: number    // 제품 필터
  status?: SeasoningBatchStatus  // 상태 필터
}
// 필터 변경 시 즉시 TanStack Query 쿼리 키 갱신 → 자동 재조회
// queryKey: ['seasoning-batches', filters]
```

### 6.3 레시피 준수율 인디케이터 연동

- 테이블 행 클릭 시 해당 배치의 LOT번호를 `selectedLotNo` 상태에 저장
- `RecipeComplianceIndicator`는 `selectedLotNo`를 prop으로 받아 해당 배치 데이터를 표시
- 초기 상태: 가장 최근 진행중 배치 자동 선택

### 6.4 새로고침

- 페이지 우상단 새로고침 버튼 → `queryClient.invalidateQueries(['seasoning-batches'])`
- 자동 폴링은 사용하지 않음 (관리자 화면 특성상 불필요)

---

## 7. 색상 가이드

프로젝트 전체 디자인 토큰을 준수한다.

### 기본 색상

| 역할 | 색상 코드 | 사용처 |
|------|----------|--------|
| 주요 강조 (파 블루시안) | `#0891B2` | 배치 수 카드 강조선, 진행중 배지, 진행률 바 |
| 위험/경고 (김치 레드) | `#DC2626` | 낮은 완료율, 레시피 이탈, FAIL 상태 |
| 정상 완료 | `#16A34A` | 완료 배지, 높은 준수율 |
| 경고 (amber) | `#D97706` | 재료 투입 총량 카드, 일시정지 배지 |
| 페이지 배경 | `#F0F9FF` | body/page background |
| 카드 배경 | `#FFFFFF` | 모든 카드/패널 |
| 보조 텍스트 | `#64748B` | 레이블, sub 텍스트 |
| 흐린 배경 | `#F1F5F9` | 프로그레스바 배경, 스켈레톤 |

### 카드 스타일 공통 패턴

```css
/* TodaySummaryCards.tsx StatCard와 동일한 패턴 유지 */
background: #FFFFFF;
border: 1px solid rgba(0,0,0,0.06);
border-top: 3px solid {accentColor};
border-radius: 0.75rem;   /* rounded-xl */
box-shadow: 0 2px 8px rgba(0,0,0,0.06);
```

### 상태별 컬러 의사 결정 트리

```
레시피 준수율
├── >= 95% → #0891B2 (파, 정상)
├── 80~94% → #D97706 (amber, 경고)
└── < 80%  → #DC2626 (레드, 위험)

배치 완료율
├── >= 80% → #16A34A (초록, 정상)
├── 50~79% → #D97706 (amber, 경고)
└── < 50%  → #DC2626 (레드, 위험)
```

---

## 8. API 데이터 매핑

### 8.1 신규 API 엔드포인트 (백엔드 설계 필요)

현재 `api.ts`에 양념 관리자 대시보드 전용 API가 없으므로 아래를 신규 추가한다.

```typescript
// frontend/src/lib/api.ts 추가 항목
export const seasoningDashboardApi = {
  // 오늘 양념 배치 집계 (요약 카드용)
  getDailySummary: (date?: string) =>
    api.get('/production/seasoning/summary', {
      params: { date: date ?? new Date().toISOString().split('T')[0] }
    }),

  // 양념 배치 목록 (테이블용)
  getBatchList: (params: SeasoningBatchListParams) =>
    api.get('/production/seasoning/batches', { params }),

  // 재료별 사용 현황 (차트용)
  getIngredientUsage: (date?: string) =>
    api.get('/production/seasoning/ingredient-usage', {
      params: { date: date ?? new Date().toISOString().split('T')[0] }
    }),

  // 특정 배치의 레시피 준수율 (인디케이터용)
  // 기존 processRecordApi.getSeasoningRecord(workOrderId) 재사용
}
```

### 8.2 기존 API 재사용

| 기능 | 기존 API | 비고 |
|------|----------|------|
| 배치 클릭 후 POP 이동 | `popApi.getWorkOrder(id)` | POP 화면에서 직접 호출 |
| 버무림 기록 상세 | `processRecordApi.getSeasoningRecord(workOrderId)` | RecipeComplianceIndicator에서 재사용 |
| 제품 필터 목록 | `productApi.getList()` | 필터 드롭다운 populate |
| 작업지시 목록 | `workOrderApi.getList(params)` | 배치 목록 초기 구현 시 대체 가능 |

### 8.3 응답 스키마 (예상)

```typescript
// GET /production/seasoning/summary
interface SeasoningDailySummaryResponse {
  data: {
    total_batches: number
    in_progress: number
    issued: number
    completed: number
    completion_rate: number
    recipe_compliance_rate: number
    recipe_deviation_count: number
    total_input_kg: number
    planned_input_kg: number
  }
}

// GET /production/seasoning/batches
interface SeasoningBatchListResponse {
  data: SeasoningBatch[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// GET /production/seasoning/ingredient-usage
interface IngredientUsageResponse {
  data: IngredientUsage[]
}
```

### 8.4 TanStack Query 키 규칙

```typescript
// 쿼리 키 네이밍 컨벤션 (기존 패턴 준수)
['seasoning-summary', date]
['seasoning-batches', { date, product_id, status, page }]
['seasoning-ingredient-usage', date]
['seasoning-record', workOrderId]   // 기존 processRecordApi 재사용
```

---

## 9. 파일 구조 (구현 시 생성할 파일)

```
frontend/src/
├── app/(dashboard)/production/seasoning/
│   └── page.tsx                              # 메인 페이지
│
├── components/features/production/seasoning/
│   ├── SeasoningSummaryCards.tsx             # 요약 카드 ×4
│   ├── SeasoningBatchTable.tsx               # 배치 목록 테이블
│   ├── RecipeComplianceIndicator.tsx         # 레시피 준수율 인디케이터
│   ├── IngredientUsageChart.tsx              # 재료별 사용 현황 차트
│   └── SeasoningStatusBadge.tsx             # 상태 배지
│
└── lib/api.ts                                # seasoningDashboardApi 추가
```

---

## 10. 구현 우선순위

| 순위 | 컴포넌트 | 이유 |
|------|----------|------|
| 1 | SeasoningStatusBadge | 테이블/기타 컴포넌트 의존 공통 요소 |
| 2 | SeasoningSummaryCards | 페이지 최상단, 가장 높은 가시성 |
| 3 | SeasoningBatchTable | 핵심 기능: 배치 목록 + POP 이동 링크 |
| 4 | RecipeComplianceIndicator | 양념 공정 특화 핵심 모니터링 |
| 5 | IngredientUsageChart | 재료 현황 보조 시각화 |

---

*이 설계서는 Phase 3 Mockup 결과물입니다. Phase 6(UI 구현 + API 통합) 진입 전 백엔드 팀과 API 스키마(섹션 8) 협의가 필요합니다.*
