-- =============================================================================
-- 14_schema_packaging.sql
-- 포장출하 공정 테이블 생성 및 시드 데이터
-- Sprint 8 - 포장출하(Packaging) 공정 배치 관리
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TB_PACKAGING_BATCH : 포장출하 배치
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TB_PACKAGING_BATCH (
    id              BIGINT          NOT NULL AUTO_INCREMENT     COMMENT '기본키',
    batch_no        VARCHAR(30)     NOT NULL                    COMMENT '배치번호 PKG-YYYYMMDD-NNN',
    product_code    VARCHAR(20)     NOT NULL                    COMMENT '제품코드',
    product_name    VARCHAR(100)    NOT NULL                    COMMENT '제품명',
    package_type    VARCHAR(20)     NOT NULL                    COMMENT 'bag/container/commercial',
    planned_qty     INT             NOT NULL                    COMMENT '계획 수량',
    completed_qty   INT             NOT NULL DEFAULT 0          COMMENT '완료 수량',
    defect_qty      INT             NOT NULL DEFAULT 0          COMMENT '불량 수량',
    defect_rate     DECIMAL(5,2)    NOT NULL DEFAULT 0.00       COMMENT '불량률 %',
    ready_to_ship   TINYINT(1)      NOT NULL DEFAULT 0          COMMENT '출하준비 여부',
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
    UNIQUE KEY uq_packaging_batch_no (batch_no),
    KEY idx_packaging_status (status),
    KEY idx_packaging_product_code (product_code),
    KEY idx_packaging_package_type (package_type),
    KEY idx_packaging_created_at (created_at),
    KEY idx_packaging_ready_to_ship (ready_to_ship)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='포장출하 배치';


-- -----------------------------------------------------------------------------
-- 시드 데이터 (5건)
-- -----------------------------------------------------------------------------
INSERT INTO TB_PACKAGING_BATCH
    (batch_no, product_code, product_name, package_type, planned_qty,
     completed_qty, defect_qty, defect_rate, ready_to_ship,
     status, worker_name, start_time, end_time, notes, created_by, updated_by)
VALUES
    ('PKG-20260515-001', 'KIM-001', '임진강 포기김치 1kg',  'bag',        500,
     498, 3, 0.60, 1,
     'COMPLETED', '김지수', '2026-05-15 11:00:00', '2026-05-15 13:00:00',
     '출하준비 완료', 'admin', 'admin'),

    ('PKG-20260515-002', 'KIM-002', '임진강 깍두기 500g',  'container',  300,
     295, 5, 1.69, 0,
     'COMPLETED', '최성훈', '2026-05-15 12:00:00', '2026-05-15 14:00:00',
     '불량 일부 발생, 검토 중', 'admin', 'admin'),

    ('PKG-20260515-003', 'KIM-003', '임진강 총각김치 1kg', 'bag',        200,
     0, 0, 0.00, 0,
     'IN_PROGRESS', '김지수', '2026-05-15 14:30:00', NULL,
     '작업 진행 중', 'admin', 'admin'),

    ('PKG-20260515-004', 'KIM-004', '임진강 열무김치 500g', 'commercial', 150,
     0, 0, 0.00, 0,
     'WAITING', '최성훈', NULL, NULL,
     '오후 작업 예정', 'admin', 'admin'),

    ('PKG-20260515-005', 'KIM-005', '임진강 파김치 300g',  'bag',        100,
     0, 0, 0.00, 0,
     'ON_HOLD', '김지수', '2026-05-15 13:30:00', NULL,
     '포장재 재고 부족 - 입고 대기', 'admin', 'admin');
