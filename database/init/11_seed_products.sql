-- ============================================================
-- 임진강김치 MES - 제품품목 추가 시드 데이터 (PRD-008 ~ PRD-020)
-- 기존 7개(PRD-001~007) + 13개 추가 = 총 20개
-- ============================================================

USE mes_db;

INSERT INTO TB_PRODUCT (product_code, product_name, product_type, capacity, package_unit, channel_type, unit_price, shelf_life_days, created_by) VALUES
-- 포기김치 소포장/업소용
('PRD-008', '율무 포기김치 1kg',    'BAECHU',   1.0,  '봉지', 'ONLINE',       8000,  90, 'SYSTEM'),
('PRD-009', '율무 포기김치 20kg',   'BAECHU',  20.0,  '박스', 'GENERAL',     120000, 90, 'SYSTEM'),
-- 총각김치 소포장/업소용
('PRD-010', '율무 총각김치 1kg',    'CHONGGAK', 1.0,  '봉지', 'ONLINE',       9000,  60, 'SYSTEM'),
('PRD-011', '율무 총각김치 10kg',   'CHONGGAK',10.0,  '박스', 'GENERAL',      72000, 60, 'SYSTEM'),
-- 열무김치 소포장/업소용
('PRD-012', '율무 열무김치 1kg',    'YEOLMU',   1.0,  '봉지', 'ONLINE',       7000,  45, 'SYSTEM'),
('PRD-013', '율무 열무김치 10kg',   'YEOLMU',  10.0,  '박스', 'GENERAL',      65000, 45, 'SYSTEM'),
-- 깍두기
('PRD-014', '율무 깍두기 2kg',      'OTHER',    2.0,  '박스', 'HOMESHOPPING', 17000, 60, 'SYSTEM'),
('PRD-015', '율무 깍두기 5kg',      'OTHER',    5.0,  '박스', 'GENERAL',      36000, 60, 'SYSTEM'),
('PRD-016', '율무 깍두기 1kg',      'OTHER',    1.0,  '봉지', 'ONLINE',        9000, 60, 'SYSTEM'),
-- 갓김치
('PRD-017', '율무 갓김치 2kg',      'OTHER',    2.0,  '박스', 'HOMESHOPPING', 19000, 60, 'SYSTEM'),
('PRD-018', '율무 갓김치 5kg',      'OTHER',    5.0,  '박스', 'GENERAL',      40000, 60, 'SYSTEM'),
-- 선물세트/특선
('PRD-019', '율무 김치 명절 3종 세트', 'BAECHU', 6.0, '세트', 'HOMESHOPPING', 52000, 90, 'SYSTEM'),
('PRD-020', '율무 오이소박이 1kg',  'OTHER',    1.0,  '봉지', 'ONLINE',        8500, 30, 'SYSTEM');
