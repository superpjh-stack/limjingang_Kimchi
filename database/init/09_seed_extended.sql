-- ============================================================
-- 임진강김치 MES 시스템 - 확장 시드 데이터 (각 테이블 20건)
-- ============================================================

USE mes_db;

-- ============================================================
-- 1. 사용자 추가 (총 20명)
-- ============================================================
INSERT IGNORE INTO TB_USER (user_id, user_name, password_hash, department, position, is_active, created_by) VALUES
('worker3',    '최세척',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('worker4',    '강절임',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('worker5',    '윤양념',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('worker6',    '임포장',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('worker7',    '한입고',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('worker8',    '오출하',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('worker9',    '서품질',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '품질팀', '작업자',   1, 'SYSTEM'),
('worker10',   '전검사',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '품질팀', '작업자',   1, 'SYSTEM'),
('manager2',   '조관리',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '반장',     1, 'SYSTEM'),
('manager3',   '권반장',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '반장',     1, 'SYSTEM'),
('sales2',     '고영업',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '영업팀', '영업담당', 1, 'SYSTEM'),
('sales3',     '나영업',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '영업팀', '영업담당', 1, 'SYSTEM'),
('qa1',        '문품질',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '품질팀', 'QC담당',   1, 'SYSTEM'),
('qa2',        '양품질',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '품질팀', 'QC담당',   1, 'SYSTEM'),
('executive1', '박대표',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '경영팀', '대표이사', 1, 'SYSTEM');

INSERT IGNORE INTO TB_USER_ROLE (user_id, role_id, granted_by, created_by)
SELECT u.id, r.id, 'SYSTEM', 'SYSTEM' FROM TB_USER u, TB_ROLE r
WHERE (u.user_id IN ('worker3','worker4','worker5','worker6','worker7','worker8') AND r.role_code = 'WORKER')
   OR (u.user_id IN ('worker9','worker10') AND r.role_code = 'WORKER')
   OR (u.user_id IN ('manager2','manager3') AND r.role_code = 'MANAGER')
   OR (u.user_id IN ('sales2','sales3') AND r.role_code = 'SALES')
   OR (u.user_id IN ('qa1','qa2') AND r.role_code = 'WORKER')
   OR (u.user_id = 'executive1' AND r.role_code = 'EXECUTIVE');

-- ============================================================
-- 2. 거래처 추가 (총 20개)
-- ============================================================
INSERT IGNORE INTO TB_CUSTOMER (customer_code, customer_name, customer_type, business_no, representative, phone, email, address, delivery_address, payment_terms, created_by) VALUES
('CUS-006', '롯데홈쇼핑',           'HOMESHOPPING', '000-00-00006', '홈쇼핑 MD',  '02-2345-6601', 'md@lotteimall.com',   '서울시 영등포구 국제금융로 77',    '서울시 영등포구 국제금융로 77',    '월정산', 'SYSTEM'),
('CUS-007', '신세계라이브쇼핑',     'HOMESHOPPING', '000-00-00007', '홈쇼핑 MD',  '02-2345-6602', 'md@ssgls.com',        '서울시 중구 신세계로 2',           '서울시 중구 신세계로 2',           '월정산', 'SYSTEM'),
('CUS-008', 'KT알파쇼핑',           'HOMESHOPPING', '000-00-00008', '홈쇼핑 MD',  '02-2345-6603', 'md@ktalpha.com',      '서울시 서초구 우면산로 32',        '서울시 서초구 우면산로 32',        '월정산', 'SYSTEM'),
('CUS-009', '이마트 트레이더스',    'GENERAL',      '234-56-78901', '이트레이더', '031-345-6604', 'order@traders.co.kr', '경기도 성남시 분당구 판교로 12',   '경기도 성남시 분당구 판교로 12',   '30일',   'SYSTEM'),
('CUS-010', '코스트코코리아',       'GENERAL',      '345-67-89012', '코스트코',   '02-2345-6605', 'order@costco.kr',     '서울시 양천구 목동동로 309',       '서울시 양천구 목동동로 309',       '30일',   'SYSTEM'),
('CUS-011', '홈플러스',             'GENERAL',      '456-78-90123', '홈플러스',   '02-2345-6606', 'order@homeplus.co.kr','서울시 강동구 천호대로 1125',      '경기도 전국 배송',                 '45일',   'SYSTEM'),
('CUS-012', '쿠팡',                 'ONLINE',       '567-89-01234', '박쿠팡',     '02-2345-6607', 'vendor@coupang.com',  '서울시 송파구 송파대로 570',       '경기도 이천시 쿠팡물류센터',       '주정산', 'SYSTEM'),
('CUS-013', '마켓컬리',             'ONLINE',       '678-90-12345', '이컬리',     '02-2345-6608', 'partner@kurly.com',   '서울시 강남구 테헤란로 133',       '경기도 김포시 마켓컬리 FC',        '주정산', 'SYSTEM'),
('CUS-014', 'SSG닷컴',              'ONLINE',       '789-01-23456', '정쓱닷컴',   '02-2345-6609', 'vendor@ssg.com',      '경기도 안산시 상록구 건강로 100',  '경기도 안산시 물류센터',           '주정산', 'SYSTEM'),
('CUS-015', '11번가',               'ONLINE',       '890-12-34567', '최11번',     '02-2345-6610', 'seller@11st.co.kr',   '서울시 중구 한강대로 416',         '경기도 용인시 11번가 물류센터',    '주정산', 'SYSTEM'),
('CUS-016', '연천군청',             'GENERAL',      '901-23-45678', '군청담당자', '031-839-2100', 'order@yeoncheon.go.kr','경기도 연천군 연천읍 연천로 20',  '경기도 연천군',                    '60일',   'SYSTEM'),
('CUS-017', '경기도 학교급식센터', 'GENERAL',      '012-34-56789', '급식센터장', '031-245-6612', 'order@ggedu.kr',      '경기도 수원시 영통구 도청로 30',   '경기도 각 학교',                   '45일',   'SYSTEM'),
('CUS-018', 'CU편의점 (BGF)',       'GENERAL',      '123-45-11111', 'BGF담당',    '02-3456-7813', 'order@bgfretail.com', '서울시 강남구 삼성동 145',         '전국 CU 물류센터',                 '30일',   'SYSTEM'),
('CUS-019', 'GS25 (GS리테일)',      'GENERAL',      '123-45-22222', 'GS담당',     '02-3456-7814', 'order@gsretail.com',  '서울시 강남구 역삼동 679',         '전국 GS25 물류센터',               '30일',   'SYSTEM'),
('CUS-020', '네이버쇼핑',           'ONLINE',       '123-45-33333', '네이버MD',   '1588-3820',    'partner@naver.com',   '경기도 성남시 분당구 불정로 6',    '전국 네이버 파트너사 배송',        '주정산', 'SYSTEM');

-- ============================================================
-- 3. 제품 추가 (총 20개)
-- ============================================================
INSERT IGNORE INTO TB_PRODUCT (product_code, product_name, product_type, capacity, package_unit, channel_type, unit_price, shelf_life_days, created_by) VALUES
('PRD-008', '율무 깍두기 2kg',        'OTHER',    2.0, '박스', 'HOMESHOPPING',  17000, 60, 'SYSTEM'),
('PRD-009', '율무 깍두기 5kg',        'OTHER',    5.0, '박스', 'GENERAL',       38000, 60, 'SYSTEM'),
('PRD-010', '율무 백김치 3kg',        'BAECHU',   3.0, '박스', 'HOMESHOPPING',  28000, 90, 'SYSTEM'),
('PRD-011', '율무 백김치 5kg',        'BAECHU',   5.0, '박스', 'GENERAL',       44000, 90, 'SYSTEM'),
('PRD-012', '율무 동치미 3kg',        'OTHER',    3.0, '박스', 'ONLINE',        20000, 30, 'SYSTEM'),
('PRD-013', '율무 파김치 1kg',        'OTHER',    1.0, '봉지', 'ONLINE',        12000, 45, 'SYSTEM'),
('PRD-014', '율무 포기김치 1kg (소)', 'BAECHU',   1.0, '봉지', 'ONLINE',         9000, 90, 'SYSTEM'),
('PRD-015', '율무 포기김치 20kg (업소용)', 'BAECHU', 20.0, '박스', 'GENERAL', 120000, 90, 'SYSTEM'),
('PRD-016', '율무 총각김치 10kg (업소용)', 'CHONGGAK', 10.0, '박스', 'GENERAL', 72000, 60, 'SYSTEM'),
('PRD-017', '율무 열무김치 1kg',      'YEOLMU',   1.0, '봉지', 'ONLINE',        10000, 45, 'SYSTEM'),
('PRD-018', '율무 깻잎김치 500g',     'OTHER',    0.5, '봉지', 'ONLINE',         8000, 30, 'SYSTEM'),
('PRD-019', '율무 갓김치 2kg',        'OTHER',    2.0, '봉지', 'HOMESHOPPING',  19000, 60, 'SYSTEM'),
('PRD-020', '율무 고들빼기김치 1kg',  'OTHER',    1.0, '봉지', 'ONLINE',        15000, 60, 'SYSTEM');

-- ============================================================
-- 4. 설비 추가 (총 20개)
-- ============================================================
INSERT IGNORE INTO TB_EQUIPMENT (equipment_code, equipment_name, equipment_type, process_id, capacity, location, status, created_by)
SELECT eq.equipment_code, eq.equipment_name, eq.equipment_type, p.id, eq.capacity, eq.location, eq.status, 'SYSTEM'
FROM (
    SELECT 'EQP-009' AS equipment_code, '절임탱크 4호' AS equipment_name, 'TANK' AS equipment_type, 'PRC-004' AS proc_code, 1500.00 AS capacity, '절임실 B구역' AS location, 'ACTIVE' AS status
    UNION ALL SELECT 'EQP-010', '세척라인 2호', 'LINE', 'PRC-003', 500.00, '세척실', 'ACTIVE'
    UNION ALL SELECT 'EQP-011', '세척라인 3호', 'LINE', 'PRC-003', 300.00, '세척실', 'IDLE'
    UNION ALL SELECT 'EQP-012', '양념버무림기 3호', 'MACHINE', 'PRC-006', 300.00, '양념실 B구역', 'ACTIVE'
    UNION ALL SELECT 'EQP-013', '양념버무림기 4호', 'MACHINE', 'PRC-006', 200.00, '양념실 B구역', 'MAINTENANCE'
    UNION ALL SELECT 'EQP-014', '자동포장기 3호', 'MACHINE', 'PRC-007', 200.00, '포장실', 'ACTIVE'
    UNION ALL SELECT 'EQP-015', '자동포장기 4호', 'MACHINE', 'PRC-007', 150.00, '포장실', 'ACTIVE'
    UNION ALL SELECT 'EQP-016', '금속검출기 1호', 'MACHINE', 'PRC-007', 500.00, '포장실 출구', 'ACTIVE'
    UNION ALL SELECT 'EQP-017', '금속검출기 2호', 'MACHINE', 'PRC-007', 500.00, '포장실 출구', 'ACTIVE'
    UNION ALL SELECT 'EQP-018', '컨베이어벨트 1호', 'LINE', 'PRC-007', 1000.00, '포장실 라인1', 'ACTIVE'
    UNION ALL SELECT 'EQP-019', '컨베이어벨트 2호', 'LINE', 'PRC-007', 1000.00, '포장실 라인2', 'ACTIVE'
    UNION ALL SELECT 'EQP-020', '원재료 계량기 1호', 'MACHINE', 'PRC-002', 50.00, '전처리실', 'ACTIVE'
) AS eq
JOIN TB_PROCESS p ON p.process_code = eq.proc_code;

-- ============================================================
-- 5. 수주 20건 (TB_ORDER + TB_ORDER_DETAIL)
-- ============================================================
INSERT IGNORE INTO TB_ORDER (order_no, customer_id, order_date, delivery_date, total_amount, status, order_type, remark, created_by)
SELECT ord.order_no, c.id, ord.order_date, ord.delivery_date, ord.total_amount, ord.status, ord.order_type, ord.remark, 'SYSTEM'
FROM (
    SELECT 'ORD-20260401-001' AS order_no, 'CUS-001' AS cust_code, '2026-04-01' AS order_date, '2026-04-08' AS delivery_date, 3500000 AS total_amount, 'COMPLETED' AS status, 'HOMESHOPPING' AS order_type, 'CJ온스타일 4월 1차 방송분' AS remark
    UNION ALL SELECT 'ORD-20260405-001','CUS-002','2026-04-05','2026-04-12',2600000,'COMPLETED','HOMESHOPPING','GS홈쇼핑 4월 1차'
    UNION ALL SELECT 'ORD-20260408-001','CUS-004','2026-04-08','2026-04-15',1950000,'COMPLETED','GENERAL','경기마트 4월 정기발주'
    UNION ALL SELECT 'ORD-20260410-001','CUS-005','2026-04-10','2026-04-13', 880000,'COMPLETED','ONLINE','온라인몰 4월 2주차'
    UNION ALL SELECT 'ORD-20260412-001','CUS-003','2026-04-12','2026-04-19',4200000,'COMPLETED','HOMESHOPPING','현대홈쇼핑 4월 방송'
    UNION ALL SELECT 'ORD-20260415-001','CUS-006','2026-04-15','2026-04-22',3150000,'COMPLETED','HOMESHOPPING','롯데홈쇼핑 4월'
    UNION ALL SELECT 'ORD-20260417-001','CUS-009','2026-04-17','2026-04-24',2340000,'COMPLETED','GENERAL','이마트 트레이더스 발주'
    UNION ALL SELECT 'ORD-20260420-001','CUS-012','2026-04-20','2026-04-23',1560000,'COMPLETED','ONLINE','쿠팡 로켓프레시'
    UNION ALL SELECT 'ORD-20260422-001','CUS-013','2026-04-22','2026-04-25', 780000,'COMPLETED','ONLINE','마켓컬리 새벽배송'
    UNION ALL SELECT 'ORD-20260425-001','CUS-001','2026-04-25','2026-05-02',4200000,'COMPLETED','HOMESHOPPING','CJ온스타일 4월 2차 방송'
    UNION ALL SELECT 'ORD-20260428-001','CUS-010','2026-04-28','2026-05-05',5200000,'COMPLETED','GENERAL','코스트코 5월 납품'
    UNION ALL SELECT 'ORD-20260501-001','CUS-002','2026-05-01','2026-05-08',3100000,'IN_PRODUCTION','HOMESHOPPING','GS홈쇼핑 5월 1차'
    UNION ALL SELECT 'ORD-20260503-001','CUS-011','2026-05-03','2026-05-10',2800000,'IN_PRODUCTION','GENERAL','홈플러스 5월 발주'
    UNION ALL SELECT 'ORD-20260505-001','CUS-014','2026-05-05','2026-05-08',1200000,'CONFIRMED','ONLINE','SSG닷컴 5월'
    UNION ALL SELECT 'ORD-20260506-001','CUS-003','2026-05-06','2026-05-13',3800000,'CONFIRMED','HOMESHOPPING','현대홈쇼핑 5월 방송'
    UNION ALL SELECT 'ORD-20260507-001','CUS-016','2026-05-07','2026-05-14',1560000,'CONFIRMED','GENERAL','연천군청 5월 급식'
    UNION ALL SELECT 'ORD-20260508-001','CUS-012','2026-05-08','2026-05-11', 960000,'CONFIRMED','ONLINE','쿠팡 5월 2주차'
    UNION ALL SELECT 'ORD-20260509-001','CUS-017','2026-05-09','2026-05-16',2100000,'CONFIRMED','GENERAL','학교급식센터 5월'
    UNION ALL SELECT 'ORD-20260510-001','CUS-001','2026-05-10','2026-05-17',4900000,'DRAFT','HOMESHOPPING','CJ온스타일 5월 1차 방송'
    UNION ALL SELECT 'ORD-20260512-001','CUS-019','2026-05-12','2026-05-19',1400000,'DRAFT','GENERAL','GS25 편의점 발주'
) AS ord
JOIN TB_CUSTOMER c ON c.customer_code = ord.cust_code;

-- ORDER DETAIL (각 수주에 주력 제품 1개)
INSERT IGNORE INTO TB_ORDER_DETAIL (order_id, product_id, order_qty, unit_price, amount, created_by)
SELECT o.id, p.id,
       CASE o.order_no
           WHEN 'ORD-20260401-001' THEN 100
           WHEN 'ORD-20260405-001' THEN 80
           WHEN 'ORD-20260408-001' THEN 30
           WHEN 'ORD-20260410-001' THEN 40
           WHEN 'ORD-20260412-001' THEN 120
           WHEN 'ORD-20260415-001' THEN 90
           WHEN 'ORD-20260417-001' THEN 36
           WHEN 'ORD-20260420-001' THEN 48
           WHEN 'ORD-20260422-001' THEN 24
           WHEN 'ORD-20260425-001' THEN 120
           WHEN 'ORD-20260428-001' THEN 80
           WHEN 'ORD-20260501-001' THEN 94
           WHEN 'ORD-20260503-001' THEN 56
           WHEN 'ORD-20260505-001' THEN 36
           WHEN 'ORD-20260506-001' THEN 108
           WHEN 'ORD-20260507-001' THEN 24
           WHEN 'ORD-20260508-001' THEN 29
           WHEN 'ORD-20260509-001' THEN 60
           WHEN 'ORD-20260510-001' THEN 140
           ELSE 40
       END AS order_qty,
       p.unit_price,
       CASE o.order_no
           WHEN 'ORD-20260401-001' THEN 100
           WHEN 'ORD-20260405-001' THEN 80
           WHEN 'ORD-20260408-001' THEN 30
           WHEN 'ORD-20260410-001' THEN 40
           WHEN 'ORD-20260412-001' THEN 120
           WHEN 'ORD-20260415-001' THEN 90
           WHEN 'ORD-20260417-001' THEN 36
           WHEN 'ORD-20260420-001' THEN 48
           WHEN 'ORD-20260422-001' THEN 24
           WHEN 'ORD-20260425-001' THEN 120
           WHEN 'ORD-20260428-001' THEN 80
           WHEN 'ORD-20260501-001' THEN 94
           WHEN 'ORD-20260503-001' THEN 56
           WHEN 'ORD-20260505-001' THEN 36
           WHEN 'ORD-20260506-001' THEN 108
           WHEN 'ORD-20260507-001' THEN 24
           WHEN 'ORD-20260508-001' THEN 29
           WHEN 'ORD-20260509-001' THEN 60
           WHEN 'ORD-20260510-001' THEN 140
           ELSE 40
       END * p.unit_price AS amount,
       'SYSTEM'
FROM TB_ORDER o
JOIN TB_PRODUCT p ON p.product_code = 'PRD-001'
WHERE o.order_no IN (
    'ORD-20260401-001','ORD-20260405-001','ORD-20260408-001','ORD-20260410-001',
    'ORD-20260412-001','ORD-20260415-001','ORD-20260417-001','ORD-20260420-001',
    'ORD-20260422-001','ORD-20260425-001','ORD-20260428-001','ORD-20260501-001',
    'ORD-20260503-001','ORD-20260505-001','ORD-20260506-001','ORD-20260507-001',
    'ORD-20260508-001','ORD-20260509-001','ORD-20260510-001','ORD-20260512-001'
);

-- ============================================================
-- 6. 생산계획 20건 (TB_PRODUCTION_PLAN)
-- ============================================================
INSERT IGNORE INTO TB_PRODUCTION_PLAN (plan_no, plan_date, product_id, planned_qty, actual_qty, status, plan_type, start_datetime, end_datetime, remark, created_by)
SELECT pp.plan_no, pp.plan_date, p.id, pp.planned_qty, pp.actual_qty, pp.status, pp.plan_type, pp.start_dt, pp.end_dt, pp.remark, 'SYSTEM'
FROM (
    SELECT 'PLAN-20260401-001' AS plan_no, '2026-04-01' AS plan_date, 'PRD-001' AS prod_code, 500 AS planned_qty, 498 AS actual_qty, 'COMPLETED' AS status, 'DAILY' AS plan_type, '2026-04-01 06:00:00' AS start_dt, '2026-04-01 18:00:00' AS end_dt, 'CJ온스타일 납품분' AS remark
    UNION ALL SELECT 'PLAN-20260402-001','2026-04-02','PRD-004',300,297,'COMPLETED','DAILY','2026-04-02 06:00:00','2026-04-02 16:00:00','총각김치 납품분'
    UNION ALL SELECT 'PLAN-20260403-001','2026-04-03','PRD-001',600,601,'COMPLETED','DAILY','2026-04-03 06:00:00','2026-04-03 20:00:00','GS홈쇼핑 납품분'
    UNION ALL SELECT 'PLAN-20260407-001','2026-04-07','PRD-006',200,195,'COMPLETED','DAILY','2026-04-07 07:00:00','2026-04-07 16:00:00','열무김치'
    UNION ALL SELECT 'PLAN-20260408-001','2026-04-08','PRD-001',400,403,'COMPLETED','DAILY','2026-04-08 06:00:00','2026-04-08 17:00:00','경기마트 납품'
    UNION ALL SELECT 'PLAN-20260410-001','2026-04-10','PRD-002',300,298,'COMPLETED','DAILY','2026-04-10 06:00:00','2026-04-10 18:00:00','일반 10kg 생산'
    UNION ALL SELECT 'PLAN-20260414-001','2026-04-14','PRD-001',700,695,'COMPLETED','DAILY','2026-04-14 06:00:00','2026-04-14 21:00:00','현대홈쇼핑 대량납품'
    UNION ALL SELECT 'PLAN-20260415-001','2026-04-15','PRD-004',250,252,'COMPLETED','DAILY','2026-04-15 06:00:00','2026-04-15 15:00:00','총각김치 소량'
    UNION ALL SELECT 'PLAN-20260417-001','2026-04-17','PRD-001',550,547,'COMPLETED','DAILY','2026-04-17 06:00:00','2026-04-17 19:00:00','롯데홈쇼핑'
    UNION ALL SELECT 'PLAN-20260421-001','2026-04-21','PRD-006',180,179,'COMPLETED','DAILY','2026-04-21 07:00:00','2026-04-21 15:00:00','열무김치 납품'
    UNION ALL SELECT 'PLAN-20260422-001','2026-04-22','PRD-001',800,0,'COMPLETED','WEEKLY','2026-04-22 06:00:00','2026-04-26 18:00:00','4월 4주 주간계획'
    UNION ALL SELECT 'PLAN-20260428-001','2026-04-28','PRD-001',600,600,'COMPLETED','DAILY','2026-04-28 06:00:00','2026-04-28 20:00:00','코스트코 납품'
    UNION ALL SELECT 'PLAN-20260501-001','2026-05-01','PRD-001',500,320,'IN_PROGRESS','DAILY','2026-05-01 06:00:00','2026-05-01 18:00:00','GS홈쇼핑 5월'
    UNION ALL SELECT 'PLAN-20260502-001','2026-05-02','PRD-004',300,150,'IN_PROGRESS','DAILY','2026-05-02 06:00:00','2026-05-02 17:00:00','총각김치 5월'
    UNION ALL SELECT 'PLAN-20260505-001','2026-05-05','PRD-002',400,0,'CONFIRMED','DAILY','2026-05-05 06:00:00','2026-05-05 18:00:00','홈플러스 10kg'
    UNION ALL SELECT 'PLAN-20260506-001','2026-05-06','PRD-001',600,0,'CONFIRMED','DAILY','2026-05-06 06:00:00','2026-05-06 20:00:00','현대홈쇼핑 5월'
    UNION ALL SELECT 'PLAN-20260507-001','2026-05-07','PRD-006',200,0,'CONFIRMED','DAILY','2026-05-07 07:00:00','2026-05-07 16:00:00','열무김치 5월'
    UNION ALL SELECT 'PLAN-20260512-001','2026-05-12','PRD-001',700,0,'DRAFT','DAILY','2026-05-12 06:00:00','2026-05-12 21:00:00','CJ온스타일 5월 1차'
    UNION ALL SELECT 'PLAN-20260513-001','2026-05-13','PRD-004',350,0,'DRAFT','DAILY','2026-05-13 06:00:00','2026-05-13 17:00:00','총각김치 5월 2차'
    UNION ALL SELECT 'PLAN-20260519-001','2026-05-19','PRD-001',1000,0,'DRAFT','WEEKLY','2026-05-19 06:00:00','2026-05-23 18:00:00','5월 3주 주간계획'
) AS pp
JOIN TB_PRODUCT p ON p.product_code = pp.prod_code;

-- ============================================================
-- 7. 작업지시 20건 (TB_WORK_ORDER)
-- ============================================================
INSERT IGNORE INTO TB_WORK_ORDER (work_order_no, production_plan_id, product_id, process_id, equipment_id, assigned_user_id, work_date, planned_qty, actual_qty, defect_qty, status, start_datetime, end_datetime, lot_no, issued_by, completed_by, created_by)
SELECT wo.work_order_no, pp.id, p.id, pr.id, eq.id, u.id,
       wo.work_date, wo.planned_qty, wo.actual_qty, wo.defect_qty, wo.status,
       wo.start_dt, wo.end_dt, wo.lot_no, wo.issued_by, wo.completed_by, 'SYSTEM'
FROM (
    SELECT 'WO-20260401-001' AS work_order_no,'PLAN-20260401-001' AS plan_no,'PRD-001' AS prod_code,'PRC-006' AS proc_code,'EQP-005' AS eq_code,'worker1' AS user_id,'2026-04-01' AS work_date,500 AS planned_qty,498 AS actual_qty,2 AS defect_qty,'COMPLETED' AS status,'2026-04-01 08:00:00' AS start_dt,'2026-04-01 16:30:00' AS end_dt,'LOT-20260401-001' AS lot_no,'manager' AS issued_by,'worker1' AS completed_by
    UNION ALL SELECT 'WO-20260402-001','PLAN-20260402-001','PRD-004','PRC-006','EQP-006','worker2','2026-04-02',300,297,3,'COMPLETED','2026-04-02 08:00:00','2026-04-02 15:00:00','LOT-20260402-001','manager','worker2'
    UNION ALL SELECT 'WO-20260403-001','PLAN-20260403-001','PRD-001','PRC-007','EQP-007','worker3','2026-04-03',600,601,0,'COMPLETED','2026-04-03 09:00:00','2026-04-03 19:30:00','LOT-20260403-001','manager','worker3'
    UNION ALL SELECT 'WO-20260407-001','PLAN-20260407-001','PRD-006','PRC-006','EQP-005','worker4','2026-04-07',200,195,5,'COMPLETED','2026-04-07 08:00:00','2026-04-07 15:30:00','LOT-20260407-001','manager','worker4'
    UNION ALL SELECT 'WO-20260408-001','PLAN-20260408-001','PRD-001','PRC-007','EQP-008','worker5','2026-04-08',400,403,0,'COMPLETED','2026-04-08 08:00:00','2026-04-08 17:00:00','LOT-20260408-001','manager','worker5'
    UNION ALL SELECT 'WO-20260410-001','PLAN-20260410-001','PRD-002','PRC-006','EQP-006','worker6','2026-04-10',300,298,2,'COMPLETED','2026-04-10 08:00:00','2026-04-10 17:30:00','LOT-20260410-001','manager','worker6'
    UNION ALL SELECT 'WO-20260414-001','PLAN-20260414-001','PRD-001','PRC-006','EQP-005','worker1','2026-04-14',700,695,5,'COMPLETED','2026-04-14 07:00:00','2026-04-14 20:00:00','LOT-20260414-001','manager','worker1'
    UNION ALL SELECT 'WO-20260415-001','PLAN-20260415-001','PRD-004','PRC-007','EQP-007','worker2','2026-04-15',250,252,0,'COMPLETED','2026-04-15 08:00:00','2026-04-15 15:00:00','LOT-20260415-001','manager','worker2'
    UNION ALL SELECT 'WO-20260417-001','PLAN-20260417-001','PRD-001','PRC-006','EQP-012','worker3','2026-04-17',550,547,3,'COMPLETED','2026-04-17 08:00:00','2026-04-17 18:30:00','LOT-20260417-001','manager','worker3'
    UNION ALL SELECT 'WO-20260421-001','PLAN-20260421-001','PRD-006','PRC-007','EQP-008','worker4','2026-04-21',180,179,1,'COMPLETED','2026-04-21 08:00:00','2026-04-21 15:00:00','LOT-20260421-001','manager','worker4'
    UNION ALL SELECT 'WO-20260428-001','PLAN-20260428-001','PRD-001','PRC-007','EQP-007','worker5','2026-04-28',600,600,0,'COMPLETED','2026-04-28 07:00:00','2026-04-28 19:30:00','LOT-20260428-001','manager','worker5'
    UNION ALL SELECT 'WO-20260501-001','PLAN-20260501-001','PRD-001','PRC-006','EQP-005','worker1','2026-05-01',500,320,4,'IN_PROGRESS','2026-05-01 08:00:00',NULL,'LOT-20260501-001','manager',NULL
    UNION ALL SELECT 'WO-20260501-002','PLAN-20260501-001','PRD-001','PRC-007','EQP-014','worker6','2026-05-01',500,0,0,'ISSUED',NULL,NULL,'LOT-20260501-001','manager',NULL
    UNION ALL SELECT 'WO-20260502-001','PLAN-20260502-001','PRD-004','PRC-006','EQP-006','worker2','2026-05-02',300,150,2,'IN_PROGRESS','2026-05-02 08:00:00',NULL,'LOT-20260502-001','manager',NULL
    UNION ALL SELECT 'WO-20260505-001','PLAN-20260505-001','PRD-002','PRC-003','EQP-004','worker7','2026-05-05',400,0,0,'ISSUED',NULL,NULL,'LOT-20260505-001','manager',NULL
    UNION ALL SELECT 'WO-20260505-002','PLAN-20260505-001','PRD-002','PRC-006','EQP-012','worker8','2026-05-05',400,0,0,'ISSUED',NULL,NULL,'LOT-20260505-001','manager',NULL
    UNION ALL SELECT 'WO-20260506-001','PLAN-20260506-001','PRD-001','PRC-003','EQP-010','worker3','2026-05-06',600,0,0,'ISSUED',NULL,NULL,'LOT-20260506-001','manager',NULL
    UNION ALL SELECT 'WO-20260506-002','PLAN-20260506-001','PRD-001','PRC-006','EQP-005','worker4','2026-05-06',600,0,0,'ISSUED',NULL,NULL,'LOT-20260506-001','manager',NULL
    UNION ALL SELECT 'WO-20260507-001','PLAN-20260507-001','PRD-006','PRC-004','EQP-001','worker9','2026-05-07',200,0,0,'ISSUED',NULL,NULL,'LOT-20260507-001','manager',NULL
    UNION ALL SELECT 'WO-20260507-002','PLAN-20260507-001','PRD-006','PRC-007','EQP-015','worker10','2026-05-07',200,0,0,'ISSUED',NULL,NULL,'LOT-20260507-001','manager',NULL
) AS wo
JOIN TB_PRODUCTION_PLAN pp ON pp.plan_no = wo.plan_no
JOIN TB_PRODUCT p ON p.product_code = wo.prod_code
JOIN TB_PROCESS pr ON pr.process_code = wo.proc_code
JOIN TB_EQUIPMENT eq ON eq.equipment_code = wo.eq_code
JOIN TB_USER u ON u.user_id = wo.user_id;

-- ============================================================
-- 8. 자재입고 20건 (TB_MATERIAL_RECEIVE)
-- ============================================================
INSERT IGNORE INTO TB_MATERIAL_RECEIVE (receive_no, raw_material_id, warehouse_id, receive_date, receive_qty, unit_price, amount, supplier, lot_no, qc_status, created_by)
SELECT rcv.receive_no, m.id, w.id, rcv.receive_date, rcv.qty, rcv.unit_price, rcv.qty * rcv.unit_price, rcv.supplier, rcv.lot_no, rcv.qc_status, 'SYSTEM'
FROM (
    SELECT 'RCV-20260401-001' AS receive_no,'RAW-001' AS mat_code,'WH-001' AS wh_code,'2026-04-01' AS receive_date,5000 AS qty,800 AS unit_price,'연천 농협' AS supplier,'LOT-MAT-20260401-001' AS lot_no,'PASS' AS qc_status
    UNION ALL SELECT 'RCV-20260401-002','SUB-001','WH-001','2026-04-01',200,8000,'청양 고추상회','LOT-MAT-20260401-002','PASS'
    UNION ALL SELECT 'RCV-20260403-001','SUB-004','WH-001','2026-04-03',1000,500,'신안 천일염','LOT-MAT-20260403-001','PASS'
    UNION ALL SELECT 'RCV-20260405-001','RAW-002','WH-001','2026-04-05',2000,700,'연천 농협','LOT-MAT-20260405-001','PASS'
    UNION ALL SELECT 'RCV-20260407-001','SUB-002','WH-001','2026-04-07',100,5000,'의성 마늘 농협','LOT-MAT-20260407-001','PASS'
    UNION ALL SELECT 'RCV-20260408-001','SUB-009','WH-001','2026-04-08',300,4000,'연천 율무 농협','LOT-MAT-20260408-001','PASS'
    UNION ALL SELECT 'RCV-20260410-001','PKG-001','WH-005','2026-04-10',500,2500,'포장재 공급사','LOT-PKG-20260410-001','PASS'
    UNION ALL SELECT 'RCV-20260410-002','PKG-002','WH-005','2026-04-10',800,1800,'포장재 공급사','LOT-PKG-20260410-002','PASS'
    UNION ALL SELECT 'RCV-20260412-001','RAW-001','WH-001','2026-04-12',8000,800,'연천 농협','LOT-MAT-20260412-001','PASS'
    UNION ALL SELECT 'RCV-20260415-001','SUB-001','WH-001','2026-04-15',300,8000,'청양 고추상회','LOT-MAT-20260415-001','PASS'
    UNION ALL SELECT 'RCV-20260417-001','SUB-003','WH-001','2026-04-17',50,6000,'서산 생강 농협','LOT-MAT-20260417-001','PASS'
    UNION ALL SELECT 'RCV-20260420-001','RAW-003','WH-001','2026-04-20',1000,650,'연천 농협','LOT-MAT-20260420-001','PASS'
    UNION ALL SELECT 'RCV-20260422-001','SUB-006','WH-001','2026-04-22',80,7000,'강경 젓갈','LOT-MAT-20260422-001','PASS'
    UNION ALL SELECT 'RCV-20260425-001','RAW-001','WH-001','2026-04-25',10000,780,'연천 농협','LOT-MAT-20260425-001','PASS'
    UNION ALL SELECT 'RCV-20260428-001','PKG-003','WH-005','2026-04-28',1000,1200,'포장재 공급사','LOT-PKG-20260428-001','PASS'
    UNION ALL SELECT 'RCV-20260501-001','RAW-001','WH-001','2026-05-01',6000,800,'연천 농협','LOT-MAT-20260501-001','PASS'
    UNION ALL SELECT 'RCV-20260503-001','SUB-001','WH-001','2026-05-03',250,8000,'청양 고추상회','LOT-MAT-20260503-001','PASS'
    UNION ALL SELECT 'RCV-20260505-001','SUB-004','WH-001','2026-05-05',800,500,'신안 천일염','LOT-MAT-20260505-001','PASS'
    UNION ALL SELECT 'RCV-20260508-001','RAW-002','WH-001','2026-05-08',3000,700,'연천 농협','LOT-MAT-20260508-001','PASS'
    UNION ALL SELECT 'RCV-20260510-001','PKG-007','WH-005','2026-05-10',10000,50,'인쇄소','LOT-PKG-20260510-001','PASS'
) AS rcv
JOIN TB_RAW_MATERIAL m ON m.material_code = rcv.mat_code
JOIN TB_WAREHOUSE w ON w.warehouse_code = rcv.wh_code;

-- ============================================================
-- 9. 자재재고 (TB_MATERIAL_STOCK) - 현재 재고
-- ============================================================
INSERT INTO TB_MATERIAL_STOCK (raw_material_id, warehouse_id, current_qty, created_by)
SELECT m.id, w.id, stk.current_qty, 'SYSTEM'
FROM (
    SELECT 'RAW-001' AS mat_code, 'WH-001' AS wh_code, 8500 AS current_qty
    UNION ALL SELECT 'RAW-002','WH-001',2800
    UNION ALL SELECT 'RAW-003','WH-001',950
    UNION ALL SELECT 'RAW-004','WH-001',400
    UNION ALL SELECT 'SUB-001','WH-001',380
    UNION ALL SELECT 'SUB-002','WH-001',85
    UNION ALL SELECT 'SUB-003','WH-001',45
    UNION ALL SELECT 'SUB-004','WH-001',1200
    UNION ALL SELECT 'SUB-005','WH-001',60
    UNION ALL SELECT 'SUB-006','WH-001',65
    UNION ALL SELECT 'SUB-007','WH-001',55
    UNION ALL SELECT 'SUB-008','WH-001',80
    UNION ALL SELECT 'SUB-009','WH-001',280
    UNION ALL SELECT 'PKG-001','WH-005',320
    UNION ALL SELECT 'PKG-002','WH-005',580
    UNION ALL SELECT 'PKG-003','WH-005',680
    UNION ALL SELECT 'PKG-004','WH-005',1200
    UNION ALL SELECT 'PKG-005','WH-005',900
    UNION ALL SELECT 'PKG-006','WH-005',750
    UNION ALL SELECT 'PKG-007','WH-005',8500
) AS stk
JOIN TB_RAW_MATERIAL m ON m.material_code = stk.mat_code
JOIN TB_WAREHOUSE w ON w.warehouse_code = stk.wh_code
ON DUPLICATE KEY UPDATE current_qty = VALUES(current_qty);

-- ============================================================
-- 10. 완제품재고 (TB_PRODUCT_STOCK) - 현재 재고
-- ============================================================
INSERT INTO TB_PRODUCT_STOCK (product_id, warehouse_id, current_qty, created_by)
SELECT p.id, w.id, stk.current_qty, 'SYSTEM'
FROM (
    SELECT 'PRD-001' AS prod_code, 'WH-003' AS wh_code, 320 AS current_qty
    UNION ALL SELECT 'PRD-002','WH-003',85
    UNION ALL SELECT 'PRD-003','WH-003',150
    UNION ALL SELECT 'PRD-004','WH-003',150
    UNION ALL SELECT 'PRD-005','WH-003',60
    UNION ALL SELECT 'PRD-006','WH-003',95
    UNION ALL SELECT 'PRD-007','WH-003',40
    UNION ALL SELECT 'PRD-008','WH-003',80
    UNION ALL SELECT 'PRD-009','WH-003',35
    UNION ALL SELECT 'PRD-010','WH-003',60
    UNION ALL SELECT 'PRD-011','WH-003',45
    UNION ALL SELECT 'PRD-012','WH-003',70
    UNION ALL SELECT 'PRD-013','WH-003',120
    UNION ALL SELECT 'PRD-014','WH-003',200
    UNION ALL SELECT 'PRD-015','WH-004',25
    UNION ALL SELECT 'PRD-016','WH-004',18
    UNION ALL SELECT 'PRD-017','WH-003',90
    UNION ALL SELECT 'PRD-018','WH-003',150
    UNION ALL SELECT 'PRD-019','WH-003',65
    UNION ALL SELECT 'PRD-020','WH-003',40
) AS stk
JOIN TB_PRODUCT p ON p.product_code = stk.prod_code
JOIN TB_WAREHOUSE w ON w.warehouse_code = stk.wh_code
ON DUPLICATE KEY UPDATE current_qty = VALUES(current_qty);

-- ============================================================
-- 11. 출하 20건 (TB_SHIPMENT + TB_SHIPMENT_DETAIL)
-- ============================================================
INSERT IGNORE INTO TB_SHIPMENT (shipment_no, order_id, customer_id, shipment_date, status, driver_name, notes, created_by)
SELECT sh.shipment_no, o.id, c.id, sh.shipment_date, sh.status, sh.driver_name, sh.notes, 'SYSTEM'
FROM (
    SELECT 'SHP-20260402-001' AS shipment_no,'ORD-20260401-001' AS order_no,'CUS-001' AS cust_code,'2026-04-02' AS shipment_date,'DELIVERED' AS status,'CJ대한통운' AS driver_name,'CJ2026040200001' AS notes
    UNION ALL SELECT 'SHP-20260406-001','ORD-20260405-001','CUS-002','2026-04-06','DELIVERED','롯데글로벌로지스','LG2026040600001'
    UNION ALL SELECT 'SHP-20260409-001','ORD-20260408-001','CUS-004','2026-04-09','DELIVERED','한진택배','HJ2026040900001'
    UNION ALL SELECT 'SHP-20260411-001','ORD-20260410-001','CUS-005','2026-04-11','DELIVERED','쿠팡로지스틱','CL2026041100001'
    UNION ALL SELECT 'SHP-20260413-001','ORD-20260412-001','CUS-003','2026-04-13','DELIVERED','CJ대한통운','CJ2026041300001'
    UNION ALL SELECT 'SHP-20260416-001','ORD-20260415-001','CUS-006','2026-04-16','DELIVERED','롯데글로벌로지스','LG2026041600001'
    UNION ALL SELECT 'SHP-20260418-001','ORD-20260417-001','CUS-009','2026-04-18','DELIVERED','한진택배','HJ2026041800001'
    UNION ALL SELECT 'SHP-20260421-001','ORD-20260420-001','CUS-012','2026-04-21','DELIVERED','쿠팡로지스틱','CL2026042100001'
    UNION ALL SELECT 'SHP-20260423-001','ORD-20260422-001','CUS-013','2026-04-23','DELIVERED','마켓컬리배송','MK2026042300001'
    UNION ALL SELECT 'SHP-20260426-001','ORD-20260425-001','CUS-001','2026-04-26','DELIVERED','CJ대한통운','CJ2026042600001'
    UNION ALL SELECT 'SHP-20260429-001','ORD-20260428-001','CUS-010','2026-04-29','DELIVERED','CJ대한통운','CJ2026042900001'
    UNION ALL SELECT 'SHP-20260502-001','ORD-20260501-001','CUS-002','2026-05-02','DELIVERED','롯데글로벌로지스','LG2026050200001'
    UNION ALL SELECT 'SHP-20260504-001','ORD-20260503-001','CUS-011','2026-05-04','SHIPPED','CJ대한통운','CJ2026050400001'
    UNION ALL SELECT 'SHP-20260506-001','ORD-20260505-001','CUS-014','2026-05-06','SHIPPED','SSG배송','SG2026050600001'
    UNION ALL SELECT 'SHP-20260507-001','ORD-20260506-001','CUS-003','2026-05-07','SHIPPED','CJ대한통운','CJ2026050700001'
    UNION ALL SELECT 'SHP-20260508-001','ORD-20260507-001','CUS-016','2026-05-08','SHIPPED','한진택배','HJ2026050800001'
    UNION ALL SELECT 'SHP-20260509-001','ORD-20260508-001','CUS-012','2026-05-09','SHIPPED','쿠팡로지스틱','CL2026050900001'
    UNION ALL SELECT 'SHP-20260510-001','ORD-20260509-001','CUS-017','2026-05-10','SHIPPED','한진택배','HJ2026051000001'
    UNION ALL SELECT 'SHP-20260511-001','ORD-20260510-001','CUS-001','2026-05-11','SHIPPED','CJ대한통운','CJ2026051100001'
    UNION ALL SELECT 'SHP-20260512-001','ORD-20260512-001','CUS-019','2026-05-12','SHIPPED','GS25배송','GS2026051200001'
) AS sh
JOIN TB_ORDER o ON o.order_no = sh.order_no
JOIN TB_CUSTOMER c ON c.customer_code = sh.cust_code;

-- SHIPMENT_DETAIL
INSERT IGNORE INTO TB_SHIPMENT_DETAIL (shipment_id, product_id, ship_qty, unit_price, amount, created_by)
SELECT s.id, p.id, 50, p.unit_price, 50 * p.unit_price, 'SYSTEM'
FROM TB_SHIPMENT s
JOIN TB_PRODUCT p ON p.product_code = 'PRD-001'
WHERE s.shipment_no IN (
    'SHP-20260402-001','SHP-20260406-001','SHP-20260409-001','SHP-20260411-001',
    'SHP-20260413-001','SHP-20260416-001','SHP-20260418-001','SHP-20260421-001',
    'SHP-20260423-001','SHP-20260426-001','SHP-20260429-001','SHP-20260502-001',
    'SHP-20260504-001','SHP-20260506-001','SHP-20260507-001','SHP-20260508-001',
    'SHP-20260509-001','SHP-20260510-001','SHP-20260511-001','SHP-20260512-001'
);

-- ============================================================
-- 완료 확인
-- ============================================================
SELECT '=== 시드 데이터 현황 ===' AS info;
SELECT 'TB_USER' AS tbl, COUNT(*) AS cnt FROM TB_USER WHERE is_deleted=0
UNION ALL SELECT 'TB_CUSTOMER', COUNT(*) FROM TB_CUSTOMER WHERE is_deleted=0
UNION ALL SELECT 'TB_PRODUCT', COUNT(*) FROM TB_PRODUCT WHERE is_deleted=0
UNION ALL SELECT 'TB_EQUIPMENT', COUNT(*) FROM TB_EQUIPMENT WHERE is_deleted=0
UNION ALL SELECT 'TB_ORDER', COUNT(*) FROM TB_ORDER WHERE is_deleted=0
UNION ALL SELECT 'TB_ORDER_DETAIL', COUNT(*) FROM TB_ORDER_DETAIL WHERE is_deleted=0
UNION ALL SELECT 'TB_PRODUCTION_PLAN', COUNT(*) FROM TB_PRODUCTION_PLAN WHERE is_deleted=0
UNION ALL SELECT 'TB_WORK_ORDER', COUNT(*) FROM TB_WORK_ORDER WHERE is_deleted=0
UNION ALL SELECT 'TB_MATERIAL_RECEIVE', COUNT(*) FROM TB_MATERIAL_RECEIVE WHERE is_deleted=0
UNION ALL SELECT 'TB_MATERIAL_STOCK', COUNT(*) FROM TB_MATERIAL_STOCK WHERE is_deleted=0
UNION ALL SELECT 'TB_PRODUCT_STOCK', COUNT(*) FROM TB_PRODUCT_STOCK WHERE is_deleted=0
UNION ALL SELECT 'TB_SHIPMENT', COUNT(*) FROM TB_SHIPMENT WHERE is_deleted=0
UNION ALL SELECT 'TB_SHIPMENT_DETAIL', COUNT(*) FROM TB_SHIPMENT_DETAIL WHERE is_deleted=0;
