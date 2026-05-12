-- ============================================================
-- 임진강김치 MES 시스템 - 초기 데이터 (Seed Data)
-- Sprint 1 범위
-- ============================================================

USE mes_db;

-- ============================================================
-- 1. 공통코드 (TB_COMMON_CODE)
-- ============================================================
INSERT INTO TB_COMMON_CODE (group_code, code, code_name, code_name_en, sort_order, created_by) VALUES
-- 제품유형
('PRODUCT_TYPE', 'BAECHU',   '배추김치',     'Baechu Kimchi',   1, 'SYSTEM'),
('PRODUCT_TYPE', 'CHONGGAK', '총각김치',     'Chonggak Kimchi', 2, 'SYSTEM'),
('PRODUCT_TYPE', 'YEOLMU',   '열무김치',     'Yeolmu Kimchi',   3, 'SYSTEM'),
('PRODUCT_TYPE', 'OTHER',    '기타김치',     'Other Kimchi',    4, 'SYSTEM'),
-- 판매채널
('CHANNEL_TYPE', 'HOMESHOPPING', '홈쇼핑',   'Home Shopping',   1, 'SYSTEM'),
('CHANNEL_TYPE', 'GENERAL',      '일반',     'General',         2, 'SYSTEM'),
('CHANNEL_TYPE', 'ONLINE',       '온라인',   'Online',          3, 'SYSTEM'),
('CHANNEL_TYPE', 'BOTH',         '전채널',   'Both',            4, 'SYSTEM'),
-- 수주상태
('ORDER_STATUS', 'DRAFT',         '임시저장',  'Draft',           1, 'SYSTEM'),
('ORDER_STATUS', 'CONFIRMED',     '확정',      'Confirmed',       2, 'SYSTEM'),
('ORDER_STATUS', 'IN_PRODUCTION', '생산중',    'In Production',   3, 'SYSTEM'),
('ORDER_STATUS', 'SHIPPED',       '출하완료',  'Shipped',         4, 'SYSTEM'),
('ORDER_STATUS', 'COMPLETED',     '완료',      'Completed',       5, 'SYSTEM'),
('ORDER_STATUS', 'CANCELLED',     '취소',      'Cancelled',       6, 'SYSTEM'),
-- 공정유형
('PROCESS_TYPE', 'RECEIVE',    '입고',       'Receiving',        1, 'SYSTEM'),
('PROCESS_TYPE', 'PREPROCESS', '전처리',     'Pre-processing',   2, 'SYSTEM'),
('PROCESS_TYPE', 'WASH',       '세척',       'Washing',          3, 'SYSTEM'),
('PROCESS_TYPE', 'PICKLE',     '절임',       'Pickling',         4, 'SYSTEM'),
('PROCESS_TYPE', 'SEASON',     '양념버무림', 'Seasoning',        5, 'SYSTEM'),
('PROCESS_TYPE', 'PACK',       '포장',       'Packing',          6, 'SYSTEM'),
('PROCESS_TYPE', 'SHIP',       '출하',       'Shipping',         7, 'SYSTEM'),
-- 자재유형
('MATERIAL_TYPE', 'RAW',       '원재료',     'Raw Material',     1, 'SYSTEM'),
('MATERIAL_TYPE', 'SUB',       '부재료',     'Sub Material',     2, 'SYSTEM'),
('MATERIAL_TYPE', 'PACKAGING', '포장재',     'Packaging',        3, 'SYSTEM'),
-- 생산계획 상태
('PLAN_STATUS', 'DRAFT',       '초안',       'Draft',            1, 'SYSTEM'),
('PLAN_STATUS', 'CONFIRMED',   '확정',       'Confirmed',        2, 'SYSTEM'),
('PLAN_STATUS', 'IN_PROGRESS', '진행중',     'In Progress',      3, 'SYSTEM'),
('PLAN_STATUS', 'COMPLETED',   '완료',       'Completed',        4, 'SYSTEM'),
('PLAN_STATUS', 'CANCELLED',   '취소',       'Cancelled',        5, 'SYSTEM'),
-- 작업지시 상태
('WO_STATUS', 'ISSUED',      '발행',         'Issued',           1, 'SYSTEM'),
('WO_STATUS', 'IN_PROGRESS', '작업중',       'In Progress',      2, 'SYSTEM'),
('WO_STATUS', 'PAUSED',      '일시정지',     'Paused',           3, 'SYSTEM'),
('WO_STATUS', 'COMPLETED',   '완료',         'Completed',        4, 'SYSTEM'),
('WO_STATUS', 'CANCELLED',   '취소',         'Cancelled',        5, 'SYSTEM'),
-- 거래처유형
('CUSTOMER_TYPE', 'HOMESHOPPING', '홈쇼핑',  'Home Shopping',    1, 'SYSTEM'),
('CUSTOMER_TYPE', 'GENERAL',      '일반거래처', 'General',        2, 'SYSTEM'),
('CUSTOMER_TYPE', 'ONLINE',       '온라인몰', 'Online Mall',      3, 'SYSTEM'),
-- 창고유형
('WAREHOUSE_TYPE', 'MATERIAL', '자재창고',   'Material WH',      1, 'SYSTEM'),
('WAREHOUSE_TYPE', 'PRODUCT',  '제품창고',   'Product WH',       2, 'SYSTEM'),
('WAREHOUSE_TYPE', 'COLD',     '냉장창고',   'Cold Storage',     3, 'SYSTEM'),
('WAREHOUSE_TYPE', 'FREEZE',   '냉동창고',   'Freezer',          4, 'SYSTEM'),
-- 설비상태
('EQUIP_STATUS', 'ACTIVE',      '가동중',    'Active',           1, 'SYSTEM'),
('EQUIP_STATUS', 'MAINTENANCE', '점검중',    'Maintenance',      2, 'SYSTEM'),
('EQUIP_STATUS', 'INACTIVE',    '미가동',    'Inactive',         3, 'SYSTEM');

-- ============================================================
-- 2. 역할 (TB_ROLE)
-- ============================================================
INSERT INTO TB_ROLE (role_code, role_name, description, created_by) VALUES
('ADMIN',     '시스템관리자', '전체 시스템 관리 권한',          'SYSTEM'),
('MANAGER',   '현장관리자',   '생산현장 관리 및 계획 수립 권한', 'SYSTEM'),
('WORKER',    '현장작업자',   '현장 POP 작업 입력 권한',         'SYSTEM'),
('EXECUTIVE', '경영진',       '대시보드 및 통계 조회 전용',      'SYSTEM'),
('SALES',     '영업담당',     '수주 및 출하 관리 권한',          'SYSTEM');

-- ============================================================
-- 3. 사용자 (TB_USER)
-- password_hash: Admin1234! → bcrypt $2b$12$ hash (실 환경에서 교체 필요)
-- ============================================================
INSERT INTO TB_USER (user_id, user_name, password_hash, department, position, is_active, created_by) VALUES
('admin',   '시스템관리자', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '관리팀', '관리자',   1, 'SYSTEM'),
('manager', '김현장',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '팀장',     1, 'SYSTEM'),
('worker1', '박작업',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '반장',     1, 'SYSTEM'),
('worker2', '이작업',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '생산팀', '작업자',   1, 'SYSTEM'),
('sales1',  '정영업',       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhcanFp8.bte3kiZfMxnxu', '영업팀', '영업담당', 1, 'SYSTEM');

-- ============================================================
-- 4. 사용자-역할 매핑 (TB_USER_ROLE)
-- ============================================================
INSERT INTO TB_USER_ROLE (user_id, role_id, granted_by, created_by)
SELECT u.id, r.id, 'SYSTEM', 'SYSTEM'
FROM TB_USER u, TB_ROLE r
WHERE (u.user_id = 'admin'   AND r.role_code = 'ADMIN')
   OR (u.user_id = 'manager' AND r.role_code = 'MANAGER')
   OR (u.user_id = 'worker1' AND r.role_code = 'WORKER')
   OR (u.user_id = 'worker2' AND r.role_code = 'WORKER')
   OR (u.user_id = 'sales1'  AND r.role_code = 'SALES');

-- ============================================================
-- 5. 거래처 (TB_CUSTOMER)
-- ============================================================
INSERT INTO TB_CUSTOMER (customer_code, customer_name, customer_type, business_no, representative, phone, email, address, delivery_address, payment_terms, created_by) VALUES
('CUS-001', 'CJ온스타일',         'HOMESHOPPING', '000-00-00001', '홈쇼핑 MD',  '02-1234-5601', 'md@cjonestyle.com',   '서울시 마포구 상암동 1600',         '서울시 마포구 상암동 1600',         '월정산', 'SYSTEM'),
('CUS-002', 'GS홈쇼핑',           'HOMESHOPPING', '000-00-00002', '홈쇼핑 MD',  '02-1234-5602', 'md@gshomeshopping.com', '서울시 강서구 마곡동 771',          '서울시 강서구 마곡동 771',          '월정산', 'SYSTEM'),
('CUS-003', '현대홈쇼핑',         'HOMESHOPPING', '000-00-00003', '홈쇼핑 MD',  '02-1234-5603', 'md@hyundaihomeshopping.com', '서울시 강서구 화곡동 395',     '서울시 강서구 화곡동 395',          '월정산', 'SYSTEM'),
('CUS-004', '경기마트',           'GENERAL',      '123-45-67890', '이경기',     '031-234-5604', 'order@kgmart.co.kr',  '경기도 수원시 팔달구 인계동 100',   '경기도 수원시 팔달구 인계동 100',   '30일',   'SYSTEM'),
('CUS-005', '임진강김치온라인몰', 'ONLINE',       '987-65-43210', '박온라인',   '031-234-5605', 'shop@imjingang.co.kr','경기도 연천군 임진강로 1',          '경기도 연천군 임진강로 1',          '선불',   'SYSTEM');

-- ============================================================
-- 6. 제품 (TB_PRODUCT)
-- ============================================================
INSERT INTO TB_PRODUCT (product_code, product_name, product_type, capacity, package_unit, channel_type, unit_price, shelf_life_days, created_by) VALUES
('PRD-001', '율무 포기김치 5kg',   'BAECHU',   5.0,  '박스', 'HOMESHOPPING', 35000, 90, 'SYSTEM'),
('PRD-002', '율무 포기김치 10kg',  'BAECHU',  10.0,  '박스', 'GENERAL',      65000, 90, 'SYSTEM'),
('PRD-003', '율무 포기김치 3kg',   'BAECHU',   3.0,  '박스', 'ONLINE',       22000, 90, 'SYSTEM'),
('PRD-004', '율무 총각김치 2kg',   'CHONGGAK', 2.0,  '박스', 'HOMESHOPPING', 18000, 60, 'SYSTEM'),
('PRD-005', '율무 총각김치 5kg',   'CHONGGAK', 5.0,  '박스', 'GENERAL',      38000, 60, 'SYSTEM'),
('PRD-006', '율무 열무김치 2kg',   'YEOLMU',   2.0,  '박스', 'HOMESHOPPING', 16000, 45, 'SYSTEM'),
('PRD-007', '율무 열무김치 5kg',   'YEOLMU',   5.0,  '박스', 'GENERAL',      35000, 45, 'SYSTEM');

-- ============================================================
-- 7. 원부자재 (TB_RAW_MATERIAL)
-- ============================================================
INSERT INTO TB_RAW_MATERIAL (material_code, material_name, material_type, unit, unit_price, supplier, min_stock_qty, created_by) VALUES
-- 원재료
('RAW-001', '배추',         'RAW',       'kg',  800, '연천 농협',     1000, 'SYSTEM'),
('RAW-002', '총각무 (열무)', 'RAW',      'kg',  700, '연천 농협',      500, 'SYSTEM'),
('RAW-003', '열무',         'RAW',       'kg',  650, '연천 농협',      300, 'SYSTEM'),
('RAW-004', '무',           'RAW',       'kg',  600, '연천 농협',      200, 'SYSTEM'),
-- 부재료
('SUB-001', '고춧가루',     'SUB',       'kg', 8000, '청양 고추상회',  100, 'SYSTEM'),
('SUB-002', '마늘',         'SUB',       'kg', 5000, '의성 마늘 농협',  50, 'SYSTEM'),
('SUB-003', '생강',         'SUB',       'kg', 6000, '서산 생강 농협',  30, 'SYSTEM'),
('SUB-004', '소금',         'SUB',       'kg',  500, '신안 천일염',    200, 'SYSTEM'),
('SUB-005', '쪽파',         'SUB',       'kg', 3000, '부여 쪽파 농협',  50, 'SYSTEM'),
('SUB-006', '새우젓',       'SUB',       'kg', 7000, '강경 젓갈',      30, 'SYSTEM'),
('SUB-007', '멸치액젓',     'SUB',       'L',  3500, '통영 액젓',      30, 'SYSTEM'),
('SUB-008', '설탕',         'SUB',       'kg',  900, '삼양사',         50, 'SYSTEM'),
('SUB-009', '율무',         'SUB',       'kg', 4000, '연천 율무 농협', 100, 'SYSTEM'),
-- 포장재
('PKG-001', '아이스박스 (대, 10kg용)', 'PACKAGING', '개', 2500, '포장재 공급사',  500, 'SYSTEM'),
('PKG-002', '아이스박스 (중, 5kg용)',  'PACKAGING', '개', 1800, '포장재 공급사',  500, 'SYSTEM'),
('PKG-003', '아이스박스 (소, 2-3kg용)','PACKAGING', '개', 1200, '포장재 공급사',  300, 'SYSTEM'),
('PKG-004', 'PP봉투 (대)',             'PACKAGING', '개',  150, '포장재 공급사', 2000, 'SYSTEM'),
('PKG-005', 'PP봉투 (소)',             'PACKAGING', '개',  100, '포장재 공급사', 2000, 'SYSTEM'),
('PKG-006', '보냉팩',                  'PACKAGING', '개',  300, '보냉재 공급사', 1000, 'SYSTEM'),
('PKG-007', '라벨 스티커',             'PACKAGING', '장',   50, '인쇄소',        5000, 'SYSTEM');

-- ============================================================
-- 8. BOM - 배추김치 100kg 기준 레시피 (TB_BOM)
-- ============================================================
INSERT INTO TB_BOM (bom_code, product_id, bom_name, total_qty, version, effective_date, description, created_by)
SELECT 'BOM-001', id, '율무 포기김치 100kg 레시피', 100.00, '1.0', CURDATE(),
       '율무 포기김치 100kg 기준 원재료 소요량', 'SYSTEM'
FROM TB_PRODUCT WHERE product_code = 'PRD-001';

INSERT INTO TB_BOM (bom_code, product_id, bom_name, total_qty, version, effective_date, description, created_by)
SELECT 'BOM-002', id, '율무 총각김치 100kg 레시피', 100.00, '1.0', CURDATE(),
       '율무 총각김치 100kg 기준 원재료 소요량', 'SYSTEM'
FROM TB_PRODUCT WHERE product_code = 'PRD-004';

INSERT INTO TB_BOM (bom_code, product_id, bom_name, total_qty, version, effective_date, description, created_by)
SELECT 'BOM-003', id, '율무 열무김치 100kg 레시피', 100.00, '1.0', CURDATE(),
       '율무 열무김치 100kg 기준 원재료 소요량', 'SYSTEM'
FROM TB_PRODUCT WHERE product_code = 'PRD-006';

-- ============================================================
-- 9. BOM 명세 - 배추김치 BOM-001 (TB_BOM_DETAIL)
-- ============================================================
INSERT INTO TB_BOM_DETAIL (bom_id, raw_material_id, required_qty, loss_rate, sequence, notes, created_by)
SELECT b.id, m.id, req.required_qty, req.loss_rate, req.seq, req.notes, 'SYSTEM'
FROM TB_BOM b
JOIN (
    SELECT 'RAW-001' AS mat_code,  70.0000 AS required_qty, 10.00 AS loss_rate, 1 AS seq, '절임 후 손실 포함' AS notes
    UNION ALL SELECT 'SUB-009',     5.0000, 0.00, 2, '율무 (물에 불려 사용)'
    UNION ALL SELECT 'SUB-001',     4.5000, 0.00, 3, '고춧가루'
    UNION ALL SELECT 'SUB-002',     3.0000, 2.00, 4, '마늘 (다진 것 기준)'
    UNION ALL SELECT 'SUB-003',     1.0000, 3.00, 5, '생강 (다진 것 기준)'
    UNION ALL SELECT 'SUB-004',     7.0000, 0.00, 6, '절임 소금 포함'
    UNION ALL SELECT 'SUB-005',     3.0000, 5.00, 7, '쪽파'
    UNION ALL SELECT 'RAW-004',     5.0000, 3.00, 8, '무채'
    UNION ALL SELECT 'SUB-006',     1.5000, 0.00, 9, '새우젓'
    UNION ALL SELECT 'SUB-007',     1.0000, 0.00, 10, '멸치액젓'
    UNION ALL SELECT 'SUB-008',     0.5000, 0.00, 11, '설탕'
) AS req ON req.mat_code = (SELECT material_code FROM TB_RAW_MATERIAL WHERE id = m.id)
JOIN TB_RAW_MATERIAL m ON m.material_code = req.mat_code
WHERE b.bom_code = 'BOM-001';

-- ============================================================
-- 10. BOM 명세 - 총각김치 BOM-002 (TB_BOM_DETAIL)
-- ============================================================
INSERT INTO TB_BOM_DETAIL (bom_id, raw_material_id, required_qty, loss_rate, sequence, notes, created_by)
SELECT b.id, m.id, req.required_qty, req.loss_rate, req.seq, req.notes, 'SYSTEM'
FROM TB_BOM b
JOIN (
    SELECT 'RAW-002' AS mat_code,  75.0000 AS required_qty, 8.00 AS loss_rate, 1 AS seq, '총각무 절임 후 손실 포함' AS notes
    UNION ALL SELECT 'SUB-009',     5.0000, 0.00, 2, '율무'
    UNION ALL SELECT 'SUB-001',     5.0000, 0.00, 3, '고춧가루'
    UNION ALL SELECT 'SUB-002',     3.5000, 2.00, 4, '마늘'
    UNION ALL SELECT 'SUB-003',     1.0000, 3.00, 5, '생강'
    UNION ALL SELECT 'SUB-004',     7.5000, 0.00, 6, '소금 (절임 포함)'
    UNION ALL SELECT 'SUB-005',     2.0000, 5.00, 7, '쪽파'
    UNION ALL SELECT 'SUB-006',     1.0000, 0.00, 8, '새우젓'
    UNION ALL SELECT 'SUB-007',     0.5000, 0.00, 9, '멸치액젓'
) AS req ON req.mat_code = (SELECT material_code FROM TB_RAW_MATERIAL WHERE id = m.id)
JOIN TB_RAW_MATERIAL m ON m.material_code = req.mat_code
WHERE b.bom_code = 'BOM-002';

-- ============================================================
-- 11. 공정 기준 (TB_PROCESS)
-- ============================================================
INSERT INTO TB_PROCESS (process_code, process_name, process_type, sequence, description, created_by) VALUES
('PRC-001', '원재료 입고',   'RECEIVE',    1, '원재료 입고 및 입고검사',            'SYSTEM'),
('PRC-002', '전처리',        'PREPROCESS', 2, '배추/총각무 등 원재료 다듬기',       'SYSTEM'),
('PRC-003', '세척',          'WASH',       3, '세척 및 이물 제거',                  'SYSTEM'),
('PRC-004', '절임',          'PICKLE',     4, '소금절임 (배추: 6-8시간)',           'SYSTEM'),
('PRC-005', '양념 준비',     'PREPROCESS', 5, '고춧가루, 마늘, 생강 등 양념 계량',  'SYSTEM'),
('PRC-006', '양념버무림',    'SEASON',     6, '절임 채소와 양념 혼합',              'SYSTEM'),
('PRC-007', '포장',          'PACK',       7, '계량 및 포장',                       'SYSTEM'),
('PRC-008', '출하',          'SHIP',       8, '출하 검수 및 상차',                  'SYSTEM');

-- ============================================================
-- 12. CCP 기준값 (TB_CCP_STANDARD) - HACCP
-- ============================================================
INSERT INTO TB_CCP_STANDARD (process_id, ccp_code, ccp_name, control_item, min_value, max_value, target_value, unit, action_limit, monitoring_freq, created_by)
SELECT p.id, c.ccp_code, c.ccp_name, c.control_item,
       c.min_value, c.max_value, c.target_value, c.unit,
       c.action_limit, c.monitoring_freq, 'SYSTEM'
FROM TB_PROCESS p
JOIN (
    SELECT 'PRC-004' AS proc_code, 'CCP-001' AS ccp_code, '절임 염도 관리' AS ccp_name,
           '염도(%)' AS control_item, 8.00 AS min_value, 12.00 AS max_value, 10.00 AS target_value,
           '%' AS unit, '염도 기준 이탈 시 소금 추가 또는 세척 후 재절임' AS action_limit,
           '2시간마다 측정' AS monitoring_freq
    UNION ALL
    SELECT 'PRC-007', 'CCP-002', '포장 후 냉장보관 온도', '보관온도(°C)',
           0.00, 5.00, 3.00, '°C', '기준 초과 시 냉장 장비 점검 및 설정 온도 조정', '1시간마다 확인'
    UNION ALL
    SELECT 'PRC-006', 'CCP-003', '양념버무림 pH 관리', 'pH',
           3.50, 5.00, 4.20, 'pH', 'pH 기준 이탈 시 산도 조정 (구연산 추가 또는 물 추가)', '배치별 측정'
    UNION ALL
    SELECT 'PRC-003', 'CCP-004', '세척수 관리', '대장균군',
           NULL, 0.00, 0.00, 'CFU/mL', '기준 초과 시 세척수 교체 및 설비 소독', '일 1회 측정'
) AS c ON c.proc_code = p.process_code;

-- ============================================================
-- 13. 창고 (TB_WAREHOUSE)
-- ============================================================
INSERT INTO TB_WAREHOUSE (warehouse_code, warehouse_name, warehouse_type, location, capacity, temp_control, min_temp, max_temp, created_by) VALUES
('WH-001', '원재료 창고',     'MATERIAL', '제1공장 1층 A동', 5000, 0,    NULL,  NULL, 'SYSTEM'),
('WH-002', '냉장 원재료 창고', 'COLD',    '제1공장 1층 B동', 2000, 1,     0.0,   5.0, 'SYSTEM'),
('WH-003', '완제품 냉장창고', 'COLD',    '제1공장 2층',     3000, 1,     0.0,   5.0, 'SYSTEM'),
('WH-004', '완제품 냉동창고', 'FREEZE',  '제2공장 1층',     2000, 1,   -20.0, -15.0, 'SYSTEM'),
('WH-005', '포장재 창고',     'MATERIAL', '제1공장 1층 C동', 1000, 0,    NULL,  NULL, 'SYSTEM');

-- ============================================================
-- 14. 설비/탱크 (TB_EQUIPMENT)
-- ============================================================
INSERT INTO TB_EQUIPMENT (equipment_code, equipment_name, equipment_type, process_id, capacity, location, status, created_by)
SELECT eq.equipment_code, eq.equipment_name, eq.equipment_type, p.id, eq.capacity, eq.location, 'ACTIVE', 'SYSTEM'
FROM (
    SELECT 'EQP-001' AS equipment_code, '절임탱크 1호' AS equipment_name, 'TANK' AS equipment_type,
           'PRC-004' AS proc_code, 2000.00 AS capacity, '절임실 A구역' AS location
    UNION ALL
    SELECT 'EQP-002', '절임탱크 2호', 'TANK', 'PRC-004', 2000.00, '절임실 A구역'
    UNION ALL
    SELECT 'EQP-003', '절임탱크 3호', 'TANK', 'PRC-004', 1000.00, '절임실 B구역'
    UNION ALL
    SELECT 'EQP-004', '세척라인 1호', 'LINE', 'PRC-003', 500.00, '세척실'
    UNION ALL
    SELECT 'EQP-005', '양념버무림기 1호', 'MACHINE', 'PRC-006', 300.00, '양념실 A구역'
    UNION ALL
    SELECT 'EQP-006', '양념버무림기 2호', 'MACHINE', 'PRC-006', 300.00, '양념실 A구역'
    UNION ALL
    SELECT 'EQP-007', '자동포장기 1호', 'MACHINE', 'PRC-007', 200.00, '포장실'
    UNION ALL
    SELECT 'EQP-008', '자동포장기 2호', 'MACHINE', 'PRC-007', 200.00, '포장실'
) AS eq
JOIN TB_PROCESS p ON p.process_code = eq.proc_code;

-- ============================================================
-- 확인용 조회 (주석 처리 - 필요 시 활성화)
-- ============================================================
-- SELECT '=== 공통코드 현황 ===' AS info;
-- SELECT group_code, COUNT(*) AS cnt FROM TB_COMMON_CODE GROUP BY group_code;
-- SELECT '=== 사용자 현황 ===' AS info;
-- SELECT user_id, user_name, department, position FROM TB_USER;
-- SELECT '=== 제품 현황 ===' AS info;
-- SELECT product_code, product_name, capacity, unit_price FROM TB_PRODUCT;
-- SELECT '=== BOM 현황 ===' AS info;
-- SELECT b.bom_code, p.product_name, b.total_qty, COUNT(d.id) AS detail_cnt
-- FROM TB_BOM b JOIN TB_PRODUCT p ON p.id = b.product_id
-- LEFT JOIN TB_BOM_DETAIL d ON d.bom_id = b.id
-- GROUP BY b.id;
