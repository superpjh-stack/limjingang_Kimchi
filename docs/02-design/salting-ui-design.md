# 절임(Salting) 공정 관리자 대시보드 UI 설계서

> 작성일: 2026-05-13
> 담당: Frontend Architect Agent
> 버전: v1.0
> 경로: `frontend/src/app/(dashboard)/process/salting/page.tsx`

---

## 1. 페이지 목적 및 주요 사용자

### 목적

절임 공정 관리자가 현재 진행 중인 모든 절임 배치(batch)의 상태를 실시간으로 모니터링하고,
소금 농도 측정값 입력, 이상 배치 즉각 대응, 공정 완료 처리를 단일 화면에서 수행할 수 있도록 한다.

### 핵심 요구사항

| 우선순위 | 요구사항 | 이유 |
|---------|---------|-----|
| P1 | 남은 절임 시간 카운트다운 | 절임 시간 초과 시 품질 저하 발생 |
| P1 | 소금 농도 상태 시각화 | HACCP 기준(2~3%) 준수 확인 필수 |
| P1 | HACCP 이상 즉각 경고 | 식품안전 법적 의무 |
| P2 | 다중 절임통 동시 파악 | 관리자 1인이 10~20개 배치 관리 |
| P3 | 소금 농도 이력 차트 | 공정 개선 및 품질 분석 |

### 주요 사용자

- **절임 공정 관리자**: 절임통 상태 모니터링, 소금 농도 측정값 입력, 이상 조치
- **품질 관리자**: 소금 농도 이력 검토, HACCP 기록 확인
- **생산 관리자**: 오늘 처리량 및 일정 준수 여부 확인

---

## 2. ASCII 와이어프레임 (전체 페이지 레이아웃)

### 데스크톱 (1280px 이상)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (w-64)  │              MAIN CONTENT AREA                                   │
│  [임진강김치 MES] │                                                                  │
│                  │  ┌─────────────────────────────────────────────────────────────┐ │
│  > 대시보드       │  │  PageHeader                                                 │ │
│  > 기준정보관리   │  │  절임 공정 관리           공정관리 > 절임                    │ │
│  > 수주/생산계획  │  │  절임통별 진행 상황, 소금 농도, HACCP 이상 현황을 관리합니다. │ │
│  > 자재/재고      │  └─────────────────────────────────────────────────────────────┘ │
│  ▼ 공정관리       │                                                                  │
│    > 세척         │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│    > [절임] ●     │  │ 진행중    │ │ 오늘 완료 │ │ 소금 사용 │ │ 품질합격  │           │
│    > 양념         │  │ 배치 수   │ │          │ │ 량(kg)   │ │ 률       │           │
│    > 포장         │  │          │ │          │ │          │ │          │           │
│  > 출하관리       │  │  8 건    │ │  12 건   │ │ 540 kg  │ │  96.2%  │           │
│  ...              │  │ 이상 2건  │ │ 목표 15건 │ │ 목표대비  │ │ 목표 95% │           │
│                   │  │ [████░]  │ │ [████░]  │ │ 90%     │ │ [████░]  │           │
│                   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                   │                                                                  │
│                   │  ┌─────────────────────────────────────────────────────────────┐ │
│                   │  │  필터바                                                      │ │
│                   │  │  [날짜 선택: 2026-05-13 ▼] [상태 ▼] [원재료 종류 ▼]  [검색] │ │
│                   │  └─────────────────────────────────────────────────────────────┘ │
│                   │                                                                  │
│                   │  ┌─────────────────────────────────────────────────────────────┐ │
│                   │  │  ⚠ HACCP 이상 배치 (상단 고정, 빨간 배경)                   │ │
│                   │  │  ┌──────────────────────────────────────────────────────┐   │ │
│                   │  │  │ LOT번호 │원재료│투입량│소금농도│절임시간│남은시간│담당│상태│ │ │
│                   │  │  ├──────────────────────────────────────────────────────┤   │ │
│                   │  │  │ [이상 배치 행 — 빨간 배경 + 깜빡임 상태 배지]          │   │ │
│                   │  │  └──────────────────────────────────────────────────────┘   │ │
│                   │  │                                                              │ │
│                   │  │  진행중 절임 배치 목록                                        │ │
│                   │  │  ┌──────────────────────────────────────────────────────┐   │ │
│                   │  │  │ LOT번호 │원재료│투입량│소금농도│절임시간│남은시간│담당│상태│ │ │
│                   │  │  ├──────────────────────────────────────────────────────┤   │ │
│                   │  │  │ [배치 행들...]                                         │   │ │
│                   │  │  └──────────────────────────────────────────────────────┘   │ │
│                   │  └─────────────────────────────────────────────────────────────┘ │
│                   │                                                                  │
│                   │  ┌─────────────────────────────────────────────────────────────┐ │
│                   │  │  소금 농도 이력 차트 (오늘 / 최근 7일)                       │ │
│                   │  │  [탭: 오늘 | 최근 7일]          [+ 측정값 입력]              │ │
│                   │  │  ┌────────────────────────────────────────────────────┐     │ │
│                   │  │  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ HACCP 상한(3.0%)             │     │ │
│                   │  │  │      ●   ●                                         │     │ │
│                   │  │  │  ●       ●   ●   ●  [정상 영역 초록 배경]          │     │ │
│                   │  │  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ HACCP 하한(2.0%)             │     │ │
│                   │  │  │  08:00  10:00  12:00  14:00  16:00                │     │ │
│                   │  │  └────────────────────────────────────────────────────┘     │ │
│                   │  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────────────────┐
                    │  [배치 행 클릭 시] 상세 슬라이드 패널 (오른쪽에서 슬라이드 인)     │
                    │                                                          w-[480px]│
                    │  LOT-2026-SAL-001 상세                              [X 닫기]    │
                    │  ─────────────────────────────────────────────────────────────  │
                    │  [기본정보] [소금농도 이력] [담당자 메모]  ← 탭                  │
                    │                                                                  │
                    │  절임통 번호: TANK-03                                             │
                    │  원재료: 배추 (포기김치용)        투입량: 850 kg                  │
                    │  절임 시작: 2026-05-13 08:30     목표 완료: 2026-05-13 20:30    │
                    │  담당자: 김철수                    절임 시간: 12시간              │
                    │                                                                  │
                    │  현재 소금 농도: [████████░░] 2.8%  (정상)                     │
                    │  HACCP 기준: 2.0% ~ 3.0%                                        │
                    │  ─────────────────────────────────────────────────────────────  │
                    │  [+ 소금 농도 측정값 입력]  [공정 완료 처리]  [이상 보고]         │
                    └─────────────────────────────────────────────────────────────────┘
```

### 태블릿 (768px ~ 1279px)

```
┌──────────────────────────────────────────────────────────┐
│  PageHeader: 절임 공정 관리                                │
├──────────────┬───────────────┬──────────────────────────┤
│ 진행중 배치  │  오늘 완료     │  소금 사용량              │
│    8 건      │   12 건       │   540 kg                 │
├──────────────┴───────────────┴──────────────────────────┤
│  품질 합격률: 96.2%                                       │
├──────────────────────────────────────────────────────────┤
│  필터: [날짜 ▼] [상태 ▼] [원재료 ▼]                      │
├──────────────────────────────────────────────────────────┤
│  ⚠ 이상 배치 테이블 (스크롤)                              │
├──────────────────────────────────────────────────────────┤
│  진행중 배치 테이블 (스크롤)                               │
├──────────────────────────────────────────────────────────┤
│  소금 농도 이력 차트                                       │
└──────────────────────────────────────────────────────────┘
```

---

## 3. 컴포넌트 상세 명세

### 3a. 요약 카드 4개 (SaltingSummaryCards)

참조: `TodaySummaryCards.tsx`의 `StatCard` 패턴을 그대로 계승한다.
카드 구조: 흰색 배경 + `rounded-xl` + `borderTop: 3px solid {accentColor}` + `boxShadow: 0 2px 8px rgba(0,0,0,0.06)`

#### 카드 1: 진행중 배치 수

```
accentColor : #0891B2 (파 블루시안)
bgColor     : rgba(8,145,178,0.08)
icon        : BeakerIcon (heroicons)
title       : "진행중 배치"
mainValue   : "{count} 건"
sub1        : "이상 {abnormal_count}건"
sub2        : "절임통 {tank_count}개 사용 중"
progress    : 없음
```

#### 카드 2: 오늘 완료 배치

```
accentColor : #16A34A (green)
bgColor     : rgba(22,163,74,0.08)
icon        : CheckCircleIcon (heroicons)
title       : "오늘 완료"
mainValue   : "{completed_count} 건"
sub1        : "목표 {target_count}건"
progress    : (completed_count / target_count) * 100
progressLabel: "목표 달성률"
```

#### 카드 3: 소금 사용량

```
accentColor : #D97706 (amber)
bgColor     : rgba(217,119,6,0.08)
icon        : ScaleIcon (heroicons)
title       : "소금 사용량"
mainValue   : "{salt_used_kg} kg"
sub1        : "계획 {salt_planned_kg}kg"
progress    : (salt_used_kg / salt_planned_kg) * 100
progressLabel: "계획 대비"
```

#### 카드 4: 품질 합격률 (조건부 색상)

```
accentColor : rate >= 95 ? '#0891B2' : '#DC2626'
bgColor     : rate >= 95 ? rgba(8,145,178,0.08) : rgba(220,38,38,0.08)
icon        : ShieldCheckIcon (heroicons)
title       : "품질 합격률"
mainValue   : "{pass_rate}%"
sub1        : "목표 95%"
progress    : pass_rate
progressLabel: "합격률"
```

---

### 3b. 배치 테이블 (SaltingBatchTable)

#### 컬럼 정의

| 컬럼명 | 너비 | 정렬 | 내용 |
|-------|-----|-----|-----|
| LOT번호 | 160px | 좌 | `LOT-2026-SAL-001` 형식 — 클릭 시 슬라이드 패널 오픈 |
| 원재료 | 120px | 좌 | 배추/갓/파 등 재료명 + 종류 배지 |
| 투입량(kg) | 80px | 우 | 숫자 + "kg" 단위 |
| 소금농도(%) | 120px | 중 | 농도 인디케이터 (3e 항목 참조) |
| 절임시간 | 80px | 중 | "12h" 형식 |
| 남은시간 | 160px | 중 | 카운트다운 + 프로그레스바 (3d 항목 참조) |
| 담당자 | 80px | 중 | 이름 텍스트 |
| 상태 | 80px | 중 | 상태 배지 (3c 항목 참조) |

#### 테이블 스타일

```
배경색     : #FFFFFF
헤더 배경  : #F8FAFC
헤더 텍스트: #64748B, font-size: 11px, font-weight: 600, uppercase
행 hover   : background: rgba(8,145,178,0.04)
행 border  : border-bottom: 1px solid #F1F5F9
행 클릭    : cursor: pointer, transition: background 150ms
이상 배치 행: background: rgba(220,38,38,0.06), border-left: 3px solid #DC2626
```

#### 이상 배치 자동 상단 고정 규칙

- 상태가 `"이상"`인 배치는 테이블 최상단에 자동 정렬
- 별도 섹션 헤더: `⚠ HACCP 이상 배치` (빨간 텍스트, `#DC2626`)
- 이상 배치 섹션과 일반 배치 섹션 사이에 구분선 표시

---

### 3c. 상태 배지 (SaltingStatusBadge)

```tsx
// 컴포넌트 인터페이스
interface SaltingStatusBadgeProps {
  status: 'waiting' | 'in_progress' | 'completed' | 'abnormal'
}
```

| 상태값 | 표시 텍스트 | 배경색 | 텍스트 색 | 특수 효과 |
|-------|-----------|-------|---------|---------|
| `waiting` | 대기 | `rgba(148,163,184,0.15)` | `#64748B` | 없음 |
| `in_progress` | 진행중 | `rgba(8,145,178,0.12)` | `#0891B2` | 없음 |
| `completed` | 완료 | `rgba(22,163,74,0.12)` | `#16A34A` | 없음 |
| `abnormal` | 이상 | `rgba(220,38,38,0.15)` | `#DC2626` | `animate-pulse` |

```
배지 공통 스타일:
  padding    : px-2 py-0.5
  border-radius: rounded-full
  font-size  : text-xs
  font-weight: font-semibold
  display    : inline-flex items-center gap-1
  좌측 dot  : w-1.5 h-1.5 rounded-full (배지와 동일 색상)
```

이상 상태 `animate-pulse` 구현:

```tsx
// globals.css에 이미 존재하는 Tailwind animate-pulse를 사용
// 배지 전체가 아닌, 좌측 dot만 깜빡이도록 제한
<span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
<span>이상</span>
```

---

### 3d. 카운트다운 컴포넌트 (SaltingCountdown)

#### 시각적 구성

```
[프로그레스바]  [HH:MM 텍스트]

예시 (남은 시간 4시간 23분, 총 12시간):
████████████░░░░  04:23
(진행된 시간 비율만큼 채워진 바 + 남은 시간 텍스트)
```

#### 색상 규칙

| 조건 | 바 색상 | 텍스트 색 |
|-----|-------|---------|
| 남은 시간 > 30분 | `#0891B2` | `#0891B2` |
| 남은 시간 30분 이하 | `#D97706` (amber) | `#D97706` |
| 시간 초과 | `#DC2626` | `#DC2626` |

#### 프로그레스 바 스타일

```
컨테이너: h-1.5, w-full, rounded-full, background: #F1F5F9
진행바  : h-full, rounded-full
        transition: width 1s linear (1초마다 갱신)
        background: linear-gradient(90deg, {color}88, {color})
```

#### 타이머 텍스트

```
font-size  : text-sm
font-weight: font-bold
font-family: 'Noto Serif KR', serif (숫자 가독성)
color      : 조건부 (위 색상 규칙 적용)
```

#### 시간 초과 처리

```
남은 시간이 0 이하가 되면:
- 텍스트: "초과" (빨간색)
- 바: 100% 채움, 빨간색
- 행 전체에 이상 상태 스타일 적용 (자동 상단 고정 트리거)
```

---

### 3e. 소금 농도 인디케이터 (SaltConcentrationIndicator)

#### 시각적 구성

```
정상 범위 바 위에 현재값 마커를 표시하는 수평 게이지

  [0%]  ──[정상 영역: 초록]──  [5%]
           ▲
         현재값
         2.8%

구체적 레이아웃:
0%       1%      2%████████3%      4%      5%
               HACCP기준↑  ↑현재값
```

#### 컴포넌트 스타일

```
전체 너비: 100px (테이블 셀 내)
높이     : 6px
범위     : 0% ~ 5%

색상 구역:
  0 ~ 2.0% 구역: #F1F5F9 (비정상 하한)
  2.0 ~ 3.0% 구역: rgba(22,163,74,0.25) — 초록 (정상)
  3.0 ~ 5.0% 구역: #F1F5F9 (비정상 상한)

현재값 마커:
  width : 2px
  height: 12px (바보다 위아래로 3px 돌출)
  color : 조건부

  정상(2.0~3.0%): #16A34A
  하한 미달(<2.0%): #0891B2
  상한 초과(>3.0%): #DC2626

현재값 텍스트:
  마커 아래 중앙 정렬
  font-size: text-xs font-semibold
  color    : 마커와 동일 조건부 색상
```

#### 테이블 셀 내 전체 구조

```tsx
<div className="flex flex-col gap-0.5">
  <SaltConcentrationIndicator value={2.8} min={2.0} max={3.0} rangeMin={0} rangeMax={5} />
  {/* 값이 범위 밖이면 경고 아이콘 추가 */}
  {isAbnormal && <ExclamationTriangleIcon className="h-3 w-3 text-[#DC2626]" />}
</div>
```

---

## 4. 인터랙션 설계

### 4a. 배치 행 클릭 → 상세 슬라이드 패널

#### 트리거

배치 테이블의 행(tr) 전체를 클릭 영역으로 설정

#### 슬라이드 패널 (SaltingDetailPanel)

```
위치    : 화면 오른쪽 고정 (position: fixed, right: 0, top: 0, height: 100vh)
너비    : w-[480px]
배경    : #FFFFFF
그림자  : shadow-2xl (좌측만: box-shadow: -4px 0 24px rgba(0,0,0,0.12))
애니메이션: translate-x-full → translate-x-0 (duration-300 ease-out)
오버레이: 배경 반투명 오버레이 bg-black/20 (클릭 시 패널 닫기)
```

#### 패널 내부 탭 구조

```
[기본정보] [소금농도 이력] [담당자 메모]
```

**기본정보 탭:**
- LOT번호, 절임통 번호, 원재료명, 투입량(kg)
- 절임 시작 시각, 목표 완료 시각, 총 절임 시간
- 담당자명, 현재 상태
- 현재 소금 농도 인디케이터 (확장형 — 패널 전체 너비 활용)
- HACCP 기준 범위 표시

**소금농도 이력 탭:**
- 해당 배치의 측정값 시계열 테이블 (측정 시각, 측정값, 측정자)

**담당자 메모 탭:**
- 텍스트 영역 (공정 특이사항 기록)

#### 패널 하단 액션 버튼

```
[+ 소금 농도 측정값 입력]  →  인라인 입력 폼 펼침
[공정 완료 처리]           →  확인 모달 → API 호출
[이상 보고]                →  이상 사유 입력 모달 → API 호출
```

---

### 4b. 이상 배치 자동 상단 고정

트리거 조건:
1. `status === 'abnormal'`
2. 소금 농도가 HACCP 기준 범위 이탈 (`concentration < 2.0 || concentration > 3.0`)
3. 절임 시간이 초과 (`remaining_minutes <= 0`)

처리 로직:

```tsx
// 정렬 우선순위
const sortedBatches = [...batches].sort((a, b) => {
  const aAbnormal = isAbnormal(a) ? 0 : 1
  const bAbnormal = isAbnormal(b) ? 0 : 1
  if (aAbnormal !== bAbnormal) return aAbnormal - bAbnormal
  // 이상 배치 내에서는 남은시간 오름차순 (가장 긴급한 것 위)
  return (a.remaining_minutes ?? 0) - (b.remaining_minutes ?? 0)
})
```

이상 배치 행 스타일:

```
background: rgba(220,38,38,0.06)
border-left: 3px solid #DC2626
```

---

### 4c. 소금 농도 측정값 입력 버튼

슬라이드 패널 내 버튼 클릭 시 인라인 폼이 패널 내 상단에 펼쳐진다.

```
┌─────────────────────────────────┐
│  소금 농도 측정값 입력            │
│  ─────────────────────────────  │
│  측정값(%) : [  2.8  ] %        │
│  측정 시각 : [2026-05-13 14:30] │
│  측정자    : [김철수 ▼]          │
│  메모      : [____________]      │
│                                  │
│  [저장]  [취소]                  │
└─────────────────────────────────┘
```

유효성 검사:
- 측정값 범위: 0.1 ~ 10.0 (숫자만 입력)
- HACCP 기준 이탈 시 저장 전 확인 토스트: "측정값이 HACCP 기준(2.0~3.0%)을 벗어났습니다. 이상 배치로 등록됩니까?"

---

## 5. 반응형 고려사항

### 레이아웃 전환 브레이크포인트

| 뷰포트 | 요약 카드 그리드 | 테이블 표시 방식 | 슬라이드 패널 너비 |
|-------|---------------|--------------|---------------|
| `lg` (1280px+) | 4열 | 전체 컬럼 | w-[480px] |
| `md` (768px~) | 3열 + 1열 (합격률 별도) | 일부 컬럼 숨김 | w-[360px] |
| `sm` (~767px) | 2열 | 카드형 목록으로 전환 | w-full (바텀 시트) |

### md 뷰포트에서 숨길 컬럼

- `절임시간` 컬럼 숨김 (남은시간에서 총 시간 파악 가능)
- `원재료` 컬럼: 배지 형태로 축약

### sm 뷰포트 배치 카드 (모바일)

테이블 대신 카드 목록으로 전환:

```
┌─────────────────────────────────────────┐
│  LOT-2026-SAL-001          [진행중 배지] │
│  배추 (포기김치용)    850 kg             │
│  소금농도: ████▊░░░ 2.8%  (정상)        │
│  남은시간: ▓▓▓▓▓▓▓░░ 04:23             │
│  담당: 김철수                            │
└─────────────────────────────────────────┘
```

---

## 6. 색상 가이드 (상태별 색상 표)

### 전체 색상 토큰

| 역할 | 색상명 | HEX | 사용처 |
|-----|-------|-----|-------|
| 김치 레드 (Primary) | `kimchi-red` | `#DC2626` | 이상 상태, 긴급 경고, active 메뉴 |
| 파 블루시안 (Secondary) | `scallion-blue` | `#0891B2` | 진행중 상태, 파란 강조, 카운트다운 |
| 페이지 배경 | `page-bg` | `#F0F9FF` | 전체 페이지 배경 |
| 카드 배경 | `card-white` | `#FFFFFF` | 카드, 패널, 테이블 |
| 성공/완료 | `success` | `#16A34A` | 완료 상태, 소금농도 정상 |
| 경고/주의 | `warning` | `#D97706` | 30분 이내 카운트다운, amber 상태 |
| 비활성 | `muted` | `#94A3B8` | 대기 상태, 보조 텍스트 |
| 텍스트 기본 | `text-base` | `#0F172A` | 메인 텍스트 |
| 텍스트 보조 | `text-sub` | `#64748B` | 카드 제목, 헤더 |
| 구분선 | `divider` | `#F1F5F9` | 테이블 행 구분, 섹션 구분 |

### 상태별 색상 요약

| 상태 | 배지 배경 | 배지 텍스트 | 행 배경 | 카운트다운 |
|-----|---------|-----------|-------|----------|
| 대기 | `rgba(148,163,184,0.15)` | `#64748B` | 없음 | — |
| 진행중 | `rgba(8,145,178,0.12)` | `#0891B2` | 없음 | `#0891B2` (정상) / `#D97706` (30분 이내) |
| 완료 | `rgba(22,163,74,0.12)` | `#16A34A` | 없음 | — |
| 이상 | `rgba(220,38,38,0.15)` | `#DC2626` | `rgba(220,38,38,0.06)` | `#DC2626` |

### HACCP 농도 색상

| 농도 범위 | 인디케이터 색 | 텍스트 색 |
|---------|------------|---------|
| 정상 (2.0 ~ 3.0%) | `#16A34A` | `#16A34A` |
| 하한 미달 (< 2.0%) | `#0891B2` | `#0891B2` |
| 상한 초과 (> 3.0%) | `#DC2626` | `#DC2626` |

---

## 7. API 데이터 → UI 매핑 테이블

### API 응답 타입 (예상)

```typescript
// frontend/src/types/salting.ts (신규 생성 예정)

export interface SaltingBatch {
  id: string                          // DB PK
  lot_number: string                  // "LOT-2026-SAL-001"
  tank_id: string                     // "TANK-03"
  material_name: string               // "배추"
  material_type: string               // "포기김치용"
  input_weight_kg: number             // 850
  salt_concentration_pct: number      // 2.8
  salting_duration_hours: number      // 12
  started_at: string                  // ISO8601 "2026-05-13T08:30:00"
  target_end_at: string               // ISO8601 "2026-05-13T20:30:00"
  remaining_minutes: number           // 실시간 계산값 (서버 제공 또는 클라이언트 계산)
  worker_name: string                 // "김철수"
  status: 'waiting' | 'in_progress' | 'completed' | 'abnormal'
  haccp_ok: boolean                   // HACCP 기준 충족 여부
}

export interface SaltingSummary {
  in_progress_count: number           // 진행중 배치 수
  abnormal_count: number              // 이상 배치 수
  tank_in_use_count: number           // 사용 중인 절임통 수
  completed_today_count: number       // 오늘 완료 수
  target_today_count: number          // 오늘 목표 수
  salt_used_kg: number                // 소금 사용량
  salt_planned_kg: number             // 계획 소금 사용량
  quality_pass_rate: number           // 품질 합격률 (0~100)
}

export interface SaltConcentrationRecord {
  measured_at: string                 // ISO8601
  concentration_pct: number          // 측정 농도
  measured_by: string                // 측정자
  note?: string                       // 메모
  batch_id: string                    // 배치 ID
}
```

### 필드별 UI 매핑

| API 필드 | UI 위치 | 표시 방식 | 포맷 |
|---------|--------|---------|-----|
| `lot_number` | 테이블 1열 | 텍스트 링크 (클릭 → 패널) | 원본 |
| `material_name` + `material_type` | 테이블 2열 | 텍스트 + 소형 배지 | "{name} ({type})" |
| `input_weight_kg` | 테이블 3열 | 숫자 + 단위 | `{n.toLocaleString()} kg` |
| `salt_concentration_pct` | 테이블 4열 | SaltConcentrationIndicator | `{v.toFixed(1)}%` |
| `salting_duration_hours` | 테이블 5열 | 텍스트 | `{n}h` |
| `remaining_minutes` | 테이블 6열 | SaltingCountdown | `HH:MM` + 프로그레스바 |
| `worker_name` | 테이블 7열 | 텍스트 | 원본 |
| `status` | 테이블 8열 | SaltingStatusBadge | 한글 변환 |
| `haccp_ok` | 행 스타일 | 이상 행 강조 | boolean → 조건부 스타일 |
| `in_progress_count` | 요약 카드 1 mainValue | 숫자 | `{n} 건` |
| `abnormal_count` | 요약 카드 1 sub1 | 텍스트 | `이상 {n}건` |
| `completed_today_count` | 요약 카드 2 mainValue | 숫자 | `{n} 건` |
| `salt_used_kg` | 요약 카드 3 mainValue | 숫자 | `{n} kg` |
| `quality_pass_rate` | 요약 카드 4 mainValue | 퍼센트 | `{n.toFixed(1)}%` |

### 실시간 카운트다운 계산 로직

서버에서 `remaining_minutes` 필드를 제공하면 클라이언트는 이 값을 초기값으로 사용하고,
이후 `setInterval(1000)`으로 1초씩 차감하여 표시한다. 단, 주기적 API 폴링(30초 간격)으로
서버 값과 재동기화한다.

```typescript
// hooks/useSaltingCountdown.ts (신규 생성 예정)
function useSaltingCountdown(initialMinutes: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialMinutes * 60)

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = Math.floor(Math.abs(remainingSeconds) / 3600)
  const minutes = Math.floor((Math.abs(remainingSeconds) % 3600) / 60)
  const isOvertime = remainingSeconds < 0

  return { hours, minutes, isOvertime, remainingSeconds }
}
```

### API 엔드포인트 예상

| 목적 | Method | 경로 |
|-----|-------|-----|
| 요약 정보 조회 | GET | `/api/v1/process/salting/summary` |
| 배치 목록 조회 | GET | `/api/v1/process/salting/batches?date=&status=&material_type=` |
| 배치 상세 조회 | GET | `/api/v1/process/salting/batches/{id}` |
| 소금 농도 측정값 입력 | POST | `/api/v1/process/salting/batches/{id}/concentration` |
| 공정 완료 처리 | PATCH | `/api/v1/process/salting/batches/{id}/complete` |
| 이상 보고 | POST | `/api/v1/process/salting/batches/{id}/abnormal` |
| 농도 이력 조회 | GET | `/api/v1/process/salting/batches/{id}/concentration-history` |

---

## 8. 컴포넌트 파일 구조 (구현 시 참고)

```
frontend/src/
├── app/
│   └── (dashboard)/
│       └── process/
│           └── salting/
│               └── page.tsx                        ← 페이지 진입점
├── components/
│   └── features/
│       └── salting/
│           ├── SaltingSummaryCards.tsx             ← 요약 카드 4개
│           ├── SaltingBatchTable.tsx               ← 배치 테이블
│           ├── SaltingStatusBadge.tsx              ← 상태 배지
│           ├── SaltingCountdown.tsx                ← 카운트다운
│           ├── SaltConcentrationIndicator.tsx      ← 농도 인디케이터
│           ├── SaltingDetailPanel.tsx              ← 슬라이드 패널
│           ├── SaltingFilterBar.tsx                ← 필터바
│           └── SaltConcentrationChart.tsx          ← 농도 이력 차트
├── hooks/
│   ├── useSaltingBatches.ts                        ← 배치 목록 쿼리
│   ├── useSaltingSummary.ts                        ← 요약 쿼리
│   └── useSaltingCountdown.ts                      ← 카운트다운 로직
└── types/
    └── salting.ts                                  ← 타입 정의
```

---

## 9. 접근성 (WCAG 2.1 AA) 체크리스트

- [ ] 상태 배지: 색상만으로 구분하지 않고 텍스트 레이블 필수 포함
- [ ] 카운트다운: `aria-live="polite"` 적용 (스크린 리더가 주기적으로 읽도록)
- [ ] 이상 배치 경고: `role="alert"` + `aria-live="assertive"`
- [ ] 테이블: `<caption>`, `<th scope="col">` 올바른 시맨틱 마크업
- [ ] 슬라이드 패널: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` 설정
- [ ] 포커스 트랩: 슬라이드 패널 열림 시 패널 내부로 포커스 이동
- [ ] 키보드 접근: 패널 닫기 `Escape` 키 지원
- [ ] 색상 대비: 모든 텍스트 4.5:1 이상 (특히 배지 텍스트)
- [ ] 애니메이션: `prefers-reduced-motion` 미디어 쿼리로 `animate-pulse` 비활성화 가능

```css
/* globals.css에 추가 필요 */
@media (prefers-reduced-motion: reduce) {
  .animate-pulse {
    animation: none;
  }
}
```
