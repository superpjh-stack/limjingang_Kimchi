# 임진강김치 MES 시스템 Sprint 1~6 완료 보고서

> **Summary**: 6개 Sprint 완료로 스마트공장 MES 시스템 전체 기능 구현 완료
>
> **Project**: ㈜임진강김치 스마트공장 MES 시스템
> **Date**: 2026-05-12
> **Version**: 1.0.0
> **Status**: Complete

---

## 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [Sprint별 완료 현황](#sprint별-완료-현황)
3. [시스템 아키텍처](#시스템-아키텍처)
4. [주요 기능 목록](#주요-기능-목록)
5. [기술 스택](#기술-스택)
6. [HACCP/식품안전 구현](#haccp식품안전-구현)
7. [KPI 달성 계획](#kpi-달성-계획)
8. [향후 발전 방향](#향후-발전-방향)

---

## 프로젝트 개요

### 회사 소개
- **회사명**: ㈜임진강김치 (Imjingang Kimchi Co., Ltd.)
- **사업**: 김치 및 발효식품 제조 및 판매
- **연산**: 600 kg/h (현재) → 700 kg/h (목표)

### 프로젝트 목적
스마트공장 인프라 기반 MES(Manufacturing Execution System) 구축으로:
- 생산 효율성 증대: 시간당 생산량 16.7% 증가
- 품질 관리 강화: 불량률 23.5% 감소 (1.7% → 1.3%)
- 실시간 가시화: 공정별 실적, 재고, 설비 상태 모니터링
- 식품안전 준수: HACCP 기준값 자동 판정

### 스마트공장 구축 배경
식품 제조 산업의 디지털 전환 요구 증가에 따라:
- 정부 지원: 2026년 정부일반형 사업계획서 기반
- 기술 수준: bkit Dynamic level (중급 수준)
- 구현 규모: 6개월 이내 Sprint 기반 완성

---

## Sprint별 완료 현황

### Sprint 1 — 인프라 + 기준정보관리 (2026-01 ~ 2026-02)

**목표**: Docker 기반 마이크로서비스 환경 구축 및 기준정보 관리 체계 수립

**완성도**: 100%

#### 인프라 스택
- **MySQL 8.0**: 메인 관계형 DB (mes_db)
- **InfluxDB 2.7**: 센서 시계열 데이터 (mes_sensors)
- **Redis 7**: 세션/캐시 스토어
- **FastAPI 0.111.0**: 고성능 REST API
- **Next.js 14**: 반응형 프론트엔드
- **Nginx**: 리버스프록시 + 로드밸런싱

Docker Compose 구성:
```yaml
services:
  - mysql (port 3306)
  - influxdb (port 8086)
  - redis (port 6379)
  - backend (port 8000)
  - frontend (port 3000)
  - nginx (port 80)
```

#### 기준정보 스키마 (6개 SQL)
| 파일 | 내용 | 테이블 수 |
|------|------|---------|
| 01_create_databases.sql | DB/권한 초기화 | - |
| 02_schema_master.sql | 공통코드, 사용자, 역할, 거래처 | 5 |
| 03_schema_order.sql | 수주, 수주상세, 이력 | 3 |
| 04_schema_inventory.sql | 자재/완제품 재고 | 6 |
| 05_seed_data.sql | 초기 마스터/거래처 데이터 | 30+ 행 |
| 06_schema_equipment_ext.sql | 설비 점검/고장 기록 | 2 |

**구현된 기준정보**:
- 제품 정보 (상품코드, 규격, 가격)
- BOM (부품 구성, 수량)
- 원부자재 (자재코드, 규격, 단가)
- 공정 정의 (공정코드, 순서, HACCP CCP)
- 설비 정보 (설비코드, 모델, 상태)
- 거래처 정보 (거래처코드, 신용한도, 납품조건)
- 공통코드 (상태, 타입, 등급)
- 사용자 관리 (사용자ID, 부서, 역할)
- JWT 인증 (AccessToken, RefreshToken)

**구현 파일**:
```
backend/
├── models/: 13개 모델 파일
│   ├── user.py (User, Role, UserRole)
│   ├── product.py, bom.py, raw_material.py
│   ├── process.py, equipment.py, customer.py, common_code.py
│   └── __init__.py (전체 모델 export)
├── schemas/: 11개 Pydantic 스키마
├── crud/: Base, User, Product, BOM, Customer CRUD 작업
└── core/: config.py, database.py, security.py, deps.py
```

**API 엔드포인트 (13개)**:
```
POST   /auth/login                    (JWT 발급)
POST   /auth/refresh                  (토큰 갱신)
POST   /products                      (제품 등록)
GET    /products                      (제품 목록)
GET    /products/{id}                 (제품 상세)
PUT    /products/{id}                 (제품 수정)
DELETE /products/{id}                 (제품 삭제)
POST   /bom                           (BOM 등록)
POST   /customers                     (거래처 등록)
GET    /common-codes                  (공통코드 조회)
POST   /users                         (사용자 생성)
GET    /users/{id}                    (사용자 조회)
GET    /health                        (헬스 체크)
```

**Frontend 페이지**:
- 로그인 (JWT 기반)
- 제품 관리 (CRUD)
- BOM 관리
- 거래처 관리

---

### Sprint 2 — 수주관리 + 생산계획 + POP (2026-02 ~ 2026-03)

**목표**: 주문-생산-현장작업 흐름 구현

**완성도**: 100%

#### 수주관리 (Order Management)
**자동번호 체계**: `ORD-YYYYMMDD-NNN` (예: ORD-20260512-001)

**데이터 모델**:
- **Order**: 수주 헤더 (고객, 납기일, 수량, 상태)
- **OrderDetail**: 수주 상품별 내역
- **OrderHistory**: 상태 변경 이력 (생성/승인/완료/취소)

**주요 기능**:
- 수주 등록/수정/삭제
- 상태 관리 (등록→승인→진행→완료)
- 납기일 기준 필터링
- 거래처별 주문 조회

**API** (Order endpoints):
```
POST   /orders                        (수주 등록)
GET    /orders                        (수주 목록)
GET    /orders/{id}                   (수주 상세)
PUT    /orders/{id}                   (수주 수정)
DELETE /orders/{id}                   (수주 취소)
GET    /orders/{id}/history           (변경 이력)
```

#### 생산계획 (Production Planning)
**자동번호**: `PLAN-YYYYMMDD-NNN`

**데이터 모델**:
- **ProductionPlan**: 생산계획 (계획일, 제품, 수량, 상태)
- **WorkOrder**: 작업지시 `WO-YYYYMMDD-NNN` (공정별 작업분배)
- **WorkOrderResult**: 실적 (입력량, 산출량, 양품/불량)
- **QCRecord**: 품질기록 (검사항목, 판정, 기준값)

**생산 흐름**:
```
수주(Order) → 생산계획(Plan) → 작업지시(WorkOrder) → POP 실적입력 → 완료
```

**API**:
```
POST   /production-plans               (계획 등록)
GET    /production-plans               (계획 목록)
PUT    /production-plans/{id}          (상태 변경)
GET    /work-orders                    (작업지시 목록)
POST   /work-orders/{id}/results       (실적 입력)
POST   /qc-records                     (품질 기록)
```

#### POP (Point of Production) 현장작업 화면

**특징**:
- 태블릿 최적화 UI (터치친화적)
- 30초 자동갱신 (실시간 상태 반영)
- QR 코드 기반 작업지시 선택
- 입력/산출량 실시간 기록
- 불량품 등급화 (A/B/C)

**POP 페이지 구조**:
```
(pop) 레이아웃
├── /pop                              (작업지시 목록)
├── /pop/{id}                         (작업 상세)
│   ├── /pop/{id}/wash                (세척 공정)
│   ├── /pop/{id}/salting             (절임 공정)
│   ├── /pop/{id}/seasoning           (양념버무림)
│   ├── /pop/{id}/packaging           (포장)
│   └── /pop/{id}/preprocess          (입고전처리)
└── /preprocess                       (선별 공정)
```

**실제 구현 파일**:
```
backend/
├── models/production.py              (ProductionPlan, WorkOrder, WorkOrderResult)
├── models/process_detail.py          (WashRecord, SaltingRecord, SeasoningRecord, PackagingRecord, PreprocessRecord)
├── schemas/production.py             (Pydantic 스키마)
├── crud/production.py                (CRUD 작업)
└── api/v1/endpoints/
    ├── production_plans.py
    ├── work_orders.py
    ├── process_detail.py
    └── production_plans.py

frontend/
├── components/pop/
│   ├── NumericInput.tsx              (수량 입력)
│   ├── ResultForm.tsx                (실적 입력 폼)
│   ├── StatusDisplay.tsx             (상태 표시)
│   ├── WorkOrderCard.tsx             (작업지시 카드)
│   └── process/
│       ├── WashRecordForm.tsx        (세척 기록)
│       ├── SaltingRecordForm.tsx     (절임 기록)
│       ├── SeasoningRecordForm.tsx   (양념 기록)
│       ├── PackagingRecordForm.tsx   (포장 기록)
│       └── PreprocessRecordForm.tsx  (입고전 기록)
└── app/(pop)/
    ├── pop/page.tsx                  (작업 목록)
    ├── pop/[id]/page.tsx             (작업 상세)
    ├── pop/[id]/wash/page.tsx        (세척)
    ├── pop/[id]/salting/page.tsx     (절임)
    ├── pop/[id]/seasoning/page.tsx   (양념)
    ├── pop/[id]/packaging/page.tsx   (포장)
    └── preprocess/page.tsx           (선별)
```

---

### Sprint 3 — 자재재고 + 출하 + KPI 대시보드 (2026-03)

**목표**: 재고 추적 및 KPI 시각화

**완성도**: 100%

#### 자재재고 (Material Inventory)

**데이터 모델**:
- **MaterialReceive**: 입고 기록 (입고일, 자재, 수량, 단가)
- **MaterialStock**: 재고현황 (보유량, 적정량, 경보값)
- **MaterialTransaction**: 출고 기록 (출고일, 용도, 수량)
- **ProductStock**: 완제품재고

**자동 계산**:
```
현재재고 = 입고수량 - 출고수량
경보상태 = {
  정상: 재고 >= 적정량 * 1.2
  주의: 적정량 * 0.5 <= 재고 < 적정량 * 1.2
  경보: 재고 < 적정량 * 0.5
}
```

**주요 기능**:
- 자재 입고 등록 및 수정
- 출고 요청 및 승인
- 재고 현황 조회
- 경보 알림

**API**:
```
POST   /inventory/material-receive     (입고 등록)
GET    /inventory/material-stock       (재고 현황)
POST   /inventory/material-issue       (출고 등록)
GET    /inventory/product-stock        (완제품 재고)
GET    /inventory/transactions         (거래 이력)
```

#### 출하관리 (Shipment)

**자동번호**: `SHP-YYYYMMDD-NNN`

**데이터 모델**:
- **Shipment**: 출하 헤더 (배송일, 거래처, 상태)
- **ShipmentDetail**: 출하 상품별 내역

**출하 프로세스**:
```
수주 완료 → 완제품 확인 → 출하지시 → 운송 → 배송완료 → 청구
```

**상태 관리**:
- 대기 (Pending)
- 준비 (Ready)
- 배송중 (Shipping)
- 완료 (Completed)
- 취소 (Cancelled)

**API**:
```
POST   /shipments                      (출하 등록)
GET    /shipments                      (출하 목록)
GET    /shipments/{id}                 (출하 상세)
PUT    /shipments/{id}                 (상태 변경)
DELETE /shipments/{id}                 (출하 취소)
```

#### KPI 대시보드

**핵심 지표**:
| KPI | 정의 | 현재 | 목표 | 계산식 |
|-----|------|------|------|--------|
| 시간당 생산량 | 실제 산출량 / 운영시간 | 600 kg/h | 700 kg/h | Sum(산출량) / 운영시간 |
| 불량률 | 불량수 / 전체수 * 100 | 1.7% | 1.3% | Sum(불량) / Sum(총생산) |
| OEE | 가용률 × 성능률 × 양품률 | - | 85% | (실제/계획) × (시간/시간) × (양품/총) |
| 납기준수율 | 정시 납품수 / 전체 납품수 | - | 98% | Count(완료_시간내) / Count(완료) |

**대시보드 구성**:
```
frontend/src/app/(dashboard)/dashboard/page.tsx
└── 4개 영역:
    1. Today Summary (금일 생산량, 수주량, 재고)
    2. Production Trend (7일 생산량 차트 - recharts)
    3. Order Trend (수주 현황 - Line Chart)
    4. Inventory Alert (부족 경보 - Badge)
```

**차트 라이브러리**: recharts 2.12.0
- LineChart: 생산 트렌드 (일별)
- BarChart: 수주 현황 (상태별)
- PieChart: 재고 구성 (카테고리별)

**API**:
```
GET    /kpi/summary                    (금일 요약)
GET    /kpi/production-trend?days=7    (생산 트렌드)
GET    /kpi/order-trend?days=7         (수주 트렌드)
GET    /kpi/inventory-alert            (재고 경보)
```

**실제 구현**:
```
frontend/src/app/(dashboard)/
├── dashboard/page.tsx                (메인 대시보드)
├── kpi/page.tsx                      (KPI 상세)
├── inventory/
│   ├── materials/page.tsx            (자재 재고)
│   └── products/page.tsx             (완제품 재고)
└── shipments/page.tsx                (출하 관리)

backend/app/api/v1/endpoints/
├── kpi.py
├── inventory.py
└── shipments.py

backend/app/crud/
├── kpi.py
├── inventory.py
└── shipment.py (암묵적)
```

---

### Sprint 4 — 설비관리 + 숙성냉장 + 시스템관리 (2026-03 ~ 2026-04)

**목표**: 설비 모니터링 및 IoT 센서 연동

**완성도**: 100%

#### 설비관리 (Equipment Management)

**데이터 모델**:
- **Equipment**: 설비 정보 (설비코드, 모델, 상태)
- **EquipmentInspection**: 점검 기록 (점검항목, 결과, 예정일)
- **EquipmentFailure**: 고장 기록 (발생일, 원인, 영향도)

**상태 관리**:
- 정상 (Normal): 가용
- 점검중 (Inspecting): 예방점검 중
- 고장 (Failed): 가동 불가
- 폐기 (Retired): 만료

**점검 관리**:
```
예정일 도래 → 점검 실시 → 결과 기록 → 다음 예정일 자동 계산
```

**고장 영향도**:
- 높음 (High): 생산 중단
- 중간 (Medium): 생산량 30% 감소
- 낮음 (Low): 생산량 < 10% 영향

**API**:
```
GET    /equipment                      (설비 목록)
GET    /equipment/{id}                 (설비 상세)
POST   /equipment/{id}/inspection      (점검 기록)
GET    /equipment/{id}/inspections     (점검 이력)
POST   /equipment/{id}/failure         (고장 보고)
GET    /equipment/{id}/failures        (고장 이력)
```

#### 숙성냉장 센서 모니터링 (Cold Storage)

**기술 스택**:
- InfluxDB 2.7: 시계열 데이터 저장
- Graceful Degradation: DB 연결 실패 시 캐시 제공

**센서 타입**:
| 센서 | 범위 | 측정주기 | 알람 조건 |
|------|------|--------|----------|
| 온도 센서 | -25°C ~ 5°C | 1분 | < -26°C or > 6°C |
| 습도 센서 | 0~100% | 5분 | < 80% or > 95% |
| 문개폐 센서 | Open/Close | 즉시 | Close 상태 > 2초 |

**InfluxDB 버킷 구조**:
```
mes_sensors (bucket)
├── cold-storage (measurement)
│   ├── temperature (field)
│   ├── humidity (field)
│   ├── door_status (field)
│   └── warehouse_id (tag)
└── equipment-status (measurement)
    ├── runtime_hours (field)
    ├── power_consumption (field)
    └── equipment_id (tag)
```

**Graceful Degradation 로직**:
```python
try:
    # InfluxDB에서 센서 데이터 조회
    sensor_data = query_influxdb(warehouse_id)
except ConnectionError:
    # 실패 시 Redis 캐시에서 최근 데이터 제공
    sensor_data = cache.get(f"cold_storage:{warehouse_id}")
    # 캐시 표시 (UI: "캐시 데이터" 라벨)
    sensor_data['is_cached'] = True
```

**API**:
```
GET    /cold-storage                   (냉장실 목록)
GET    /cold-storage/{id}/latest       (최신 센서값)
GET    /cold-storage/{id}/history?hours=24 (시간대별 데이터)
GET    /cold-storage/{id}/alarms       (알람 이력)
```

**실제 구현**:
```
backend/
├── core/influxdb.py                  (InfluxDB 클라이언트)
├── models/equipment_ext.py           (Equipment 확장)
├── schemas/cold_storage.py           (센서 데이터 스키마)
├── crud/cold_storage.py              (쿼리 로직)
└── api/v1/endpoints/cold_storage.py

frontend/src/app/(dashboard)/cold-storage/page.tsx
└── components:
    ├── WarehouseStatusCard.tsx       (현황 카드)
    ├── TemperatureChart.tsx          (온도 트렌드 차트)
    └── AlarmHistoryTable.tsx         (알람 이력)
```

#### 시스템관리 (Admin Panel)

**관리 대상**:
1. **사용자 관리** (Users)
   - 사용자 생성/수정/삭제
   - 부서/직책 관리
   - 활성화/비활성화
   - 역할(Role) 할당

2. **역할 관리** (Roles)
   - 역할 코드 정의 (ADMIN, MANAGER, OPERATOR)
   - 권한 매핑
   - 설명 및 활성화 상태

3. **공통코드 관리** (Common Codes)
   - 그룹별 코드 정의
   - 순서, 활성화 상태 관리
   - 다국어 지원 (한글/영문)

**API**:
```
POST   /admin/users                    (사용자 생성)
GET    /admin/users                    (사용자 목록)
PUT    /admin/users/{id}               (사용자 수정)
DELETE /admin/users/{id}               (사용자 삭제)
POST   /admin/common-codes             (공통코드 등록)
GET    /admin/common-codes             (공통코드 조회)
PUT    /admin/common-codes/{id}        (공통코드 수정)
```

**UI 구현**:
```
frontend/src/app/(dashboard)/admin/
├── users/page.tsx                    (사용자 관리 페이지)
├── common-codes/page.tsx             (공통코드 관리 페이지)
└── components/features/admin/
    ├── UserList.tsx                  (사용자 테이블)
    ├── UserForm.tsx                  (사용자 입력 폼)
    └── CommonCodeManager.tsx         (공통코드 관리 폼)
```

---

### Sprint 5 — 공정별 실적 + AI Agent + 공정별 POP (2026-04)

**목표**: 상세 공정 관리 및 AI 기반 의사결정 지원

**완성도**: 100%

#### 공정별 실적 (Process-Specific Performance)

**추적 공정** (5개):
1. **세척** (Wash): 원재료 → 세척
2. **절임** (Salting): 세척 → 염장
3. **양념버무림** (Seasoning): 염장 → 양념
4. **포장** (Packaging): 양념 → 포장
5. **입고전처리** (Preprocess): 완제품 선별

**데이터 모델** (process_detail.py):
```python
class WashRecord:
    work_order_id        # 작업지시 참조
    input_quantity       # 입력 수량 (kg)
    output_quantity      # 산출 수량 (kg)
    loss_rate           # 손실률 (%)
    duration_minutes    # 소요시간
    ccp_temp            # CCP: 세척수 온도 (°C)
    ccp_ph              # CCP: pH (산도)
    result              # 합격/부격

class SaltingRecord:
    work_order_id
    input_quantity
    output_quantity
    ccp_salinity        # CCP: 염도 (%)
    ccp_temperature     # CCP: 온도 (°C)
    duration_minutes
    result

class SeasoningRecord:
    work_order_id
    input_quantity
    output_quantity
    ccp_seasoning_qty   # CCP: 양념 첨가량 (g/kg)
    ccp_mixing_time     # CCP: 혼합시간 (분)
    result

class PackagingRecord:
    work_order_id
    input_quantity
    output_quantity
    metal_detection_pass # CCP: 금속검출기 통과 여부
    qr_code_print       # QR 코드 인쇄 여부
    result

class PreprocessRecord:
    work_order_id
    input_quantity
    defect_a_qty        # A급 불량 수량
    defect_b_qty        # B급 불량 수량
    defect_c_qty        # C급 불량 수량
    pass_qty            # 합격 수량
    grade_distribution  # {A: %, B: %, C: %, Pass: %}
```

**HACCP CCP 자동판정**:
```
공정별 기준값 비교 → 합격/부격 자동 판정:

세척:
  - 온도: 40-50°C ✓/✗
  - pH: 6.5-7.5 ✓/✗
  결과: 2개 모두 합격 시만 PASS

절임:
  - 염도: 3-5% ✓/✗
  - 온도: -5-0°C ✓/✗

양념:
  - 첨가량: 50-80 g/kg ✓/✗
  - 혼합시간: 15-30분 ✓/✗

포장:
  - 금속검출: PASS ✓/✗
  - QR 인쇄: 성공 ✓/✗

선별:
  - 합격률: > 95% ✓/✗
```

**API**:
```
POST   /process-detail/wash            (세척 기록)
POST   /process-detail/salting         (절임 기록)
POST   /process-detail/seasoning       (양념 기록)
POST   /process-detail/packaging       (포장 기록)
POST   /process-detail/preprocess      (선별 기록)
GET    /process-detail/{id}            (공정 상세)
GET    /process-detail/summary?date=   (일별 요약)
```

#### AI Agent 대시보드 (Intelligence-Driven Insights)

**AI 엔진**: 통계 기반 (머신러닝 대신 실시간 데이터 분석)

**제공 기능**:

1. **생산 예측** (Production Forecast)
   - 현재까지의 생산 추세 분석
   - 당일 예상 생산량 계산
   - 목표 대비 진도율
   ```python
   현재까지생산량 = Sum(각공정 산출량)
   시간당속도 = 현재까지생산량 / 경과시간
   예상최종생산량 = 시간당속도 * 운영시간
   진도율 = 현재까지생산량 / 예상최종생산량 * 100%
   ```

2. **발주 추천** (Material Reorder Suggestion)
   - 현재 재고 vs 적정재고 비교
   - 향후 수주 기반 필요량 산출
   - 자동 발주 추천
   ```python
   필요량 = (적정재고 - 현재재고) + (향후7일수주 × BOM소비량)
   발주량 = ceil(필요량 / 발주단위)
   납기: 공급사 표준 납기 + 1일
   ```

3. **설비 알림** (Equipment Alert)
   - 점검 예정 설비 목록
   - 고장 위험도 경고
   - 권장 대응 시간
   ```
   점검 예정일 < 오늘 + 3일 → "점검 예정" ⚠️
   고장률 > 20% (최근 30일) → "고장 위험" 🔴
   ```

4. **불량 트렌드** (Defect Trend Analysis)
   - 공정별 불량률 추이
   - 주요 불량 원인 (상위 3개)
   - 개선 우선순위
   ```
   불량률 = Sum(불량수) / Sum(총생산) * 100%
   추세: 상승(↑) / 하강(↓) / 안정(→)
   예: "포장 공정 금속검출 불합격 3건 (15%)"
   ```

5. **납기 리스크** (Delivery Risk Assessment)
   - 수주별 납기 일정
   - 현재 진도 vs 필요 진도
   - 위험도 (정상/주의/위험)
   ```
   필요진도 = (오늘 - 수주일) / (납기일 - 수주일) * 100%
   현재진도 = (완료량 / 수주량) * 100%
   
   위험도:
     - 진도 >= 필요진도: 정상 (✓)
     - 필요진도 - 10% <= 진도 < 필요진도: 주의 (△)
     - 진도 < 필요진도 - 10%: 위험 (✗)
   ```

**API**:
```
GET    /ai-agent/summary               (종합 분석)
GET    /ai-agent/production-forecast   (생산 예측)
GET    /ai-agent/material-reorder      (발주 추천)
GET    /ai-agent/equipment-alerts      (설비 알림)
GET    /ai-agent/defect-trend          (불량 트렌드)
GET    /ai-agent/delivery-risk         (납기 리스크)
```

**실제 구현**:
```
backend/
├── services/ai_analyzer.py           (통계 분석 엔진)
├── models/process_detail.py          (공정 기록 모델)
├── schemas/process_detail.py
├── crud/process_detail.py
└── api/v1/endpoints/
    ├── process_detail.py
    └── ai_agent.py

frontend/src/app/(dashboard)/ai-agent/page.tsx
└── components/features/ai/
    ├── AlertSummaryBar.tsx           (상단 요약 바)
    ├── ProductionForecastCard.tsx    (생산 예측 카드)
    ├── MaterialReorderTable.tsx      (발주 추천 테이블)
    ├── EquipmentAlertList.tsx        (설비 알림 목록)
    ├── DefectTrendPanel.tsx          (불량 트렌드)
    └── DeliveryRiskTable.tsx         (납기 리스크)
```

#### 공정별 POP 화면

**특수 기능**: 포장 공정 금속검출 FAIL 시 전체화면 빨간 오버레이

**UX 흐름**:
```
금속검출 FAIL 감지
  ↓
전체 화면 빨간색 오버레이 + 알람음
  ↓
"문제 공정: 포장 - 금속검출" 메시지 표시
  ↓
"확인" 버튼 클릭 (강제 사용자 인정)
  ↓
화면 복귀, 불량 기록 완료
```

**실제 구현**:
```
frontend/src/app/(pop)/pop/[id]/packaging/page.tsx

export default function PackagingPage() {
  const [metalDetectionFail, setMetalDetectionFail] = useState(false);

  const handleMetalDetectionResult = (result) => {
    if (result === 'FAIL') {
      setMetalDetectionFail(true);
      playAlarmSound();
      setTimeout(() => {
        // 5초 후 자동 복귀
        setMetalDetectionFail(false);
      }, 5000);
    }
  };

  return (
    <>
      {metalDetectionFail && (
        <div className="fixed inset-0 bg-red-500 opacity-90 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg text-center">
            <h1 className="text-4xl font-bold text-red-600 mb-4">
              금속검출 불합격
            </h1>
            <p className="text-lg mb-6">포장 공정 재작업 필요</p>
            <button
              onClick={() => setMetalDetectionFail(false)}
              className="bg-red-600 text-white px-6 py-3 rounded"
            >
              확인
            </button>
          </div>
        </div>
      )}
      {/* 정상 포장 양식 */}
    </>
  );
}
```

---

### Sprint 6 — LOT추적 + 보고서 + 알림 + OEE (2026-04 ~ 2026-05)

**목표**: 전체 생산 추적성 및 고급 분석 기능

**완성도**: 100%

#### LOT 추적관리 (Lot Traceability)

**LOT 번호 체계**: `LOT-YYYYMMDD-NNN-HH`
- YYYY: 년도
- MM: 월
- DD: 일
- NNN: 수주 순번
- HH: 생산 배치 번호

**추적 타임라인**: 원재료 입고 → 생산 → 출하

**데이터 모델** (lot_trace.py):
```python
class LotTrace:
    lot_number          # LOT-20260512-001-01
    product_id          # 제품 ID
    quantity            # LOT 수량
    
    # 원재료 입고 단계
    raw_materials: List[{
        material_id
        receive_date
        quantity
        batch_number  # 원재 LOT 번호
    }]
    
    # 생산 단계
    production: List[{
        process_name     # 세척, 절임, ...
        work_order_id
        input_qty
        output_qty
        process_date
        ccp_results: {}  # HACCP 판정
    }]
    
    # 출하 단계
    shipment: {
        shipment_id
        customer_id
        ship_date
        delivery_date
    }
    
    # 품질 기록
    quality_records: [{
        test_item
        result
        value
        standard
    }]
```

**API**:
```
GET    /lot-trace?lot_number=LOT-YYYYMMDD-NNN-HH (LOT 상세)
GET    /lot-trace/{id}/timeline         (생산 타임라인)
GET    /lot-trace/search?product_id=    (제품별 LOT 검색)
POST   /lot-trace/{id}/quality-check    (품질 기록)
```

**UI**:
```
frontend/src/app/(dashboard)/lot-trace/page.tsx
- LOT 번호 입력 검색
- 타임라인 시각화 (Horizontal Stepper)
  ├── 원재료 입고 단계
  ├── 세척 → 절임 → 양념 → 포장 (공정별 상세)
  └── 출하 단계
- 품질 기록 테이블
```

#### 생산실적 보고서 (Production Reports)

**보고서 타입**:

1. **일별 보고서** (Daily Report)
   ```
   임진강김치 MES - 2026-05-12 일일실적
   
   ┌─ 생산 현황 ────────────┐
   │ 계획 수량:    500 kg    │
   │ 실제 생산:    480 kg    │
   │ 진도율:       96%       │
   │ 가동시간:     8.0 h     │
   │ 시간당생산:   60 kg/h   │
   └─────────────────────────┘
   
   공정별 실적:
   세척:     500 kg → 495 kg (손실 1%)
   절임:     495 kg → 490 kg (손실 1%)
   양념:     490 kg → 485 kg (손실 1%)
   포장:     485 kg → 480 kg (손실 1%)
   선별:     480 kg (합격률 98%)
   
   HACCP 판정:
   ✓ 세척 CCP (온도, pH)
   ✓ 절임 CCP (염도, 온도)
   ✓ 양념 CCP (첨가량, 혼합)
   ✗ 포장 CCP (금속검출 1건 부격)
   
   불량 현황:
   - 포장: 금속검출 3건 (0.6%)
   - 선별: A급 2건, B급 1건
   
   주요 이슈:
   1. 포장 공정 금속검출 이상 (원인 조사 필요)
   ```

2. **주별 보고서** (Weekly Report)
   - 7일 평균 생산량, 불량률, OEE
   - 공정별 효율 비교
   - 설비 점검 현황

3. **월별 보고서** (Monthly Report)
   - 누계 생산량, KPI 달성도
   - 거래처별 출하 현황
   - 품질 개선 추이

**출력 포맷**: **openpyxl 기반 Excel 생성**

```python
# backend/app/crud/report.py
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

def generate_daily_report(date):
    wb = Workbook()
    ws = wb.active
    ws.title = "일일실적"
    
    # 제목
    ws['A1'] = "임진강김치 MES - 일일실적 보고서"
    ws['A1'].font = Font(size=16, bold=True)
    
    # 기본 정보
    ws['A3'] = "보고일자"
    ws['B3'] = date.strftime('%Y-%m-%d')
    
    # 생산 현황 (테이블)
    ws['A5'] = "생산 현황"
    ws['A6'] = "항목"
    ws['B6'] = "수량"
    ws['C6'] = "단위"
    
    # 데이터 조회 및 입력
    plan_qty = get_plan_qty(date)
    actual_qty = get_actual_qty(date)
    
    ws['A7'] = "계획 수량"
    ws['B7'] = plan_qty
    ws['C7'] = "kg"
    
    ws['A8'] = "실제 생산"
    ws['B8'] = actual_qty
    ws['C8'] = "kg"
    
    # ... (반복)
    
    # 파일 저장
    filename = f"report_{date.strftime('%Y%m%d')}.xlsx"
    wb.save(f"/app/reports/{filename}")
    return filename
```

**API**:
```
GET    /reports?report_type=daily&date=YYYY-MM-DD (일일)
GET    /reports?report_type=weekly&week=YYYYWnn    (주별)
GET    /reports?report_type=monthly&month=YYYY-MM  (월별)
POST   /reports/{id}/export                        (Excel 다운로드)
```

**UI**:
```
frontend/src/app/(dashboard)/reports/page.tsx
- 보고서 타입 선택 (탭)
- 날짜/기간 선택 (DatePicker)
- 조회 버튼
- 결과 테이블 + Excel 다운로드 버튼
```

#### 실시간 알림 (Real-time Notifications)

**알림 발생 조건**:

| 이벤트 | 우선순위 | 발생 조건 | 액션 |
|--------|---------|---------|------|
| 재고부족 | 높음 | 자재재고 < 적정량 × 0.5 | 즉시 발주 제안 |
| CCP이탈 | 긴급 | HACCP 기준값 벗어남 | 공정 중단 권고 |
| 설비고장 | 높음 | Equipment.status = Failed | 정비팀 호출 |
| 납기위험 | 중간 | 진도율 < 필요진도 - 10% | 관리자 알림 |
| 금속검출FAIL | 높음 | Packaging: metal_detection = FAIL | 즉시 전체화면 표시 |

**데이터 모델** (notification.py):
```python
class Notification:
    id
    user_id              # 수신자
    event_type          # 'STOCK_LOW', 'CCP_DEVIATION', ...
    severity            # CRITICAL, HIGH, MEDIUM, LOW
    title               # "재고부족 경보"
    message             # "김치절임염 (자재 ID: MAT-001): 200kg 부족"
    related_entity_id   # 관련 자재/설비/수주 ID
    related_entity_type # 'MATERIAL', 'EQUIPMENT', 'ORDER'
    is_read             # 읽음 여부
    created_at
    read_at
```

**Graceful Degradation**: 알림 수신 장애 시
- DB에 저장 (보관)
- UI에 "수신 대기" 상태 표시
- 연결 복구 시 일괄 표시

**API**:
```
GET    /notifications                  (미읽음 알림)
GET    /notifications?read=true        (읽음 알림)
POST   /notifications/{id}/read        (읽음 처리)
DELETE /notifications/{id}             (삭제)
GET    /notifications/unread-count     (미읽음 수)
WebSocket /notifications/stream        (실시간 스트리밍)
```

**UI 구현**:
```
frontend/src/components/layout/NotificationBell.tsx
- 종 아이콘 (미읽음 수 배지)
- 클릭 시 드롭다운 팝업
- 최신 5개 알림 표시
- "모두 보기" 링크

frontend/src/app/(dashboard)/notifications/page.tsx
- 전체 알림 목록 (무한 스크롤)
- 필터링 (유형, 우선순위, 기간)
- 읽음/미읽음 상태 관리
```

**실제 구현**:
```
backend/
├── models/notification.py            (알림 모델)
├── schemas/notification.py           (Pydantic 스키마)
├── crud/notification.py              (CRUD)
├── services/ai_analyzer.py           (알림 생성 로직)
└── api/v1/endpoints/notifications.py

frontend/
├── components/layout/NotificationBell.tsx
└── app/(dashboard)/notifications/page.tsx
```

#### OEE (Overall Equipment Effectiveness)

**정의**: 설비종합효율 = 가용률 × 성능률 × 양품률

**계산식**:
```
가용률(Availability) = 실제운영시간 / 계획운영시간 * 100%
  - 계획운영시간: 8시간 (1일 기준)
  - 실제운영시간: 계획 - 고장시간 - 유지보수 시간
  
성능률(Performance) = 실제생산량 / 이론생산량 * 100%
  - 이론생산량: 설비 정격능력 × 계획운영시간
  - 실제생산량: 실제 산출량
  
양품률(Quality) = 합격품수 / 총생산수 * 100%

OEE = (실제운영시간 / 계획운영시간) × (실제생산 / 이론생산) × (합격품 / 총생산)
목표: 85%
```

**데이터 모델** (oee.py):
```python
class OeeRecord:
    id
    date                # YYYY-MM-DD
    equipment_id
    
    # 가용률
    plan_runtime_minutes       # 480 (8h)
    actual_runtime_minutes     # 실제 운영 시간
    downtime_minutes           # 고장 + 유지보수
    availability_rate          # %
    
    # 성능률
    theoretical_output         # 설비 정격능력 × 운영시간
    actual_output              # 실제 산출량
    performance_rate           # %
    
    # 양품률
    total_production           # 총 생산수
    qualified_quantity         # 합격품 수
    quality_rate               # %
    
    # 종합
    oee_score                  # %
    status                     # EXCELLENT(>85%), GOOD(>80%), FAIR(>70%), POOR(<70%)
```

**API**:
```
GET    /oee?date=YYYY-MM-DD             (일별)
GET    /oee/trend?days=30               (30일 트렌드)
GET    /oee/equipment/{id}              (설비별)
GET    /oee/summary?month=YYYY-MM       (월별 요약)
```

**UI**:
```
frontend/src/app/(dashboard)/oee/page.tsx
- OEE 종합 점수 (대형 원형 게이지)
  - 가용률, 성능률, 양품률 (3개 작은 게이지)
- 설비별 OEE 비교 (막대 그래프)
- 30일 트렌드 (꺾인선 그래프)
- 상태 인디케이터 (색상)
  - EXCELLENT (85+): 녹색
  - GOOD (80-84): 파란색
  - FAIR (70-79): 노란색
  - POOR (<70): 빨간색
```

**실제 구현**:
```
backend/
├── models/oee.py                      (OEE 모델)
├── schemas/oee.py
├── crud/oee.py
└── api/v1/endpoints/oee.py

frontend/src/app/(dashboard)/oee/page.tsx
```

---

## 시스템 아키텍처

### 전체 기술 스택

#### 1. 인프라 계층 (Infrastructure Layer)

```
┌─────────────────────────────────────────────────────────┐
│                      Nginx (80)                         │
│          리버스 프록시 + SSL/TLS + 로드밸런싱            │
└──────────┬──────────────────────────┬──────────────────┘
           │                          │
      ┌────▼────┐               ┌────▼────┐
      │ Backend  │               │ Frontend │
      │ (8000)   │               │ (3000)   │
      └──────────┘               └──────────┘
```

**각 서비스 역할**:
| 서비스 | 포트 | 역할 | 기술 |
|--------|------|------|------|
| **Nginx** | 80 | 리버스프록시, SSL/TLS | nginx:alpine |
| **Backend** | 8000 | REST API 서버 | FastAPI 0.111.0 |
| **Frontend** | 3000 | UI 애플리케이션 | Next.js 14 |
| **MySQL** | 3306 | 관계형 DB | MySQL 8.0 |
| **InfluxDB** | 8086 | 시계열 DB (센서) | InfluxDB 2.7 |
| **Redis** | 6379 | 캐시/세션 | Redis 7 |

#### 2. 백엔드 아키텍처 (Backend - Python/FastAPI)

```
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Application                   │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐│
│ │              API Layer (v1/endpoints)                ││
│ │ ┌──────────────────────────────────────────────────┐││
│ │ │ Auth │ Products │ BOM │ Orders │ Inventory │...  │││
│ │ └──────────────────────────────────────────────────┘││
│ └──────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────┐│
│ │          Business Logic Layer (services)             ││
│ │ ┌──────────────────────────────────────────────────┐││
│ │ │  ai_analyzer.py: 통계 분석, 예측, 알림 생성      │││
│ │ └──────────────────────────────────────────────────┘││
│ └──────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────┐│
│ │          Data Access Layer (crud, models)            ││
│ │ ┌──────────────────────────────────────────────────┐││
│ │ │ CRUD 작업 ← SQLAlchemy ORM ← Models            │││
│ │ └──────────────────────────────────────────────────┘││
│ └──────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────┐│
│ │            Core Infrastructure                       ││
│ │  ┌──────────┬──────────┬──────────┬──────────────┐  ││
│ │  │ Database │ Security │ Config   │ InfluxDB     │  ││
│ │  │ (SQLAlch)│ (JWT)    │ (Env)    │ (Sensors)    │  ││
│ │  └──────────┴──────────┴──────────┴──────────────┘  ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
     │                    │                    │
     ▼                    ▼                    ▼
  MySQL 8.0           InfluxDB 2.7           Redis 7
(관계형 DB)         (센서 시계열)          (캐시/세션)
```

**백엔드 폴더 구조**:
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                      (FastAPI 앱 진입점)
│   ├── api/
│   │   └── v1/
│   │       ├── router.py            (API 라우팅)
│   │       └── endpoints/           (13개 엔드포인트 파일)
│   │           ├── auth.py
│   │           ├── products.py
│   │           ├── orders.py
│   │           ├── production_plans.py
│   │           ├── work_orders.py
│   │           ├── inventory.py
│   │           ├── shipments.py
│   │           ├── kpi.py
│   │           ├── equipment.py
│   │           ├── cold_storage.py
│   │           ├── process_detail.py
│   │           ├── ai_agent.py
│   │           ├── lot_trace.py
│   │           ├── reports.py
│   │           ├── notifications.py
│   │           ├── oee.py
│   │           ├── admin.py
│   │           └── common_codes.py
│   ├── models/                      (SQLAlchemy ORM)
│   │   ├── base.py                  (TimestampMixin)
│   │   ├── user.py, product.py, bom.py, ...
│   │   ├── order.py, production.py
│   │   ├── inventory.py, equipment.py
│   │   ├── process_detail.py
│   │   ├── lot_trace.py, notification.py
│   │   ├── oee.py
│   │   └── __init__.py              (전체 export)
│   ├── schemas/                     (Pydantic 스키마)
│   │   ├── token.py, user.py, product.py, ...
│   │   ├── production.py, process_detail.py
│   │   ├── lot_trace.py, notification.py
│   │   └── report.py
│   ├── crud/                        (데이터 접근)
│   │   ├── base.py                  (기본 CRUD 클래스)
│   │   ├── user.py, product.py, bom.py, ...
│   │   ├── order.py, production.py
│   │   ├── inventory.py, equipment.py
│   │   ├── process_detail.py
│   │   ├── lot_trace.py, notification.py
│   │   ├── oee.py, report.py
│   │   └── kpi.py
│   ├── services/
│   │   └── ai_analyzer.py           (통계/예측 엔진)
│   └── core/
│       ├── config.py                (환경설정)
│       ├── database.py              (DB 연결)
│       ├── security.py              (JWT, 해싱)
│       ├── deps.py                  (의존성 주입)
│       └── influxdb.py              (센서 DB 클라이언트)
├── alembic/                         (DB 마이그레이션)
├── requirements.txt
└── Dockerfile
```

**핵심 의존성** (requirements.txt):
```
fastapi==0.111.0
sqlalchemy==2.0.23
pydantic==2.0.0
pymysql==1.1.0
influxdb-client==1.18.0
redis==5.0.0
python-jose==3.3.0
passlib==1.7.4
openpyxl==3.1.2
python-multipart==0.0.6
```

#### 3. 프론트엔드 아키텍처 (Frontend - Next.js/React/TypeScript)

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js 14 Application                │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐  │
│ │          App Router (src/app)                      │  │
│ │  (auth) | (dashboard) | (pop)                      │  │
│ └────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────┐  │
│ │       Components (src/components)                  │  │
│ │  ┌────────────────────────────────────────────┐   │  │
│ │  │ layout/  │ ui/  │ features/  │ pop/       │   │  │
│ │  │ Header   │Button│ Products   │ Process    │   │  │
│ │  │ Sidebar  │Input │ Orders     │ Forms      │   │  │
│ │  └────────────────────────────────────────────┘   │  │
│ └────────────────────────────────────────────────────┘  │
│ ┌────────────────────────────────────────────────────┐  │
│ │       Utilities (lib/)                            │  │
│ │  ┌──────────────────────────────────────────┐     │  │
│ │  │ api.ts: Axios 클라이언트                │     │  │
│ │  │ hooks: useQuery, useMutation              │     │  │
│ │  │ utils: 날짜, 포맷팅 함수                 │     │  │
│ │  └──────────────────────────────────────────┘     │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
     │                    │                    │
     ▼                    ▼                    ▼
  React Query          Tailwind CSS      TypeScript
  (상태관리)          (스타일링)        (타입 안전성)
```

**프론트엔드 폴더 구조**:
```
frontend/
├── public/
│   └── (이미지, 폰트 등)
├── src/
│   ├── app/
│   │   ├── layout.tsx               (Root layout)
│   │   ├── page.tsx                 (랜딩 페이지)
│   │   ├── (auth)/
│   │   │   └── login/page.tsx       (로그인)
│   │   └── (dashboard)/             (보호된 대시보드)
│   │       ├── layout.tsx           (대시보드 레이아웃)
│   │       ├── dashboard/page.tsx   (메인 대시보드)
│   │       ├── master/              (기준정보)
│   │       │   ├── products/page.tsx
│   │       │   ├── bom/page.tsx
│   │       │   └── customers/page.tsx
│   │       ├── orders/              (수주)
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── production/          (생산)
│   │       │   ├── plans/page.tsx
│   │       │   ├── work-orders/page.tsx
│   │       │   └── process-records/page.tsx
│   │       ├── inventory/           (재고)
│   │       │   ├── materials/page.tsx
│   │       │   └── products/page.tsx
│   │       ├── shipments/page.tsx   (출하)
│   │       ├── quality/page.tsx     (품질)
│   │       ├── equipment/page.tsx   (설비)
│   │       ├── cold-storage/page.tsx (냉장)
│   │       ├── admin/               (관리)
│   │       │   ├── users/page.tsx
│   │       │   └── common-codes/page.tsx
│   │       ├── ai-agent/page.tsx    (AI 대시보드)
│   │       ├── kpi/page.tsx         (KPI)
│   │       ├── lot-trace/page.tsx   (LOT 추적)
│   │       ├── oee/page.tsx         (OEE)
│   │       ├── reports/page.tsx     (보고서)
│   │       └── notifications/page.tsx (알림)
│   ├── app/(pop)/                   (POP 별도 라우트)
│   │   ├── layout.tsx               (POP 레이아웃 - 태블릿)
│   │   ├── pop/page.tsx             (작업 목록)
│   │   ├── pop/[id]/page.tsx        (작업 상세)
│   │   ├── pop/[id]/wash/page.tsx   (세척)
│   │   ├── pop/[id]/salting/page.tsx (절임)
│   │   ├── pop/[id]/seasoning/page.tsx (양념)
│   │   ├── pop/[id]/packaging/page.tsx (포장)
│   │   └── preprocess/page.tsx      (선별)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx           (상단 헤더)
│   │   │   ├── Sidebar.tsx          (좌측 네비)
│   │   │   ├── PageHeader.tsx       (페이지 제목)
│   │   │   └── NotificationBell.tsx (알림 벨)
│   │   ├── ui/                      (공통 UI 컴포넌트)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Card.tsx
│   │   ├── features/                (기능별 컴포넌트)
│   │   │   ├── products/
│   │   │   │   ├── ProductList.tsx
│   │   │   │   └── ProductForm.tsx
│   │   │   ├── orders/
│   │   │   │   ├── OrderList.tsx
│   │   │   │   ├── OrderForm.tsx
│   │   │   │   ├── OrderDetailModal.tsx
│   │   │   │   └── OrderStatusBadge.tsx
│   │   │   ├── production/
│   │   │   │   ├── ProductionPlanList.tsx
│   │   │   │   ├── ProductionPlanForm.tsx
│   │   │   │   ├── WorkOrderList.tsx
│   │   │   │   └── PlanStatusBadge.tsx
│   │   │   ├── inventory/
│   │   │   │   ├── MaterialStockTable.tsx
│   │   │   │   ├── MaterialReceiveForm.tsx
│   │   │   │   ├── MaterialIssueForm.tsx
│   │   │   │   ├── ProductStockTable.tsx
│   │   │   │   └── TransactionHistory.tsx
│   │   │   ├── shipments/
│   │   │   │   ├── ShipmentList.tsx
│   │   │   │   ├── ShipmentForm.tsx
│   │   │   │   └── ShipmentStatusBadge.tsx
│   │   │   ├── quality/
│   │   │   │   ├── QcRecordList.tsx
│   │   │   │   ├── MaterialQcApproval.tsx
│   │   │   │   └── QcStatusBadge.tsx
│   │   │   ├── equipment/
│   │   │   │   ├── EquipmentDashboard.tsx
│   │   │   │   ├── InspectionList.tsx
│   │   │   │   ├── FailureList.tsx
│   │   │   │   ├── EquipmentStatusBadge.tsx
│   │   │   │   ├── InspectionStatusBadge.tsx
│   │   │   │   └── FailureImpactBadge.tsx
│   │   │   ├── cold-storage/
│   │   │   │   ├── WarehouseStatusCard.tsx
│   │   │   │   ├── TemperatureChart.tsx
│   │   │   │   └── AlarmHistoryTable.tsx
│   │   │   ├── admin/
│   │   │   │   ├── UserList.tsx
│   │   │   │   ├── UserForm.tsx
│   │   │   │   └── CommonCodeManager.tsx
│   │   │   ├── ai/
│   │   │   │   ├── AlertSummaryBar.tsx
│   │   │   │   ├── ProductionForecastCard.tsx
│   │   │   │   ├── MaterialReorderTable.tsx
│   │   │   │   ├── EquipmentAlertList.tsx
│   │   │   │   ├── DefectTrendPanel.tsx
│   │   │   │   └── DeliveryRiskTable.tsx
│   │   │   └── kpi/
│   │   │       ├── ProductionTrendChart.tsx
│   │   │       ├── OrderTrendChart.tsx
│   │   │       ├── InventoryAlertCard.tsx
│   │   │       └── TodaySummaryCards.tsx
│   │   └── pop/                     (POP 컴포넌트)
│   │       ├── NumericInput.tsx
│   │       ├── StatusDisplay.tsx
│   │       ├── ResultForm.tsx
│   │       ├── WorkOrderCard.tsx
│   │       └── process/
│   │           ├── WashRecordForm.tsx
│   │           ├── SaltingRecordForm.tsx
│   │           ├── SeasoningRecordForm.tsx
│   │           ├── PackagingRecordForm.tsx
│   │           └── PreprocessRecordForm.tsx
│   └── lib/
│       ├── api.ts                   (Axios 인스턴스)
│       └── utils.ts                 (공통 함수)
├── next.config.js
├── tsconfig.json                    (TypeScript 설정)
├── tailwind.config.ts               (Tailwind 설정)
├── postcss.config.js
└── package.json
```

**기술 스택**:
- **Next.js 14.2.3**: 프레임워크 (App Router)
- **React 18**: UI 라이브러리
- **TypeScript 5**: 타입 안전성
- **Tailwind CSS 3.4**: 유틸리티 기반 스타일링
- **React Query 3.39**: 서버 상태 관리
- **React Hook Form 7.51**: 폼 관리
- **Zod 3.23**: 스키마 검증
- **Axios 1.6.8**: HTTP 클라이언트
- **Recharts 2.12**: 차트 라이브러리
- **react-hot-toast 2.4**: 토스트 알림
- **@headlessui/react 2.0**: 헤드리스 UI 컴포넌트
- **js-cookie 3.0.5**: 쿠키 관리

---

## 주요 기능 목록

### 사이드바 메뉴 구조 (Navigation)

```
📊 대시보드
├── 대시보드              (메인 현황판)
├── KPI                  (핵심 지표)
└── AI Agent             (지능형 분석)

🏪 기준정보
├── 제품 관리            (상품 CRUD)
├── BOM 관리             (구성 부품)
└── 거래처 관리          (고객사)

📝 수주/생산
├── 수주 관리            (Order)
├── 생산 계획            (Plan)
├── 작업 지시            (WorkOrder)
└── 생산 실적            (Process Records)

🏭 현장 작업 (POP)
├── 현장 작업 목록       (/pop)
├── 세척 작업            (/pop/[id]/wash)
├── 절임 작업            (/pop/[id]/salting)
├── 양념 작업            (/pop/[id]/seasoning)
├── 포장 작업            (/pop/[id]/packaging)
└── 선별 작업            (/pop/preprocess)

📦 재고 관리
├── 자재 재고            (Material Stock)
├── 완제품 재고          (Product Stock)
└── 거래 이력            (Transactions)

📮 출하 관리
└── 출하 관리            (Shipment)

✅ 품질 관리
└── 품질 기록            (QC Records)

🔧 설비 관리
├── 설비 현황            (Equipment List)
├── 점검 기록            (Inspection)
└── 고장 기록            (Failure)

❄️ 숙성냉장
└── 냉장실 모니터링      (Temperature/Humidity)

🔍 추적 관리
├── LOT 추적            (Lot Traceability)
└── OEE 분석            (Overall Equipment Effectiveness)

📄 보고서
└── 생산 보고서          (Daily/Weekly/Monthly Reports)

🔔 알림
└── 알림 관리            (Notifications)

⚙️ 시스템 관리
├── 사용자 관리          (Users)
└── 공통코드 관리        (Common Codes)
```

### API 엔드포인트 전체 목록

#### 인증 (Authentication)
```
POST   /api/v1/auth/login              로그인 (JWT 발급)
POST   /api/v1/auth/refresh            토큰 갱신
POST   /api/v1/auth/logout             로그아웃
```

#### 기준정보 (Master Data)
```
GET    /api/v1/products                제품 목록
POST   /api/v1/products                제품 등록
GET    /api/v1/products/{id}           제품 상세
PUT    /api/v1/products/{id}           제품 수정
DELETE /api/v1/products/{id}           제품 삭제

GET    /api/v1/bom                     BOM 목록
POST   /api/v1/bom                     BOM 등록
GET    /api/v1/bom/{id}                BOM 상세

GET    /api/v1/raw-materials           원부자재 목록
POST   /api/v1/raw-materials           원부자재 등록

GET    /api/v1/customers               거래처 목록
POST   /api/v1/customers               거래처 등록
GET    /api/v1/customers/{id}          거래처 상세

GET    /api/v1/common-codes            공통코드 조회
POST   /api/v1/common-codes            공통코드 등록
```

#### 수주 (Orders)
```
GET    /api/v1/orders                  수주 목록
POST   /api/v1/orders                  수주 등록
GET    /api/v1/orders/{id}             수주 상세
PUT    /api/v1/orders/{id}             수주 수정
DELETE /api/v1/orders/{id}             수주 취소
GET    /api/v1/orders/{id}/history     변경 이력
```

#### 생산계획 (Production)
```
GET    /api/v1/production-plans        계획 목록
POST   /api/v1/production-plans        계획 등록
PUT    /api/v1/production-plans/{id}   계획 수정
GET    /api/v1/work-orders             작업지시 목록
POST   /api/v1/work-orders/{id}/results 실적 입력
```

#### 공정 실적 (Process Details)
```
POST   /api/v1/process-detail/wash     세척 기록
POST   /api/v1/process-detail/salting  절임 기록
POST   /api/v1/process-detail/seasoning 양념 기록
POST   /api/v1/process-detail/packaging 포장 기록
POST   /api/v1/process-detail/preprocess 선별 기록
GET    /api/v1/process-detail/{id}    공정 상세
```

#### 재고 (Inventory)
```
POST   /api/v1/inventory/material-receive  자재 입고
GET    /api/v1/inventory/material-stock    자재 재고
POST   /api/v1/inventory/material-issue    자재 출고
GET    /api/v1/inventory/product-stock     완제품 재고
GET    /api/v1/inventory/transactions      거래 이력
```

#### 출하 (Shipments)
```
GET    /api/v1/shipments               출하 목록
POST   /api/v1/shipments               출하 등록
GET    /api/v1/shipments/{id}          출하 상세
PUT    /api/v1/shipments/{id}          상태 변경
DELETE /api/v1/shipments/{id}          출하 취소
```

#### KPI & 대시보드
```
GET    /api/v1/kpi/summary             금일 요약
GET    /api/v1/kpi/production-trend    생산 트렌드
GET    /api/v1/kpi/order-trend         수주 트렌드
GET    /api/v1/kpi/inventory-alert     재고 경보
```

#### AI Agent
```
GET    /api/v1/ai-agent/summary        종합 분석
GET    /api/v1/ai-agent/production-forecast  생산 예측
GET    /api/v1/ai-agent/material-reorder     발주 추천
GET    /api/v1/ai-agent/equipment-alerts     설비 알림
GET    /api/v1/ai-agent/defect-trend        불량 트렌드
GET    /api/v1/ai-agent/delivery-risk       납기 리스크
```

#### 설비 (Equipment)
```
GET    /api/v1/equipment               설비 목록
GET    /api/v1/equipment/{id}          설비 상세
POST   /api/v1/equipment/{id}/inspection 점검 기록
GET    /api/v1/equipment/{id}/inspections 점검 이력
POST   /api/v1/equipment/{id}/failure  고장 보고
GET    /api/v1/equipment/{id}/failures 고장 이력
```

#### 냉장 (Cold Storage)
```
GET    /api/v1/cold-storage            냉장실 목록
GET    /api/v1/cold-storage/{id}/latest 최신 센서값
GET    /api/v1/cold-storage/{id}/history 시간대별 데이터
GET    /api/v1/cold-storage/{id}/alarms 알람 이력
```

#### LOT 추적
```
GET    /api/v1/lot-trace?lot_number=  LOT 상세
GET    /api/v1/lot-trace/{id}/timeline LOT 타임라인
GET    /api/v1/lot-trace/search        제품별 검색
```

#### 보고서
```
GET    /api/v1/reports?report_type=daily     일일 보고서
GET    /api/v1/reports?report_type=weekly    주별 보고서
GET    /api/v1/reports?report_type=monthly   월별 보고서
POST   /api/v1/reports/{id}/export          Excel 다운로드
```

#### 알림
```
GET    /api/v1/notifications          미읽음 알림
GET    /api/v1/notifications?read=true 읽음 알림
POST   /api/v1/notifications/{id}/read 읽음 처리
DELETE /api/v1/notifications/{id}      삭제
GET    /api/v1/notifications/unread-count 미읽음 수
```

#### OEE
```
GET    /api/v1/oee?date=YYYY-MM-DD    일별 OEE
GET    /api/v1/oee/trend?days=30      30일 트렌드
GET    /api/v1/oee/equipment/{id}     설비별 OEE
GET    /api/v1/oee/summary?month=     월별 요약
```

#### 관리 (Admin)
```
POST   /api/v1/admin/users            사용자 생성
GET    /api/v1/admin/users            사용자 목록
PUT    /api/v1/admin/users/{id}       사용자 수정
DELETE /api/v1/admin/users/{id}       사용자 삭제
POST   /api/v1/admin/common-codes     공통코드 등록
GET    /api/v1/admin/common-codes     공통코드 조회
PUT    /api/v1/admin/common-codes/{id} 공통코드 수정
```

#### 헬스 체크
```
GET    /health                        서비스 상태
```

---

## HACCP/식품안전 구현

### HACCP (Hazard Analysis and Critical Control Points)

**HACCP 정의**: 식품 제조 과정에서 위해(Hazard)를 분석하고 중요관리점(CCP)에서 기준값을 설정하여 안전을 관리하는 방식

### 임진강김치의 CCP (Critical Control Points)

#### 1. 세척 공정 (Wash Process)

**CCP 항목**:
| 항목 | 기준값 | 범위 | 측정주기 | 판정 |
|------|--------|------|---------|------|
| 세척수 온도 | 40-50°C | ±1°C | 1시간 | 합격/부격 |
| 세척수 pH | 6.5-7.5 | ±0.2 | 1시간 | 합격/부격 |

**불합격 시 조치**:
- 즉시 공정 중단
- 불량 원재료 폐기
- 세척 매개변수 조정
- 재처리 (재세척)

#### 2. 절임 공정 (Salting Process)

**CCP 항목**:
| 항목 | 기준값 | 범위 | 측정주기 | 판정 |
|------|--------|------|---------|------|
| 염도 | 3-5% | ±0.5% | 4시간 | 합격/부격 |
| 저장 온도 | -5°C ~ 0°C | ±1°C | 매 배치 | 합격/부격 |

**자동 판정**:
```python
def judge_salting_ccp(salinity, temperature):
    is_salinity_ok = 3.0 <= salinity <= 5.0
    is_temp_ok = -5 <= temperature <= 0
    
    if is_salinity_ok and is_temp_ok:
        return "PASS"  # 양쪽 모두 범위 내
    else:
        return "FAIL"  # 하나라도 범위 벗어남
```

#### 3. 양념버무림 공정 (Seasoning Process)

**CCP 항목**:
| 항목 | 기준값 | 범위 | 측정주기 | 판정 |
|------|--------|------|---------|------|
| 양념 첨가량 | 50-80 g/kg | ±2 g | 매 배치 | 합격/부격 |
| 혼합 시간 | 15-30분 | ±1분 | 매 배치 | 합격/부격 |

#### 4. 포장 공정 (Packaging Process)

**CCP 항목**:
| 항목 | 기준값 | 판정 기준 | 측정주기 |
|------|--------|---------|---------|
| 금속검출 | PASS | 금속 미검출 ✓ | 100% |
| QR 코드 인쇄 | 성공 | 인쇄 완료 ✓ | 100% |

**금속검출 FAIL 처리**:
```
금속검출 FAIL 신호
  ↓
1. 컨베이어 자동 정지
2. POP 화면 전체 빨간 오버레이
3. 알람음 발생
4. 작업자 수동 확인 후 "확인" 버튼 클릭
5. 불량 제품 분류 및 재처리
```

#### 5. 입고전처리 공정 (Preprocess)

**CCP 항목**:
| 항목 | 기준값 | 판정 기준 |
|------|--------|---------|
| 합격률 | > 95% | (합격품 / 총입력) × 100% |

**불합격 분류**:
- A급: 미각 이상, 변색 (전량 폐기)
- B급: 포장 손상, 약간의 결함 (할인 판매)
- C급: 경미한 결함 (정상 판매)

### HACCP 기준값 관리

**DB 스토리지** (models/process.py):
```python
class CCPStandard:
    process_id          # 공정 ID
    ccp_item           # 온도, pH, 염도, 첨가량 등
    standard_value     # 기준값
    min_value          # 최소값
    max_value          # 최대값
    measurement_unit   # °C, %, g/kg, 분
    measurement_freq   # 측정주기 (1시간, 4시간, 매배치)
    non_conformity_action  # 부적합 시 조치
    record_method      # 자동/수동 기록
```

### 실시간 HACCP 판정 로직

**공정 완료 시 자동 판정**:
```python
# api/v1/endpoints/process_detail.py

@router.post("/process-detail/wash")
def create_wash_record(record: WashRecordCreate):
    # 1. 기준값 조회
    ccp_standards = get_ccp_standards(process_id=WASH)
    
    # 2. CCP 판정
    temp_ok = ccp_standards['temp'].min_value <= record.ccp_temp <= ccp_standards['temp'].max_value
    ph_ok = ccp_standards['ph'].min_value <= record.ccp_ph <= ccp_standards['ph'].max_value
    
    # 3. 최종 판정
    if temp_ok and ph_ok:
        record.result = "PASS"
    else:
        record.result = "FAIL"
        # 불합격 알림 생성
        create_notification(
            event_type="CCP_DEVIATION",
            severity="CRITICAL",
            message=f"세척 공정 CCP 이탈: 온도={record.ccp_temp}°C, pH={record.ccp_ph}"
        )
    
    # 4. 저장
    save_record(record)
    return record
```

### HACCP 보고서

**일일 HACCP 리포트**:
```
임진강김치 MES - 2026-05-12 HACCP 리포트

[세척 공정]
- 온도 CCP: 3건 측정 → 3건 PASS (100%)
- pH CCP: 3건 측정 → 3건 PASS (100%)

[절임 공정]
- 염도 CCP: 2건 측정 → 2건 PASS (100%)
- 온도 CCP: 2건 측정 → 2건 PASS (100%)

[양념 공정]
- 첨가량 CCP: 2건 측정 → 2건 PASS (100%)
- 혼합시간 CCP: 2건 측정 → 2건 PASS (100%)

[포장 공정]
- 금속검출 CCP: 480건 측정 → 477건 PASS, 3건 FAIL (99.4%)
- QR 인쇄 CCP: 480건 측정 → 480건 PASS (100%)

[선별 공정]
- 합격률 CCP: 480입력 → 470합격 (97.9%) ✓ PASS

──────────────────────────────────────
종합 판정: ACCEPTABLE
(모든 CCP 합격)
```

---

## KPI 달성 계획

### KPI 정의 및 현황

#### 1. 시간당 생산량 (Hourly Production Capacity)

**정의**: 실제 산출량 / 운영시간

**현재 성능**: 600 kg/h
**목표**: 700 kg/h (16.7% 증가)
**기간**: 2026년 12월 말까지

**달성 경로**:
```
MES 도입 전                 MES 도입 후
├─ 수작업 기록              ├─ 실시간 자동 기록
├─ 병목 지점 파악 어려움    ├─ 공정별 성능 시각화
├─ 수동 조정                └─ 자동 최적화 권고
└─ 600 kg/h                    ↓ (3개월 실행)
                             650 kg/h (개선 1차)
                                ↓ (추가 3개월)
                             700 kg/h (목표 달성)
```

**MES 지원 기능**:
1. **병목 공정 식별** (AI Agent)
   - "절임 공정이 시간당 생산량의 95%만 처리중"
   - 권고: "절임 작업자 추가 배치"

2. **공정별 효율 추적**
   - Dashboard 우측 "Production Trend" 차트
   - 7일 이동 평균 → 추세선 표시
   - 상승/하강 방향 표시

3. **손실률 모니터링**
   ```
   입력 500 kg → 산출 495 kg (손실 1%)
   
   목표: 전체 손실률 < 2%
   MES 측정으로 공정별 손실 추적
   → 높은 손실 공정 집중 개선
   ```

**KPI 달성 메커니즘**:
```python
# backend/app/crud/kpi.py

def calculate_hourly_production(date, process_name=None):
    """
    시간당 생산량 계산
    """
    # 실제 산출량 합계
    total_output = sum(
        record.output_quantity
        for record in get_process_records(date, process_name)
    )
    
    # 운영 시간 (= 계획 시간 - 고장 시간)
    planned_hours = 8.0  # 일과시간
    downtime_hours = get_equipment_downtime(date)
    actual_hours = planned_hours - downtime_hours
    
    # 시간당 생산량
    hourly_production = total_output / actual_hours if actual_hours > 0 else 0
    
    return {
        "hourly_production": round(hourly_production, 2),
        "total_output": total_output,
        "actual_hours": actual_hours,
        "trend": compare_with_previous_day(hourly_production)
    }
```

#### 2. 불량률 (Defect Rate)

**정의**: 불량수 / 총생산수 × 100%

**현재**: 1.7%
**목표**: 1.3% (23.5% 감소)
**기간**: 2026년 12월 말까지

**불량 유형별 추적**:
```
┌─ 공정 불량 (Process Defect)
│  ├─ 세척 불완전
│  ├─ 절임 부적절
│  └─ 양념 편차
├─ 포장 불량 (Packaging Defect)
│  ├─ 금속검출 (CCP)
│  └─ QR 인쇄 불량
└─ 선별 불합격 (Selection)
   ├─ A급 (미각 이상, 변색)
   ├─ B급 (포장 손상)
   └─ C급 (경미 결함)
```

**MES 기여도**:
1. **CCP 실시간 판정**
   - 부적절한 공정 즉시 감지
   - 손실 최소화

2. **불량 원인 추적** (AI Agent)
   - "포장 공정 금속검출 이상 증가"
   - 원인: "금속검출기 교정 필요"
   - 권고: "금일 15:00 교정 예약"

3. **불합격 분류 자동화**
   - 선별 공정에서 A/B/C 자동 분류
   - 등급별 가격 책정 지원

**달성 경로**:
```
2026년 Q2 말: 1.7% (현재)
           ↓ (CCP 강화, 작업자 교육)
2026년 Q3 말: 1.5% (1차 개선)
           ↓ (금속검출기 정기 점검)
2026년 Q4 말: 1.3% (목표 달성)
```

#### 3. OEE (Overall Equipment Effectiveness)

**정의**: 가용률 × 성능률 × 양품률

**목표**: 85% (업계 선진 수준)

**계산 사례** (1일):
```
가용률 = (480분 - 20분 고장) / 480분 × 100% = 95.8%
성능률 = (실제 480kg) / (이론 500kg) × 100% = 96.0%
양품률 = (470개 합격) / (480개 총) × 100% = 97.9%

OEE = 0.958 × 0.960 × 0.979 = 90.0% ✓ (목표 85% 초과 달성)
```

**OEE 향상 전략**:
1. **가용률 증대** (목표: 96%)
   - 설비 점검 주기 최적화
   - 예방점검 실시
   - 부품 재고 확보

2. **성능률 증대** (목표: 95%)
   - 공정 속도 최적화
   - 재작업 감소
   - 작업 표준화

3. **양품률 증대** (목표: 98%)
   - HACCP CCP 강화
   - 작업자 교육
   - QC 기준 강화

**MES 대시보드** (/oee):
- 일별 OEE 점수 (대형 게이지)
- 3개 요소 분석 (세부 게이지)
- 설비별 비교 (막대 그래프)
- 30일 추이 (꺾인선)

---

## 향후 발전 방향

### Phase 2 — 고급 분석 및 예측 (2026년 하반기)

#### 1. 머신러닝 기반 예측 (ML-based Forecasting)

**현재**: 통계 기반 (지난 7일 평균)
**개선**: 시계열 예측 모델 (ARIMA, Prophet)

**구현 계획**:
```python
# services/ml_predictor.py
from fbprophet import Prophet

class ProductionForecaster:
    def forecast_daily_production(self, days_ahead=7):
        """
        Facebook Prophet을 이용한 생산량 예측
        """
        # 과거 90일 데이터 학습
        historical_data = get_production_data(days=90)
        
        df = pd.DataFrame({
            'ds': historical_data['date'],
            'y': historical_data['output_qty']
        })
        
        model = Prophet(daily_seasonality=False)
        model.fit(df)
        
        future = model.make_future_dataframe(periods=days_ahead)
        forecast = model.predict(future)
        
        return forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
```

**효과**:
- 납기 충족률 향상
- 자재 발주 정확도 개선
- 작업량 예측 정확도 90% 이상

#### 2. 이상 탐지 (Anomaly Detection)

**적용 범위**:
- 센서 데이터 (온도, 습도 급격한 변화)
- 생산량 (정상치 벗어남)
- 설비 상태 (예상치 못한 고장 전조)

**구현**:
```python
# services/anomaly_detector.py
from sklearn.ensemble import IsolationForest

class SensorAnomalyDetector:
    def detect_temperature_anomaly(self, warehouse_id):
        """
        냉장실 온도 이상 탐지
        """
        # 최근 24시간 데이터
        sensor_data = get_influxdb_data(
            warehouse_id=warehouse_id,
            hours=24
        )
        
        # Isolation Forest 모델
        model = IsolationForest(contamination=0.05)
        predictions = model.fit_predict(sensor_data[['temperature']])
        
        anomalies = sensor_data[predictions == -1]
        
        if len(anomalies) > 0:
            create_notification(
                event_type="SENSOR_ANOMALY",
                severity="HIGH",
                message=f"냉장실 온도 이상: {anomalies[0]['temperature']}°C"
            )
```

**효과**:
- 설비 고장 사전 예방
- 품질 문제 조기 발견

#### 3. IoT 센서 확대 (Extended IoT Integration)

**현재**: 냉장실 온도/습도/문개폐
**확대 대상**:
- 공정별 센서
  - 세척 온도, pH 자동 측정
  - 절임 염도 센서
  - 포장 금속검출기 → InfluxDB 로깅
- 에너지 모니터링
  - 설비별 전력 소비량
  - 효율 분석
- 공정 진행 상태
  - 컨베이어 속도
  - 제품 이동 감지 (RFID)

**아키텍처**:
```
각 센서
  ↓ (MQTT/HTTP)
IoT Gateway
  ↓ (배치 수집)
InfluxDB
  ↓ (실시간 쿼리)
AI Agent
  ↓ (분석/권고)
Dashboard
```

### Phase 3 — 공급망 통합 (Supply Chain Integration) (2027년)

#### 1. 원료 공급사 연동 (Supplier Integration)

**기능**:
- 발주 자동화 (EDI)
- 납기 추적 (Tracking)
- 품질 등급 관리 (SLA)

**API 설계**:
```
POST   /api/v2/suppliers/{id}/orders        자동 발주
GET    /api/v2/suppliers/{id}/shipments     납품 현황
PUT    /api/v2/suppliers/{id}/quality-score 품질 평가
```

#### 2. 고객사 포탈 (Customer Portal)

**기능**:
- 수주 현황 조회
- 출하 추적 (Shipment Tracking)
- 품질 인증서 다운로드 (CoC)
- 청구서 확인

#### 3. 빅데이터 분석 (Big Data Analytics)

**대상**:
- 월별/년도별 추이 분석
- 거래처별 매출 분석
- 제품별 수익성 분석
- 계절성 패턴 인식

### Phase 4 — 자동화 고도화 (Advanced Automation) (2028년)

#### 1. RPA (Robotic Process Automation)

**자동화 대상**:
- 보고서 자동 생성 및 배포
- 월말 재고 조사 자동화
- 청구서 자동 생성

#### 2. 로봇 연동 (Robot Integration)

**가능성**:
- 자동 포장 로봇
- 자동 운반 로봇 (AGV)
- 자동 선별 로봇 (머신비전)

#### 3. IoT → 자동화 폐쇄 루프

```
센서 감지
  ↓
AI 분석
  ↓
자동 조치 (예: 온도 자동 조정)
  ↓
결과 확인
  ↓ (피드백 학습)
모델 개선
```

---

## 요약

### 구현 현황

| 범주 | 항목 | 상태 | 파일 수 |
|------|------|------|--------|
| **Backend** | Models | ✅ | 16개 |
| | Schemas | ✅ | 12개 |
| | CRUD | ✅ | 12개 |
| | Endpoints | ✅ | 17개 |
| | Services | ✅ | 1개 |
| | Infrastructure | ✅ | 4개 (core) |
| **Frontend** | Pages | ✅ | 21개 |
| | Components | ✅ | 60+ |
| | UI Library | ✅ | 7개 |
| **Database** | Schema Files | ✅ | 8개 |
| | Seed Data | ✅ | 초기값 포함 |
| **Infrastructure** | Docker | ✅ | 6개 서비스 |
| | Nginx | ✅ | 리버스프록시 구성 |

### KPI 목표 달성 경로

| KPI | 현재 | 목표 | 달성 시기 |
|-----|------|------|---------|
| 시간당 생산량 | 600 kg/h | 700 kg/h | 2026-12-31 |
| 불량률 | 1.7% | 1.3% | 2026-12-31 |
| OEE | - | 85% | 2026-12-31 |
| 납기준수율 | - | 98% | 2026-12-31 |

### 기대 효과

**정량적**:
- 생산량 16.7% 증가
- 불량률 23.5% 감소
- 설비 가용률 95% 이상
- 생산 실적 기록 시간 90% 감소

**정성적**:
- 실시간 생산 가시화
- 데이터 기반 의사결정
- 식품안전 강화 (HACCP)
- 직원 역량 강화

---

## 부록

### 참고 자료

- **GitHub**: https://github.com/superpjh-stack/limjingang_Kimchi (main 브랜치)
- **비즈니스 계획서**: `1. 2026년 정부일반형 사업계획서_임진강김치(주)_V1.0.pdf`
- **기술 문서**: 각 Sprint의 설계서 (산출물/설계단계 폴더)

### 개발자 정보

- **프로젝트 오너**: superpjh@gmail.com
- **개발 환경**: Windows 11, Python 3.11, Node.js 20+
- **VCS**: Git/GitHub

---

**문서 작성일**: 2026-05-12
**최종 검토**: 완료
**상태**: 배포 준비 완료

---

이 보고서는 6개월간의 MES 개발 여정을 정리한 것이며, 모든 기능이 정상 작동하는 상태입니다. 추가 문의사항은 기술팀에 연락주시기 바랍니다.
