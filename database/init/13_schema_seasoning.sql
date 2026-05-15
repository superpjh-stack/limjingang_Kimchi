-- =============================================================================
-- 13_schema_seasoning.sql
-- 양념버무림 공정 테이블 생성 및 시드 데이터
-- Sprint 8 - 양념버무림(Seasoning) 공정 배치 관리
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TB_SEASONING_BATCH : 양념버무림 배치
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_SEASONING_BATCH (
    id              BIGINT          NOT NULL AUTO_INCREMENT     COMMENT '기본키',
    batch_no        VARCHAR(30)     NOT NULL                    COMMENT '배치번호 MIX-YYYYMMDD-NNN',
    product_code    VARCHAR(20)     NOT NULL                    COMMENT '제품코드',
    product_name    VARCHAR(100)    NOT NULL                    COMMENT '제품명',
    planned_qty     DECIMAL(10,2)   NOT NULL                    COMMENT '계획량 kg',
    actual_qty      DECIMAL(10,2)   NULL                        COMMENT '실적량 kg',
    recipe_code     VARCHAR(30)     NULL                        COMMENT '레시피 코드',
    recipe_compliance DECIMAL(5,2)  NULL                        COMMENT '레시피 준수율 %',
    room_temp       DECIMAL(5,1)    NULL                        COMMENT '버무림실 온도 (CCP3)',
    ccp3_pass       TINYINT(1)      NOT NULL DEFAULT 1          COMMENT 'CCP3 합격여부',
    status          VARCHAR(20)     NOT NULL DEFAULT 'WAITING'  COMMENT 'WAITING/IN_PROGRESS/COMPLETED/ON_HOLD',
    worker_name     VARCHAR(50)     NULL                        COMMENT '작업자명',
    start_time      DATETIME        NULL                        COMMENT '작업시작 시각',
    end_time        DATETIME        NULL                        COMMENT '작업종료 시각',
    notes           TEXT            NULL                        COMMENT '비고',
    created_by      VARCHAR(50)     NOT NULL DEFAULT 'system'   COMMENT '생성자',
    updated_by      VARCHAR(50)     NOT NULL DEFAULT 'system'   COMMENT '수정자',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    is_deleted      TINYINT(1)      NOT NULL DEFAULT 0          COMMENT '소프트 삭제',
    PRIMARY KEY (id),
    UNIQUE KEY uq_seasoning_batch_no (batch_no),
    KEY idx_seasoning_status (status),
    KEY idx_seasoning_product_code (product_code),
    KEY idx_seasoning_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='양념버무림 배치';


-- -----------------------------------------------------------------------------
-- 시드 데이터 (5건)
-- -----------------------------------------------------------------------------
INSERT INTO TB_SEASONING_BATCH
    (batch_no, product_code, product_name, planned_qty, actual_qty,
     recipe_code, recipe_compliance, room_temp, ccp3_pass,
     status, worker_name, start_time, end_time, notes, created_by, updated_by)
VALUES
    ('MIX-20260515-001', 'KIM-001', '임진강 포기김치 1kg',  500.00, 498.50,
     'RCP-KIM-001', 98.50, 18.5, 1,
     'COMPLETED', '박현수', '2026-05-15 08:00:00', '2026-05-15 10:30:00',
     '레시피 기준 준수 우수', 'admin', 'admin'),

    ('MIX-20260515-002', 'KIM-002', '임진강 깍두기 500g',  300.00, 297.00,
     'RCP-KIM-002', 95.20, 17.8, 1,
     'COMPLETED', '이미영', '2026-05-15 09:00:00', '2026-05-15 11:00:00',
     NULL, 'admin', 'admin'),

    ('MIX-20260515-003', 'KIM-003', '임진강 총각김치 1kg', 200.00, NULL,
     'RCP-KIM-003', NULL, 19.2, 1,
     'IN_PROGRESS', '정민준', '2026-05-15 13:00:00', NULL,
     '작업 중', 'admin', 'admin'),

    ('MIX-20260515-004', 'KIM-004', '임진강 열무김치 500g', 150.00, NULL,
     'RCP-KIM-004', NULL, NULL, 1,
     'WAITING', '박현수', NULL, NULL,
     '오후 작업 예정', 'admin', 'admin'),

    ('MIX-20260515-005', 'KIM-005', '임진강 파김치 300g',  100.00, NULL,
     'RCP-KIM-005', NULL, NULL, 1,
     'ON_HOLD', '이미영', '2026-05-15 11:30:00', NULL,
     '원재료 상태 확인 필요 - 보류', 'admin', 'admin');
